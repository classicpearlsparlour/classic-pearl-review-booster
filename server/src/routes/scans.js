import { Router } from 'express';
import { z } from 'zod';
import { Business, Event } from '../data/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
const scanSchema = z.object({ businessId: z.string().min(1) });

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { businessId } = scanSchema.parse(req.body);
    const business = await Business.findById(businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });

    await Event.create({ businessId, type: 'qr_scan' });
    res.status(201).json({ ok: true });
  })
);

export default router;
