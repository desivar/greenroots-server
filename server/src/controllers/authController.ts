import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import { sendPasswordResetEmail } from '../services/emailService';

const signAccess = (id: string, role: string) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as string,
  });

const signRefresh = (id: string) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as string,
  });

const sendTokens = (user: IUser, status: number, res: Response) => {
  const id = (user._id as { toString(): string }).toString();
  res.status(status).json({
    success: true,
    access:  signAccess(id, user.role),
    refresh: signRefresh(id),
    user: {
      _id:          id,
      firstName:    user.firstName,
      lastName:     user.lastName,
      email:        user.email,
      role:         user.role,
      gender:       user.gender,
      country:      user.country,
      isApproved:   user.isApproved,
      profilePhoto: user.profilePhoto,
    },
  });
};

// ── REGISTER ──────────────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      firstName, lastName, email, password,
      gender, dateOfBirth, phone,
      originCountry, country,
      maritalStatus, partner,
      languages, workType, termMonths, startDate,
      education, workExperience, skills, otherSkills, motivation,
    } = req.body;

    // Age check 18–26
    const age = Math.floor((Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000));
    if (age < 18 || age > 26) {
      res.status(400).json({ success: false, message: 'Applicant must be 18–26 years old' });
      return;
    }

    // Couples → volunteer only
    if (maritalStatus === 'couple' && workType !== 'volunteer') {
      res.status(400).json({ success: false, message: 'Married couples may only apply as volunteers' });
      return;
    }

    // Term months: auto-assign for normal job
    let term = Number(termMonths);
    if (workType === 'normal') term = gender === 'female' ? 18 : 24;

    // Compute end date
    const start  = new Date(startDate);
    const end    = new Date(start);
    end.setMonth(end.getMonth() + term);

    if (await User.findOne({ email })) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    await User.create({
      firstName, lastName, email, password,
      gender, dateOfBirth: new Date(dateOfBirth), phone,
      originCountry, country,
      role: gender === 'female' ? 'member_f' : 'member_m',
      maritalStatus, partner,
      languages: languages || [],
      workType, termMonths: term,
      startDate: start, endDate: end,
      education: education || { level: '' },
      workExperience: workExperience || '',
      skills: skills || [],
      otherSkills, motivation,
      isApproved: false,
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted. Leadership will review within 5–7 business days.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    res.status(500).json({ success: false, message: msg });
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password required' });
      return;
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Account deactivated' });
      return;
    }
    sendTokens(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh } = req.body;
    if (!refresh) {
      res.status(400).json({ success: false, message: 'Refresh token required' });
      return;
    }
    const decoded = jwt.verify(refresh, process.env.JWT_REFRESH_SECRET!) as { id: string };
    const user    = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
      return;
    }
    const access = signAccess((user._id as { toString(): string }).toString(), user.role);
    res.json({ success: true, access });
  } catch {
    res.status(401).json({ success: false, message: 'Refresh token expired or invalid' });
  }
};

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const generic = 'If that email exists, a reset link has been sent.';
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) { res.json({ success: true, message: generic }); return; }

    const raw  = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');

    user.passwordResetToken   = hash;
    user.passwordResetExpires = new Date(Date.now() + Number(process.env.RESET_TOKEN_EXPIRES || 3600000));
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${raw}`;
    await sendPasswordResetEmail(user.email, user.firstName, resetUrl);

    res.json({ success: true, message: generic });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not send reset email' });
  }
};

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      return;
    }
    const hash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      passwordResetToken:   hash,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      res.status(400).json({ success: false, message: 'Reset link is invalid or has expired' });
      return;
    }
    user.password             = password;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    sendTokens(user, 200, res);
  } catch {
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
};

// ── GET ME ────────────────────────────────────────────────────────────────────
export const getMe = async (req: Request & { user?: { _id: string } }, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select('-password');
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, message: 'Could not fetch profile' });
  }
};
