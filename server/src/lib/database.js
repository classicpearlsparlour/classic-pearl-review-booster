import mongoose from 'mongoose';
import { isMemoryMode, isSupabaseMode } from '../data/index.js';

export async function connectDatabase() {
  if (isMemoryMode) {
    console.log('Using in-memory data store');
    return;
  }

  if (isSupabaseMode) {
    console.log('Using Supabase data store');
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}
