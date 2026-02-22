'use client';

// Re-export Firebase services from config.ts
// This file is kept for backwards compatibility
import { auth, db, storage } from './config';

// Export with both names for compatibility
export { auth, db as firestore, storage };
