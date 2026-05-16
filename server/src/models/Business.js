import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    keywords: [{ type: String, trim: true }]
  },
  { _id: true }
);

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    googleReviewLink: { type: String, required: true, trim: true },
    services: {
      type: [serviceSchema],
      validate: {
        validator: (services) => services.length > 0,
        message: 'At least one service is required'
      }
    }
  },
  { timestamps: true }
);

export const Business = mongoose.model('Business', businessSchema);
