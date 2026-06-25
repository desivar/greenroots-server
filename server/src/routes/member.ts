import { Router, Response } from 'express';
import { protect, AuthRequest, leaderOrAbove, ceoOnly } from '../middleware/auth';
import User from '../models/User';
import OrgUnit from '../models/OrgUnit';
import Message from '../models/Message';
import { JournalEntry } from '../models/JournalEntry';
import { Goal }         from '../models/Goal';
import { Budget }       from '../models/Budget';
import { analyzeMissionData } from '../services/aiService';

const router = Router();
router.use(protect);

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select('-password');
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    const country = user.country;

    const [topZones, topDistricts, topTeams, ceoMessage, impactAgg] = await Promise.all([
      OrgUnit.find({ type: 'zone', country }).sort({ monthlyScore: -1 }).limit(5)
             .select('name monthlyScore gardensStarted familiesTrained'),
      OrgUnit.find({ type: 'district', country }).sort({ monthlyScore: -1 }).limit(5)
             .select('name monthlyScore gardensStarted parentId'),
      OrgUnit.find({ type: 'team', country, isWomensTeam: false }).sort({ monthlyScore: -1 }).limit(5)
             .select('name monthlyScore gardensStarted leaders')
             .populate('leaders', 'firstName lastName'),
      Message.findOne({ category: 'ceo_letter', country }).sort({ createdAt: -1 })
             .populate('fromUser', 'firstName lastName profilePhoto'),
      OrgUnit.aggregate([
        { $match: { type: 'zone', country } },
        { $group: { _id: null, totalGardens: { $sum: '$gardensStarted' }, totalFamilies: { $sum: '$familiesTrained' }, totalCommunities: { $sum: '$communityCount' } } },
      ]),
    ]);

    const now      = Date.now();
    const start    = user.startDate ? user.startDate.getTime() : now;
    const end      = user.endDate   ? user.endDate.getTime()   : now;
    const elapsed  = Math.max(0, now - start);
    const total    = Math.max(1, end - start);
    const monthsServed    = Math.floor(elapsed / (30.44 * 24 * 3600 * 1000));
    const monthsRemaining = Math.max(0, user.termMonths - monthsServed);
    const percentComplete = Math.min(100, Math.round((elapsed / total) * 100));

    res.json({
      success: true,
      data: {
        user,
        ceoMessage,
        topZones, topDistricts, topTeams,
        timeline: { percentComplete, monthsServed, monthsRemaining, startDate: user.startDate, endDate: user.endDate },
        impact: impactAgg[0] ?? { totalGardens: 0, totalFamilies: 0, totalCommunities: 0 },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Dashboard load failed' });
  }
});

// ── CEO AI ANALYSIS ───────────────────────────────────────────────────────────
router.get('/dashboard/ceo-analysis', ceoOnly, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const country = req.user!.country;
    const lang    = (req.query.lang as 'en' | 'es') || 'en';
    const now     = new Date();
    const soon    = new Date(now.getTime() + 60 * 24 * 3600 * 1000);
    const rotCut  = new Date(now.getTime() - 21 * 24 * 3600 * 1000);

    const [topZones, staffEndingSoon, staffStartingSoon, pendingRotations] = await Promise.all([
      OrgUnit.find({ type: 'zone', country }).sort({ monthlyScore: -1 }).limit(5).select('name monthlyScore gardensStarted'),
      User.find({ country, endDate: { $gte: now, $lte: soon }, isActive: true }).select('firstName lastName endDate role'),
      User.find({ country, startDate: { $gte: now, $lte: soon }, isApproved: true }).select('firstName lastName startDate'),
      User.find({ country, isActive: true, $or: [{ lastRotationDate: { $lte: rotCut } }, { lastRotationDate: { $exists: false } }] }).select('firstName lastName skills zone'),
    ]);

    const analysis = await analyzeMissionData({
      country,
      topZones: topZones.map(z => ({ name: z.name, score: z.monthlyScore, gardens: z.gardensStarted })),
      staffEndingSoon: staffEndingSoon.map(u => ({ name: `${u.firstName} ${u.lastName}`, endDate: u.endDate?.toISOString().slice(0,10) ?? '', role: u.role })),
      staffStartingSoon: staffStartingSoon.map(u => ({ name: `${u.firstName} ${u.lastName}`, startDate: u.startDate?.toISOString().slice(0,10) ?? '' })),
      pendingRotations: pendingRotations.map(u => ({ name: `${u.firstName} ${u.lastName}`, skills: u.skills, currentZone: String(u.zone ?? 'unassigned') })),
      lang,
    });

    res.json({ success: true, analysis });
  } catch {
    res.status(500).json({ success: false, message: 'CEO analysis failed' });
  }
});

// ── COMPANIONS ────────────────────────────────────────────────────────────────
router.get('/companions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = await User.findById(req.user!._id).select('zone district team country');
    if (!me) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    const companions = await User.find({
      country:  me.country,
      district: me.district,
      isActive: true,
      _id:      { $ne: me._id },
    }).select('firstName lastName role gender zone district team profilePhoto skills startDate endDate');

    res.json({ success: true, data: companions });
  } catch {
    res.status(500).json({ success: false, message: 'Could not fetch companions' });
  }
});

// ── PROFILE ───────────────────────────────────────────────────────────────────
router.get('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user!._id).select('-password');
  res.json({ success: true, data: user });
});

router.put('/profile', async (req: AuthRequest, res: Response): Promise<void> => {
  const allowed = ['firstName','lastName','phone','languages','profilePhoto','motivation','otherSkills'];
  const updates: Record<string, unknown> = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user!._id, updates, { new: true }).select('-password');
  res.json({ success: true, data: user });
});

// ── JOURNAL ───────────────────────────────────────────────────────────────────
router.get('/journal', async (req: AuthRequest, res: Response): Promise<void> => {
  const entries = await JournalEntry.find({ userId: req.user!._id }).sort({ date: -1 }).limit(50);
  res.json({ success: true, data: entries });
});

router.post('/journal', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, title, body, photos } = req.body;
    const entry = await JournalEntry.create({ userId: req.user!._id, date, title, body, photos: photos ?? [] });
    res.status(201).json({ success: true, data: entry });
  } catch { res.status(500).json({ success: false, message: 'Could not save entry' }); }
});

router.put('/journal/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const entry = await JournalEntry.findOneAndUpdate({ _id: req.params.id, userId: req.user!._id }, req.body, { new: true });
  res.json({ success: true, data: entry });
});

router.delete('/journal/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  await JournalEntry.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
  res.json({ success: true });
});

// ── GOALS ─────────────────────────────────────────────────────────────────────
router.get('/goals', async (req: AuthRequest, res: Response): Promise<void> => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const goals = await Goal.find({ userId: req.user!._id, month }).sort({ createdAt: 1 });
  res.json({ success: true, data: goals });
});

router.post('/goals', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const goal = await Goal.create({
      userId: req.user!._id,
      month:  req.body.month || new Date().toISOString().slice(0, 7),
      title:  req.body.title,
      targetDate: req.body.targetDate,
    });
    res.status(201).json({ success: true, data: goal });
  } catch { res.status(500).json({ success: false, message: 'Could not save goal' }); }
});

router.patch('/goals/:id/toggle', async (req: AuthRequest, res: Response): Promise<void> => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user!._id });
  if (!goal) { res.status(404).json({ success: false, message: 'Goal not found' }); return; }
  goal.completed   = !goal.completed;
  goal.completedAt = goal.completed ? new Date() : undefined;
  await goal.save();
  res.json({ success: true, data: goal });
});

router.delete('/goals/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
  res.json({ success: true });
});

// ── BUDGET ────────────────────────────────────────────────────────────────────
router.get('/budget', async (req: AuthRequest, res: Response): Promise<void> => {
  const month  = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const budget = await Budget.findOne({ userId: req.user!._id, month });
  res.json({ success: true, data: budget });
});

router.get('/budget/history', async (req: AuthRequest, res: Response): Promise<void> => {
  const budgets = await Budget.find({ userId: req.user!._id }).sort({ month: -1 });
  res.json({ success: true, data: budgets });
});

router.post('/budget/expense', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const { description, amount, category } = req.body;
    let budget = await Budget.findOne({ userId: req.user!._id, month });
    if (!budget) budget = new Budget({ userId: req.user!._id, month, allowance: 320, expenses: [] });
    budget.expenses.push({ description, amount: Number(amount), category, date: new Date() });
    await budget.save();
    res.json({ success: true, data: budget });
  } catch { res.status(500).json({ success: false, message: 'Could not add expense' }); }
});

router.delete('/budget/expense/:idx', async (req: AuthRequest, res: Response): Promise<void> => {
  const month  = new Date().toISOString().slice(0, 7);
  const budget = await Budget.findOne({ userId: req.user!._id, month });
  if (!budget) { res.status(404).json({ success: false, message: 'Budget not found' }); return; }
  budget.expenses.splice(Number(req.params.idx), 1);
  await budget.save();
  res.json({ success: true, data: budget });
});

export default router;
