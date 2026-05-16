import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDatabase } from './lib/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import businessRoutes from './routes/businesses.js';
import scanRoutes from './routes/scans.js';
import reviewRoutes from './routes/reviews.js';
import complaintRoutes from './routes/complaints.js';
import analyticsRoutes from './routes/analytics.js';
import { getAllowedOrigins } from './config/publicUrls.js';

const app = express();
const port = process.env.PORT || 4000;
const allowedOrigins = getAllowedOrigins();

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'qr-ai-review-booster-api',
    dataMode: process.env.DATA_MODE || 'mongodb',
    supabaseConfigured: Boolean(process.env.SUPABASE_URL),
    supabaseKeyConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  });
});

app.use('/api/businesses', businessRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use(errorHandler);

await connectDatabase();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
