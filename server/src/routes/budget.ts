import { Router, Response, NextFunction } from 'express';
import Budget from '../models/Budget';
import Message from '../models/Message';
import User from '../models/User';
import { protect, AuthRequest, isFinances } from '../middleware/auth';
import { analyzeBudget } from '../services/aiService';
const router = Router();
router.use(protect);

// GET current user's budget for a month
router.get('/my', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { month, year } = req.query;
    const budget = await Budget.findOne({ userId: req.user!.id, month, year: Number(year) });
    res.json(budget);
  } catch (err) { next(err); }
});

// POST expense to current budget
router.post('/expense', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { month, year, description, amount, category } = req.body;
    let budget = await Budget.findOne({ userId: req.user!.id, month, year });
    if (!budget) {
      const user = await User.findById(req.user!.id).select('country');
      budget = await Budget.create({ userId: req.user!.id, country: user!.country, month, year, allowance: 320, expenses: [] });
    }
    budget.expenses.push({ description, amount, category, date: new Date() });
    await budget.save();

    // Auto overspend check — trigger AI + alert if > 90%
    const pct = (budget.totalSpent / budget.allowance) * 100;
    if (pct >= 90 && !budget.overspendAlertSent) {
      const user = await User.findById(req.user!.id).select('firstName lastName email country');
      const { draftMessage } = await analyzeBudget(user, budget, 'en');
      await Message.create({
        from: req.user!.id,
        scope: 'direct',
        targetUsers: [req.user!.id],
        title: 'Budget alert — review your spending',
        body: draftMessage || `Your monthly budget is ${Math.round(pct)}% used.`,
        isAiDraft: true,
        humanApproved: false,
        isAutoAlert: true,
        alertType: 'budget_overspend',
      });
      budget.overspendAlertSent = true;
      await budget.save();
    }
    res.json(budget);
  } catch (err) { next(err); }
});

// GET all budgets by country (finances secretary)
router.get('/country/:country', isFinances, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const budgets = await Budget.find({ country: req.params.country })
      .populate('userId', 'firstName lastName email zone district team');
    res.json(budgets);
  } catch (err) { next(err); }
});

// AI analysis for finances secretary
router.post('/analyze', isFinances, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userData, budgetData, lang } = req.body;
    const result = await analyzeBudget(userData, budgetData, lang || 'en');
    res.json(result);
  } catch (err) { next(err); }
});
export default router;
