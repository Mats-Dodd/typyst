import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Import all schema tables
import * as schema from './schema';

// Create the connection string - use DATABASE_URL for PostgreSQL connection
const connectionString = process.env.DATABASE_URL;

console.log('[DB Client] DATABASE_URL exists:', !!connectionString);

if (!connectionString) {
  console.error('[DB Client] DATABASE_URL environment variable is missing!');
  throw new Error('DATABASE_URL environment variable is required (PostgreSQL connection string)');
}

console.log('[DB Client] Connecting to database...');

// Create the postgres client
const client = postgres(connectionString, {
  max: 1, // Limit connection pool for Better Auth compatibility
  onnotice: (notice) => console.log('[DB Client] Notice:', notice.message)
});

// Create the drizzle database instance with schema
export const db = drizzle(client, { schema });

console.log('[DB Client] Database client initialized');

// Export the client for cleanup if needed
export { client };
