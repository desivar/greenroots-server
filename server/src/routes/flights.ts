import { Router, Response, NextFunction } from 'express';
import Flight from '../models/Flight';
import { protect, AuthRequest, isImmigration } from '../middleware/auth';
const router = Router();
router.use(protect);

router.get('/my', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await Flight.find({ userId: req.user!.id }).sort({ departureDate: 1 }));
  } catch (err) { next(err); }
});

router.get('/country/:country', isImmigration, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const flights = await Flight.find({ country: req.params.country })
      .populate('userId', 'firstName lastName email zone district')
      .sort({ departureDate: 1 });
    res.json(flights);
  } catch (err) { next(err); }
});

router.post('/', isImmigration, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flight = await Flight.create(req.body);
    res.status(201).json(flight);
  } catch (err) { next(err); }
});

router.post('/request', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const flight = await Flight.create({ ...req.body, userId: req.user!.id, status: 'requested', paidByOrg: true });
    res.status(201).json(flight);
  } catch (err) { next(err); }
});

router.patch('/:id', isImmigration, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!flight) { res.status(404).json({ message: 'Flight not found' }); return; }
    res.json(flight);
  } catch (err) { next(err); }
});
export default router;
