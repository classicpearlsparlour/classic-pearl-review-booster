import { Router } from 'express';
import mongoose from 'mongoose';
import { Complaint, Event, isMongoMode } from '../data/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get(
  '/:businessId',
  asyncHandler(async (req, res) => {
    const { businessId } = req.params;
    if (isMongoMode && !mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: 'Invalid business id' });
    }
    const matchedBusinessId = isMongoMode ? new mongoose.Types.ObjectId(businessId) : businessId;

    const eventCounts = await Event.aggregate([
      { $match: { businessId: matchedBusinessId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const counts = Object.fromEntries(eventCounts.map((item) => [item._id, item.count]));
    const totalQrScans = counts.qr_scan || 0;
    const googleClicks = counts.google_click || 0;
    const complaints = await Complaint.countDocuments({ businessId });

    res.json({
      totalQrScans,
      reviewOptionViews: counts.review_options_view || 0,
      googleReviewButtonClicks: googleClicks,
      feedbackComplaints: complaints,
      conversionRate: totalQrScans ? Number(((googleClicks / totalQrScans) * 100).toFixed(1)) : 0
    });
  })
);

export default router;
