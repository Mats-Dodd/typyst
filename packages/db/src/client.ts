import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Import all schema tables
import * as schema from './schema';

// Create the connection string - use DATABASE_URL for PostgreSQL connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required (PostgreSQL connection string)');
}

// Create the postgres client
const client = postgres(connectionString, {
  max: 1 // Limit connection pool for Better Auth compatibility
});

// Create the drizzle database instance with schema
export const db = drizzle(client, { schema });

// Export the client for cleanup if needed
export { client };
