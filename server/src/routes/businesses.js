import { Router } from 'express';
import { z } from 'zod';
import { Business } from '../data/index.js';
import { createBusinessQrDataUrl } from '../services/qr.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getPublicAppUrl } from '../config/publicUrls.js';

const router = Router();

const businessSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  location: z.string().min(2),
  googleReviewLink: z.string().url(),
  services: z
    .array(
      z.object({
        name: z.string().min(2),
        keywords: z.array(z.string().min(1)).default([])
      })
    )
    .min(1)
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = businessSchema.parse(req.body);
    const business = await Business.create(payload);
    res.status(201).json(business);
  })
);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const businesses = await Business.find().sort({ createdAt: -1 });
    res.json(businesses);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: 'Business not found' });
    res.json(business);
  })
);

router.get(
  '/:id/qr',
  asyncHandler(async (req, res) => {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: 'Business not found' });

    const qrDataUrl = await createBusinessQrDataUrl(business.id);
    res.json({
      scanUrl: `${getPublicAppUrl()}/r/${business.id}`,
      qrDataUrl
    });
  })
);

export default router;
