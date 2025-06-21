# Environment Variables Setup

To fix the build error, you need to set the DATABASE_URL environment variable:

1. Create a .env file in the web app directory:
   ```bash
   cd apps/web
   touch .env
   ```

2. Add your database connection string to the .env file:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

   You can get this from your Supabase project:
   - Go to your Supabase dashboard
   - Navigate to Settings > Database
   - Copy the connection string (URI)

3. For local development, you can also use:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
   ```

4. Build the project:
   ```bash
   pnpm build
   ```

