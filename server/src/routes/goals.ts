import { Router, Response, NextFunction } from 'express';
import Goal from '../models/Goal';
import { protect, AuthRequest } from '../middleware/auth';
const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { month } = req.query;
    const filter: Record<string, unknown> = { userId: req.user!.id };
    if (month) filter.month = month;
    res.json(await Goal.find(filter).sort({ targetDate: 1 }));
  } catch (err) { next(err); }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const goal = await Goal.create({ ...req.body, userId: req.user!.id });
    res.status(201).json(goal);
  } catch (err) { next(err); }
});

router.patch('/:id/toggle', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!goal) { res.status(404).json({ message: 'Goal not found' }); return; }
    goal.completed = !goal.completed;
    goal.completedAt = goal.completed ? new Date() : undefined;
    await goal.save();
    res.json(goal);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    res.json({ message: 'Goal deleted' });
  } catch (err) { next(err); }
});
export default router;
