import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['qr_scan', 'review_options_view', 'google_click', 'complaint_created'],
      required: true,
      index: true
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export const Event = mongoose.model('Event', eventSchema);
