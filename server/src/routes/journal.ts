import { Router, Response, NextFunction } from 'express';
import JournalEntry from '../models/JournalEntry';
import { protect, AuthRequest } from '../middleware/auth';
const router = Router();
router.use(protect);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entries = await JournalEntry.find({ userId: req.user!.id }).sort({ date: -1 });
    res.json(entries);
  } catch (err) { next(err); }
});

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entry = await JournalEntry.create({ ...req.body, userId: req.user!.id });
    res.status(201).json(entry);
  } catch (err) { next(err); }
});

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entry = await JournalEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id }, req.body, { new: true });
    if (!entry) { res.status(404).json({ message: 'Entry not found' }); return; }
    res.json(entry);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await JournalEntry.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    res.json({ message: 'Entry deleted' });
  } catch (err) { next(err); }
});
export default router;
