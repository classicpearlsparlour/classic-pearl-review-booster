import { Router } from 'express';
import { z } from 'zod';
import { Business, Complaint, Event } from '../data/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

const createComplaintSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  feedback: z.string().min(5).max(2000),
  customerName: z.string().max(120).optional().default(''),
  customerContact: z.string().max(160).optional().default('')
});

const updateComplaintSchema = z.object({
  status: z.enum(['New', 'Contacted', 'Resolved'])
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const businessId = z.string().min(1).parse(req.query.businessId);
    const complaints = await Complaint.find({ businessId }).sort({ createdAt: -1 });
    res.json(complaints);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = createComplaintSchema.parse(req.body);
    const business = await Business.findById(payload.businessId);
    if (!business) return res.status(404).json({ message: 'Business not found' });

    const service = business.services.id(payload.serviceId);
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const complaint = await Complaint.create({
      ...payload,
      serviceName: service.name
    });

    await Event.create({
      businessId: business.id,
      type: 'complaint_created',
      metadata: { serviceId: service.id }
    });

    res.status(201).json(complaint);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const payload = updateComplaintSchema.parse(req.body);
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, payload, {
      new: true
    });
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(complaint);
  })
);

export default router;
