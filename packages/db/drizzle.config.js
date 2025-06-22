// packages/db/drizzle.config.mjs

// Validate environment variables when in migration mode
if (process.env.MIGRATION_MODE === 'true' && !process.env.SUPABASE_DIRECT_URL) {
  throw new Error(
    'SUPABASE_DIRECT_URL environment variable is required for migrations. ' +
      'Please set it in your .env file. ' +
      'See packages/db/README.md for more information.'
  );
}

export default {
  dialect: 'postgresql',
  schema: './src/schema/**.ts',
  out: './drizzle', // SQL files land here
  dbCredentials: {
    // Use direct URL for migrations to avoid Supabase pooler issues with drizzle-kit
    // Regular app queries use DATABASE_URL (pooled connection)
    url:
      process.env.MIGRATION_MODE === 'true'
        ? process.env.SUPABASE_DIRECT_URL
        : process.env.DATABASE_URL
  }
};
