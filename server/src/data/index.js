import { Business as MongoBusiness } from '../models/Business.js';
import { Event as MongoEvent } from '../models/Event.js';
import { Complaint as MongoComplaint } from '../models/Complaint.js';
import { MemoryBusiness, MemoryComplaint, MemoryEvent } from './memory.js';
import { SupabaseBusiness, SupabaseComplaint, SupabaseEvent } from './supabase.js';

export const dataMode = process.env.DATA_MODE || 'mongodb';
export const isMemoryMode = dataMode === 'memory';
export const isSupabaseMode = dataMode === 'supabase';
export const isMongoMode = dataMode === 'mongodb';

export const Business = isSupabaseMode ? SupabaseBusiness : isMemoryMode ? MemoryBusiness : MongoBusiness;
export const Event = isSupabaseMode ? SupabaseEvent : isMemoryMode ? MemoryEvent : MongoEvent;
export const Complaint = isSupabaseMode ? SupabaseComplaint : isMemoryMode ? MemoryComplaint : MongoComplaint;
