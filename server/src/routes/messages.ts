import { Router, Response } from 'express';
import { protect, leaderOrAbove, secretaryOrAbove, AuthRequest } from '../middleware/auth';
import Message from '../models/Message';
import * as ai from '../services/aiService';

const router = Router();
router.use(protect);

// GET inbox for current user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, _id, country } = req.user!;
    const msgs = await Message.find({
      $or: [
        { scope: 'everyone' },
        { scope: 'country', country },
        { scope: 'individual', toUser: _id },
        ...(role === 'member_f' || role === 'ceo_wife' || role === 'women_trainer'
          ? [{ scope: 'women_org', country }] : []),
      ],
    })
      .populate('fromUser', 'firstName lastName role profilePhoto')
      .sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: msgs });
  } catch { res.status(500).json({ success: false, message: 'Could not fetch messages' }); }
});

// POST send message (leaders and above)
router.post('/', leaderOrAbove, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const msg = await Message.create({
      fromUser: req.user!._id,
      fromRole: req.user!.role,
      ...req.body,
      isAiDraft: false,
      aiDraftReviewed: false,
      sentAt: new Date(),
    });
    res.status(201).json({ success: true, data: msg });
  } catch { res.status(500).json({ success: false, message: 'Could not send message' }); }
});

// PATCH mark as read
router.patch('/:id/read', async (req: AuthRequest, res: Response): Promise<void> => {
  await Message.findByIdAndUpdate(req.params.id, { $addToSet: { readBy: req.user!._id } });
  res.json({ success: true });
});

// POST AI draft — returns draft for human review
router.post('/ai-draft', secretaryOrAbove, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { draftType, payload, lang } = req.body as {
      draftType: 'budget_alert' | 'health_emergency' | 'document_reminder' | 'supply_alert';
      payload: Record<string, unknown>;
      lang: 'en' | 'es';
    };

    let draft: { subject: string; body: string };
    switch (draftType) {
      case 'budget_alert':       draft = await ai.draftBudgetAlert({ ...payload, lang } as Parameters<typeof ai.draftBudgetAlert>[0]); break;
      case 'health_emergency':   draft = await ai.draftHealthEmergencyMessage({ ...payload, lang } as Parameters<typeof ai.draftHealthEmergencyMessage>[0]); break;
      case 'document_reminder':  draft = await ai.draftDocumentReminder({ ...payload, lang } as Parameters<typeof ai.draftDocumentReminder>[0]); break;
      case 'supply_alert':       draft = await ai.draftSupplyAlert({ ...payload, lang } as Parameters<typeof ai.draftSupplyAlert>[0]); break;
      default: res.status(400).json({ success: false, message: 'Unknown draft type' }); return;
    }

    res.json({ success: true, draft, note: 'AI draft — review and edit before sending.' });
  } catch { res.status(500).json({ success: false, message: 'AI draft failed' }); }
});

// POST secretary approves AI draft and sends
router.post('/ai-draft/send', secretaryOrAbove, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const msg = await Message.create({
      fromUser: req.user!._id,
      fromRole: req.user!.role,
      ...req.body,
      isAiDraft: true,
      aiDraftReviewed: true,
      sentAt: new Date(),
    });
    res.status(201).json({ success: true, data: msg });
  } catch { res.status(500).json({ success: false, message: 'Could not send message' }); }
});

export default router;
