import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Import all schema tables
import * as schema from './schema';

// Create the connection
const connectionString = process.env.SUPABASE_URL;

if (!connectionString) {
  throw new Error('SUPABASE_URL environment variable is required');
}

// Create the postgres client
const client = postgres(connectionString);

// Create the drizzle database instance with schema
export const db = drizzle(client, { schema });

// Export the client for cleanup if needed
export { client };
