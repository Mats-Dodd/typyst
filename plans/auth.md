# Haptic Authentication Implementation Plan

## Overview

This document outlines the comprehensive plan to implement authentication in the Haptic app using Better Auth and Supabase as the database backend. We'll be migrating from the current pglite setup to a proper Supabase-based authentication system.

## Current State

- **Database**: Currently using pglite in web app, basic Drizzle schema with minimal user table
- **Apps**: Homepage app (marketing) and web app (main application)
- **Auth**: No authentication currently implemented

## Target Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Homepage App  │    │    Web App      │    │   Supabase DB   │
│   (Marketing)   │◄──►│ (Authenticated) │◄──►│  (Better Auth   │
│                 │    │                 │    │   Schema)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Implementation Phases

### Phase 1: Database Schema & Better Auth Setup

#### 1.1 Update Database Schema for Better Auth
- [ ] Add Better Auth required tables to the schema
- [ ] Update existing user table to match Better Auth requirements
- [ ] Generate and run migrations

**Required Tables:**
```sql
-- Better Auth core tables
- user (id, email, emailVerified, name, image, createdAt, updatedAt)
- session (id, userId, token, expiresAt, ipAddress, userAgent)
- account (id, userId, accountId, providerId, accessToken, refreshToken, idToken, expiresAt, scope)
- verification (id, identifier, value, expiresAt)
```

#### 1.2 Configure Better Auth Server
- [done] Install Better Auth dependencies
- [done] Create auth configuration file
- [done] Set up email/password authentication
- [done] Configure session management
- [done] Set up environment variables for Supabase connection

#### 1.3 Database Package Updates
- [ ] Update `@haptic/db` package to include Better Auth schema
- [ ] Configure Drizzle to work with Supabase
- [ ] Update database client configuration

### Phase 2: Homepage Authentication Integration

#### 2.1 Homepage UI Updates
- [x] Add authentication state detection
- [x] Add "Sign In / Sign Up" button in top right when not authenticated
- [x] Add "Go to App" button when authenticated
- [x] Create loading states for auth checks

#### 2.2 Homepage Route Protection
- [x] Implement server-side session checking
- [x] Add redirect logic based on authentication state

**Implementation Notes:**
- Used server-side authentication checking in `+layout.server.ts` to avoid cross-origin issues
- Homepage communicates with web app's auth server via server-to-server requests
- Authentication state is passed from layout to components via SvelteKit's data loading
- Eliminated client-side auth API calls that were causing 404 errors
- Conditional UI renders based on server-side authentication status

### Phase 3: Web App Authentication Pages

#### 3.1 Create Authentication Pages
- [ ] `/auth/signin` - Sign in page with email/password form
- [ ] `/auth/signup` - Sign up page with email/password form
- [ ] `/auth/signout` - Sign out handler

#### 3.2 Authentication Components
- [ ] Sign in form component
- [ ] Sign up form component
- [ ] Auth error handling component
- [ ] Loading states component

#### 3.3 Form Validation & UX
- [ ] Client-side form validation
- [ ] Error message handling
- [ ] Success feedback
- [ ] Proper focus management and accessibility

### Phase 4: Route Protection & Session Management

#### 4.1 Web App Route Protection
- [ ] Create authentication middleware/guards
- [ ] Protect all main app routes (notes, tasks, daily)
- [ ] Redirect unauthenticated users to sign in
- [ ] Handle session expiration gracefully

#### 4.2 Session Management
- [ ] Implement client-side session hooks
- [ ] Create session context/store
- [ ] Handle automatic token refresh
- [ ] Implement "remember me" functionality

### Phase 5: User Experience & Polish

#### 5.1 Navigation & Redirects
- [ ] After successful signup → redirect to `/notes`
- [ ] After successful signin → redirect to intended page or `/notes`
- [ ] After signout → redirect to homepage
- [ ] Handle authentication state changes across tabs

#### 5.2 Error Handling
- [ ] Proper error messages for auth failures
- [ ] Network error handling
- [ ] Rate limiting feedback
- [ ] Validation error display

## Technical Implementation Details

### Better Auth Configuration

```typescript
// lib/auth.ts (server)
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@haptic/db"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg"
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // 1 day
  }
})
```

```typescript
// lib/auth-client.ts (client)
import { createAuthClient } from "better-auth/client"

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL
})
```

### Database Schema Updates

```typescript
// packages/db/src/schema/auth.ts
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent')
})
```

### Environment Variables Required

```env
# .env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:5173" # dev URL
```

## File Structure Changes

```
packages/db/src/schema/
├── index.ts (updated exports)
├── user.ts (Better Auth user schema)
├── session.ts (Better Auth session schema)
├── account.ts (Better Auth account schema)
└── verification.ts (Better Auth verification schema)

apps/web/src/lib/
├── auth.ts (Better Auth server config)
└── auth-client.ts (Better Auth client)

apps/web/src/routes/
├── auth/
│   ├── signin/+page.svelte
│   ├── signup/+page.svelte
│   └── signout/+page.ts
└── (protected)/
    ├── +layout.server.ts (auth guard)
    ├── notes/
    ├── tasks/
    └── daily/

apps/homepage/src/lib/
└── auth-client.ts (Better Auth client for homepage)
```


```

## Testing Strategy

- [ ] Unit tests for auth functions
- [ ] Integration tests for auth flows
- [ ] E2E tests for complete user journeys
- [ ] Test session persistence and expiration
- [ ] Test route protection

## Security Considerations

- [ ] CSRF protection (built into Better Auth)
- [ ] Rate limiting on auth endpoints
- [ ] Secure session storage
- [ ] Proper password hashing (handled by Better Auth)
- [ ] Email verification flow
- [ ] Secure headers configuration

## Migration Strategy

1. **Development First**: Implement in development environment
2. **Database Migration**: Run schema migrations on staging
3. **Feature Flags**: Use feature flags to control auth rollout
4. **Gradual Rollout**: Enable auth for beta users first
5. **Full Migration**: Complete migration from pglite to Supabase

## Success Metrics

- [ ] Users can sign up successfully
- [ ] Users can sign in successfully
- [ ] Sessions persist correctly across browser sessions
- [ ] Route protection works as expected
- [ ] No security vulnerabilities in auth flow
- [ ] Performance doesn't degrade with auth implementation

## Future Enhancements (Post-MVP)

- [ ] Social sign-in (Google, GitHub)
- [ ] Two-factor authentication
- [ ] Password reset functionality
- [ ] Account management pages
- [ ] User profile management
- [ ] OAuth provider integration

## Timeline Estimate

- **Phase 1**: 3-4 days (Database & Server Setup)
- **Phase 2**: 1-2 days (Homepage Integration)
- **Phase 3**: 3-4 days (Web App Auth Pages)
- **Phase 4**: 2-3 days (Route Protection)
- **Phase 5**: 2-3 days (Polish & Testing)

**Total**: ~2-3 weeks for complete implementation

---

*This plan will be updated as implementation progresses and requirements evolve.* 