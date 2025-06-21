# Environment Variables Setup

## Database Configuration

To fix the authentication and database errors, you need to set the DATABASE_URL environment variable:

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

3. For local development with a local PostgreSQL instance:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/haptic
   ```

4. Optional: Add additional environment variables for auth:
   ```
   AUTH_SECRET=your-random-secret-here
   PUBLIC_APP_URL=http://localhost:5173
   ```

## Debugging Authentication Issues

With the console logs added, you'll see the following information in your browser console and terminal:

### Browser Console:
- `[Auth Client] Initializing with baseURL:` - Shows which URL the auth client is using
- `[Signin] Attempting to sign in with email:` - Shows when login is attempted
- `[Signin] Auth result:` - Shows the response from the auth API
- `[Signin] Auth error:` - Shows any authentication errors
- `[Signin] Auth successful, redirecting...` - Shows successful authentication

### Server Console:
- `[DB Client] DATABASE_URL exists:` - Confirms if DATABASE_URL is set
- `[DB Client] Connecting to database...` - Shows database connection attempt
- `[Auth Server] Initializing Better Auth...` - Shows auth server initialization
- `[Auth API] POST request to:` - Shows incoming auth requests
- `[Auth API] Response status:` - Shows auth response status
- `[App Layout] Session check result:` - Shows session validation results
- `[Auth Layout] Loading auth page:` - Shows auth page loading

## Common Issues and Solutions

1. **"DATABASE_URL environment variable is required"**
   - Solution: Create the .env file in `apps/web/` with the DATABASE_URL

2. **"Auth failed" on login page**
   - Check browser console for `[Auth Client]` logs
   - Check server console for `[Auth API]` logs
   - Ensure DATABASE_URL is correct and database is running

3. **Port conflicts**
   - Web app should be on port 5173
   - Homepage should be on port 5175
   - Check that auth client is using the correct port

4. **Session not persisting**
   - Check that cookies are being set properly
   - Look for `[App Layout] Session check result:` in server logs

## Running the Development Environment

After setting up environment variables:

```bash
# Install dependencies
pnpm install

# Run both web and homepage apps
pnpm dev-web

# Or run them separately:
pnpm --filter=web dev
pnpm --filter=homepage dev
```

The apps will be available at:
- Web app: http://localhost:5173
- Homepage: http://localhost:5175

