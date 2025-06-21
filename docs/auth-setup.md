# Better Auth Setup Guide

## Environment Variables Required

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:[password]@[host]:[port]/[database]"

# Better Auth Configuration
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:5173"

# Production URLs (for homepage auth client)
PUBLIC_WEB_APP_URL="https://app.haptic.app"
PUBLIC_APP_URL="https://haptic.app"
```

## Database Setup

1. Get your Supabase database URL from your project settings
2. Replace `[password]`, `[host]`, `[port]`, and `[database]` with your actual values
3. Run migrations: `cd packages/db && npm run migrate:push`

## Generate Better Auth Secret

Run this command to generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Development Setup

1. Install dependencies: `pnpm install`
2. Run database migrations: `cd packages/db && npm run migrate:push`
3. Start development servers:
   - Web app: `cd apps/web && npm run dev`
   - Homepage: `cd apps/homepage && npm run dev`

## Phase 1 Complete ✅

The following has been implemented:

- ✅ Better Auth schema (user, session, account, verification tables)
- ✅ Database migrations generated
- ✅ Better Auth server configuration
- ✅ Better Auth client configuration for web app
- ✅ Better Auth client configuration for homepage
- ✅ API route handler for authentication endpoints

## Next Steps

Phase 2: Homepage authentication integration
Phase 3: Web app authentication pages
Phase 4: Route protection and session management
Phase 5: User experience and polish 