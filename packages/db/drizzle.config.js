// packages/db/drizzle.config.mjs
export default {
  dialect: 'postgresql',
  schema: './src/schema/**.ts',
  out: './drizzle', // SQL files land here
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
};
