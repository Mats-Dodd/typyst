// Export the database client
export { db } from './client';

// Export all schema tables
export * from './schema';

// Export types for better TypeScript support
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
