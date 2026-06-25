import { Router, Response, NextFunction } from 'express';
import Housing from '../models/Housing';
import { protect, AuthRequest, isFinances } from '../middleware/auth';
const router = Router();
router.use(protect, isFinances);

router.get('/:country', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const houses = await Housing.find({ country: req.params.country }).populate('tenants', 'firstName lastName gender zone district team');
    res.json(houses);
  } catch (err) { next(err); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const house = await Housing.create(req.body);
    res.status(201).json(house);
  } catch (err) { next(err); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const house = await Housing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!house) { res.status(404).json({ message: 'Property not found' }); return; }
    res.json(house);
  } catch (err) { next(err); }
});

router.patch('/:id/payment', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const house = await Housing.findById(req.params.id);
    if (!house) { res.status(404).json({ message: 'Property not found' }); return; }
    const { month, year, amount, receiptUrl } = req.body;
    const existing = house.payments.find(p => p.month === month && p.year === year);
    if (existing) {
      existing.status = 'paid'; existing.paidOn = new Date();
      if (receiptUrl) existing.receiptUrl = receiptUrl;
    } else {
      house.payments.push({ month, year, amount: amount || house.monthlyRent, paidOn: new Date(), status: 'paid', receiptUrl });
    }
    await house.save();
    res.json(house);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Housing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property removed' });
  } catch (err) { next(err); }
});
export default router;
