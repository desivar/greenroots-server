import { Router, Response } from 'express';
import { protect, secretaryOrAbove, adminPanel, isFinances, isImmigration, isMaterials, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { Housing } from '../models/Housing';
import { Flight }  from '../models/Flight';
import { Budget }  from '../models/Budget';
import OrgUnit from '../models/OrgUnit';

const router = Router();
router.use(protect, secretaryOrAbove);

// ── USER MANAGEMENT ───────────────────────────────────────────────────────────
router.get('/users/pending', adminPanel, async (req: AuthRequest, res: Response): Promise<void> => {
  const users = await User.find({ isApproved: false, country: req.user!.country })
    .select('-password').sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

router.patch('/users/:id/approve', adminPanel, async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, zone, district, team } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id,
    { isApproved: true, role, zone, district, team }, { new: true }).select('-password');
  res.json({ success: true, data: user });
});

router.get('/users/active', async (req: AuthRequest, res: Response): Promise<void> => {
  const users = await User.find({ isApproved: true, isActive: true, country: req.user!.country })
    .select('-password').sort({ lastName: 1 });
  res.json({ success: true, data: users });
});

router.get('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  res.json({ success: true, data: user });
});

router.patch('/users/:id/deactivate', adminPanel, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }).select('-password');
  res.json({ success: true, data: user });
});

// ── HOUSING REGISTRY (finances secretary) ────────────────────────────────────
router.get('/housing', isFinances, async (req: AuthRequest, res: Response): Promise<void> => {
  const list = await Housing.find({ country: req.user!.country })
    .populate('tenants', 'firstName lastName gender role').sort({ address: 1 });
  res.json({ success: true, data: list });
});

router.post('/housing', isFinances, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const h = await Housing.create({ ...req.body, country: req.user!.country });
    res.status(201).json({ success: true, data: h });
  } catch { res.status(500).json({ success: false, message: 'Could not create housing record' }); }
});

router.put('/housing/:id', isFinances, async (req: AuthRequest, res: Response): Promise<void> => {
  const h = await Housing.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: h });
});

router.patch('/housing/:id/pay', isFinances, async (req: AuthRequest, res: Response): Promise<void> => {
  const { month, amount, receiptUrl } = req.body;
  const h = await Housing.findById(req.params.id);
  if (!h) { res.status(404).json({ success: false, message: 'Property not found' }); return; }
  const payment = h.payments.find(p => p.month === month);
  if (payment) { payment.paid = true; payment.paidOn = new Date(); payment.amount = amount ?? h.monthlyRent; payment.receiptUrl = receiptUrl; }
  else h.payments.push({ month, paid: true, paidOn: new Date(), amount: amount ?? h.monthlyRent, receiptUrl });
  await h.save();
  res.json({ success: true, data: h });
});

// ── FLIGHTS (immigration secretary) ──────────────────────────────────────────
router.get('/flights', isImmigration, async (req: AuthRequest, res: Response): Promise<void> => {
  const flights = await Flight.find({ country: req.user!.country })
    .populate('userId', 'firstName lastName role').sort({ scheduledDate: 1 });
  res.json({ success: true, data: flights });
});

router.post('/flights', isImmigration, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const f = await Flight.create({ ...req.body, country: req.user!.country, coveredByOng: true });
    res.status(201).json({ success: true, data: f });
  } catch { res.status(500).json({ success: false, message: 'Could not create flight record' }); }
});

router.put('/flights/:id', isImmigration, async (req: AuthRequest, res: Response): Promise<void> => {
  const f = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: f });
});

// ── BUDGET MANAGEMENT (finances secretary) ────────────────────────────────────
router.patch('/budget/:userId/allowance', isFinances, async (req: AuthRequest, res: Response): Promise<void> => {
  const { month, allowance } = req.body;
  let b = await Budget.findOne({ userId: req.params.userId, month });
  if (!b) b = new Budget({ userId: req.params.userId, month, allowance, expenses: [] });
  else b.allowance = allowance;
  await b.save();
  res.json({ success: true, data: b });
});

router.get('/budget/overspend', isFinances, async (req: AuthRequest, res: Response): Promise<void> => {
  const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  const users = await User.find({ country: req.user!.country, isApproved: true, isActive: true }).select('_id firstName lastName');
  const budgets = await Budget.find({ userId: { $in: users.map(u => u._id) }, month });
  const report = budgets
    .filter(b => b.totalSpent > b.allowance)
    .map(b => {
      const u = users.find(x => x._id.toString() === b.userId.toString());
      return { userId: b.userId, name: u ? `${u.firstName} ${u.lastName}` : 'Unknown', allowance: b.allowance, spent: b.totalSpent, over: +(b.totalSpent - b.allowance).toFixed(2) };
    });
  res.json({ success: true, data: report });
});

// ── ROTATION MANAGEMENT ───────────────────────────────────────────────────────
router.get('/rotations/due', adminPanel, async (req: AuthRequest, res: Response): Promise<void> => {
  const cutoff = new Date(Date.now() - 21 * 24 * 3600 * 1000);
  const due = await User.find({
    country: req.user!.country, isApproved: true, isActive: true,
    $or: [{ lastRotationDate: { $lte: cutoff } }, { lastRotationDate: { $exists: false } }],
  }).select('firstName lastName role skills zone district team lastRotationDate rotationHistory');
  res.json({ success: true, data: due });
});

router.patch('/rotations/:userId/rotate', adminPanel, async (req: AuthRequest, res: Response): Promise<void> => {
  const { toZone, toDistrict, toTeam, notes } = req.body;
  const user = await User.findById(req.params.userId);
  if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
  user.rotationHistory.push({ zone: toZone, district: toDistrict, team: toTeam, from: new Date() });
  if (toZone)     user.zone     = toZone;
  if (toDistrict) user.district = toDistrict;
  if (toTeam)     user.team     = toTeam;
  user.lastRotationDate = new Date();
  await user.save();
  res.json({ success: true, data: user });
});

// ── ORG UNITS ─────────────────────────────────────────────────────────────────
router.get('/org-units', async (req: AuthRequest, res: Response): Promise<void> => {
  const q: Record<string, unknown> = { country: req.user!.country };
  if (req.query.type) q.type = req.query.type;
  const units = await OrgUnit.find(q).populate('leaders', 'firstName lastName').sort({ type: 1, name: 1 });
  res.json({ success: true, data: units });
});

router.post('/org-units', adminPanel, async (req: AuthRequest, res: Response): Promise<void> => {
  const unit = await OrgUnit.create({ ...req.body, country: req.user!.country });
  res.status(201).json({ success: true, data: unit });
});

router.patch('/org-units/:id/score', async (req: AuthRequest, res: Response): Promise<void> => {
  const { score, gardens, families, communities, month } = req.body;
  const unit = await OrgUnit.findById(req.params.id);
  if (!unit) { res.status(404).json({ success: false, message: 'Unit not found' }); return; }
  if (score     !== undefined) unit.monthlyScore    = score;
  if (gardens   !== undefined) unit.gardensStarted  = gardens;
  if (families  !== undefined) unit.familiesTrained = families;
  if (communities !== undefined) unit.communityCount = communities;
  if (month) unit.scoreHistory.push({ month, score: unit.monthlyScore, gardens: unit.gardensStarted, families: unit.familiesTrained });
  await unit.save();
  res.json({ success: true, data: unit });
});

export default router;
