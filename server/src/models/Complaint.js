import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true
    },
    serviceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    serviceName: { type: String, required: true },
    feedback: { type: String, required: true, trim: true },
    customerName: { type: String, trim: true },
    customerContact: { type: String, trim: true },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Resolved'],
      default: 'New',
      index: true
    }
  },
  { timestamps: true }
);

export const Complaint = mongoose.model('Complaint', complaintSchema);
