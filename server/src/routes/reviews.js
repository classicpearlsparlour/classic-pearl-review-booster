import { Router } from 'express';
import { z } from 'zod';
import { Business, Event } from '../data/index.js';
import { generateReviewSuggestions } from '../services/reviewGenerator.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

const suggestionSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1).optional(),
  serviceIds: z.array(z.string().min(1)).min(1).optional(),
  experience: z.enum(['loved', 'good']),
  feedback: z.string().max(500).optional().default('')
});

const clickSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1).optional(),
  serviceIds: z.array(z.string().min(1)).optional(),
  selectedReview: z.string().max(1000).optional()
});

router.post(
  '/suggestions',
  asyncHandler(async (req, res) => {
    const payload = suggestionSchema.parse(req.body);
    const business = await Business.findById(payload.businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });

    const requestedServiceIds = payload.serviceIds?.length ? payload.serviceIds : [payload.serviceId].filter(Boolean);
    const services = requestedServiceIds.map((serviceId) => business.services.id(serviceId)).filter(Boolean);
    if (!services.length) return res.status(404).json({ message: 'Service not found' });

    const options = await generateReviewSuggestions({
      business,
      services,
      experience: payload.experience,
      feedback: payload.feedback
    });

    await Event.create({
      businessId: business.id,
      type: 'review_options_view',
      metadata: { serviceIds: services.map((service) => service.id), experience: payload.experience }
    });

    res.json({ options });
  })
);

router.post(
  '/google-click',
  asyncHandler(async (req, res) => {
    const payload = clickSchema.parse(req.body);
    const business = await Business.findById(payload.businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });

    await Event.create({
      businessId: business.id,
      type: 'google_click',
      metadata: {
        serviceId: payload.serviceId,
        serviceIds: payload.serviceIds || [],
        selectedReviewLength: payload.selectedReview?.length || 0
      }
    });

    res.json({ googleReviewLink: business.googleReviewLink });
  })
);

export default router;
