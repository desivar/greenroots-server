import { Router, Response, NextFunction } from 'express';
import OrgUnit from '../models/OrgUnit';
import User from '../models/User';
import Message from '../models/Message';
import { protect, AuthRequest, isAssistantUp, isCEO } from '../middleware/auth';
import { analyzePerfomance, suggestRotation } from '../services/aiService';
const router = Router();
router.use(protect);

// GET leaderboard for current country/month
router.get('/leaderboard', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { country } = req.user!;
    const { month, year } = req.query;
    const units = await OrgUnit.find({ country, month, year: Number(year) }).sort({ districtScore: -1 });
    const topZones: Record<number, number> = {};
    units.forEach(u => { topZones[u.zone] = (topZones[u.zone] || 0) + u.districtScore; });
    const zoneRanking = Object.entries(topZones).sort((a, b) => Number(b[1]) - Number(a[1]));
    const topDistricts = [...units].sort((a, b) => b.districtScore - a.districtScore).slice(0, 5);
    const allTeams = units.flatMap(u => u.teams).sort((a, b) => b.points - a.points).slice(0, 5);
    res.json({ zoneRanking, topDistricts, topTeams: allTeams });
  } catch (err) { next(err); }
});

// GET impact stats for current country/month
router.get('/impact', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { country } = req.user!;
    const { month, year } = req.query;
    const units = await OrgUnit.find({ country, month, year: Number(year) });
    const gardens = units.flatMap(u => u.teams).reduce((s, t) => s + t.gardensStarted, 0);
    const families = units.flatMap(u => u.teams).reduce((s, t) => s + t.familiesTrained, 0);
    const communities = new Set(units.map(u => u.district)).size;
    res.json({ gardensStarted: gardens, familiesTrained: families, communitiesReached: communities });
  } catch (err) { next(err); }
});

// GET CEO message for current country
router.get('/ceo-message/:country', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const msg = await Message.findOne({ scope: 'country', targetCountry: req.params.country, humanApproved: true })
      .populate('from', 'firstName lastName profilePhoto role').sort({ createdAt: -1 });
    res.json(msg);
  } catch (err) { next(err); }
});

// GET AI performance analysis (CEO/assistant only)
router.post('/ai-analysis', isAssistantUp, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { country } = req.user!;
    const { month, year, lang } = req.body;
    const units = await OrgUnit.find({ country, month, year });
    const staffCounts = await User.aggregate([
      { $match: { country, isApproved: true, isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const endingSoon = await User.find({ country, endDate: { $lte: new Date(Date.now() + 60 * 24 * 3600 * 1000) } })
      .select('firstName lastName endDate role zone district');
    const analysis = await analyzePerfomance({ units, staffCounts, endingSoon }, lang || 'en');
    res.json({ analysis, endingSoon });
  } catch (err) { next(err); }
});

// GET staff rotation suggestions
router.post('/rotation-suggest', isAssistantUp, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { country } = req.user!;
    const { zoneNeeds, lang } = req.body;
    const candidates = await User.find({ country, isApproved: true, isActive: true,
      role: { $in: ['member_m','member_f','district_leader','zone_leader'] } })
      .select('firstName lastName role skills education zone district team lastRotationDate rotationHistory');
    const suggestion = await suggestRotation(candidates, zoneNeeds, lang || 'en');
    res.json({ suggestion, candidates: candidates.length });
  } catch (err) { next(err); }
});

// GET pending applications (assistant+)
router.get('/pending-applications', isAssistantUp, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { country } = req.user!;
    const apps = await User.find({ country, isApproved: false })
      .select('firstName lastName email gender dateOfBirth maritalStatus workType termMonths education skills motivation createdAt')
      .sort({ createdAt: 1 });
    res.json(apps);
  } catch (err) { next(err); }
});
export default router;
