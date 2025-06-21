# Haptic Authentication - Phase 4 Implementation Plan

## Overview

This document outlines the implementation plan for Phase 4 of Haptic's authentication system, focusing on Route Protection and Session Management. The approach emphasizes simplicity, security, and leveraging SvelteKit's native features with Better Auth.

## Phase 4: Route Protection & Session Management

### 4.1 Route Protection

#### Approach
We'll use SvelteKit's server-side authentication pattern with layout groups to protect routes. This provides a clean separation between public and protected areas of the application.

#### Directory Structure
```
src/routes/
├── (auth)/              # Public routes (no auth required)
│   ├── +layout.server.ts
│   └── auth/
│       ├── signin/
│       ├── signup/
│       └── signout/
├── (app)/               # Protected routes (auth required)
│   ├── +layout.server.ts # Auth guard
│   ├── +layout.svelte    # Client layout with session
│   ├── notes/
│   ├── tasks/
│   └── daily/
└── +page.server.ts      # Root redirect to /notes
```

#### Key Components

##### 1. Protected Layout Guard (`(app)/+layout.server.ts`)
```typescript
import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request, url }) => {
    const session = await auth.api.getSession({
        headers: request.headers
    });
    
    if (!session) {
        // Store the intended destination
        const redirectTo = url.pathname + url.search;
        redirect(303, `/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
    
    return {
        session,
        user: session.user
    };
};
```

##### 2. Public Layout (`(auth)/+layout.server.ts`)
```typescript
import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request, url }) => {
    const session = await auth.api.getSession({
        headers: request.headers
    });
    
    // Redirect authenticated users away from auth pages
    if (session && !url.pathname.includes('/signout')) {
        const redirectTo = url.searchParams.get('redirectTo') || '/notes';
        redirect(303, redirectTo);
    }
    
    return {
        session
    };
};
```

##### 3. Session Validation Features
- Server-side validation on every request
- Graceful handling of expired sessions
- Redirect to original destination after login
- Type-safe session data throughout the app

### 4.2 Session Management

#### Client-Side Session Handling

##### 1. Session Store (`$lib/stores/session.ts`)
```typescript
import { authClient } from '$lib/auth-client';
import type { PageData } from './$types';

// The session is reactive and automatically updates
export const session = authClient.useSession();

// Helper functions
export function isAuthenticated() {
    return !!session.data;
}

export function getUser() {
    return session.data?.user;
}
```

##### 2. Client Layout with Session (`(app)/+layout.svelte`)
```svelte
<script lang="ts">
    import { session } from '$lib/stores/session';
    import { onMount } from 'svelte';
    import type { LayoutData } from './$types';
    
    export let data: LayoutData;
    
    // Initialize session from server data
    onMount(() => {
        if (data.session) {
            // Session will auto-sync across tabs
        }
    });
</script>

{#if $session.isPending}
    <div>Loading...</div>
{:else if $session.data}
    <slot />
{:else}
    <div>Redirecting to login...</div>
{/if}
```

##### 3. Auto Token Refresh
- Handled automatically by Better Auth
- Sessions refresh when `updateAge` threshold is reached (1 day)
- No manual token management required
- Seamless user experience

##### 4. Remember Me Implementation
```typescript
// In signin component
await signIn.email({
    email,
    password,
    rememberMe: true, // Extends session duration
    callbackURL: redirectTo || '/notes'
});
```

### 4.3 Implementation Steps

#### Step 1: Restructure Routes (15 minutes)
- [ ] Create `(auth)` and `(app)` layout groups
- [ ] Move existing auth routes to `(auth)` group
- [ ] Move notes, tasks, daily routes to `(app)` group
- [ ] Update all import paths and links

#### Step 2: Implement Auth Guards (20 minutes)
- [ ] Create `(app)/+layout.server.ts` with session checking
- [ ] Create `(auth)/+layout.server.ts` with redirect logic
- [ ] Add proper TypeScript types for layouts
- [ ] Test redirect flows

#### Step 3: Update Auth Pages (10 minutes)
- [ ] Add `redirectTo` parameter handling
- [ ] Update form actions to preserve redirect
- [ ] Ensure proper success callbacks
- [ ] Add loading states during auth

#### Step 4: Client Session Management (15 minutes)
- [ ] Create session store using Better Auth hooks
- [ ] Update app layout with session provider
- [ ] Add session data to components
- [ ] Implement loading states

#### Step 5: Error Handling (10 minutes)
- [ ] Handle session expiration gracefully
- [ ] Add network error recovery
- [ ] Implement auth failure messages
- [ ] Create user-friendly error pages

### 4.4 Error Handling Strategy

#### Session Errors
```typescript
// In layout.server.ts
try {
    const session = await auth.api.getSession({
        headers: request.headers
    });
    // ... rest of logic
} catch (error) {
    // Log error for monitoring
    console.error('Session validation error:', error);
    
    // Clear any stale cookies
    cookies.delete('better-auth.session_token', { path: '/' });
    
    // Redirect to login
    redirect(303, '/auth/signin');
}
```

#### Network Errors
- Implement retry logic for transient failures
- Show user-friendly error messages
- Provide offline mode feedback
- Cache critical data when possible

### 4.5 Benefits of This Approach

1. **Simple**: Uses SvelteKit's built-in patterns without extra dependencies
2. **Secure**: All authentication checks happen server-side
3. **Fast**: Session data is cached in page data, avoiding redundant checks
4. **Type-safe**: Full TypeScript support throughout the application
5. **Reactive**: UI automatically updates when auth state changes
6. **SEO-friendly**: Can enable SSR for public pages if needed
7. **Progressive**: Works without JavaScript for basic functionality

### 4.6 Key Architecture Decisions

1. **No External Middleware**: Leverage SvelteKit's native layout system
2. **Server-Side First**: All auth validation happens on the server
3. **Layout Groups**: Clean separation between public and protected routes
4. **Minimal Client State**: Let Better Auth handle session complexity
5. **Progressive Enhancement**: Core functionality works without JS

### 4.7 Security Considerations

- [ ] All route protection happens server-side
- [ ] Session tokens are httpOnly cookies
- [ ] CSRF protection via SvelteKit
- [ ] Secure headers configuration
- [ ] Rate limiting on auth endpoints (Better Auth built-in)
- [ ] Proper error messages (no user enumeration)

### 4.8 Testing Checklist

- [ ] Unauthenticated users cannot access protected routes
- [ ] Authenticated users are redirected from auth pages
- [ ] Session persists across page refreshes
- [ ] Remember me extends session duration
- [ ] Redirect to original page after login works
- [ ] Session expires gracefully
- [ ] Multiple tabs stay in sync
- [ ] Network errors are handled properly

### 4.9 Performance Optimizations

1. **Session Caching**: Reuse session data from layout
2. **Lazy Loading**: Load auth components only when needed
3. **Optimistic UI**: Update UI before server confirmation
4. **Minimal Redirects**: Smart routing to avoid loops

### 4.10 Future Enhancements

After Phase 4 is complete, consider:
- [ ] Session activity monitoring
- [ ] Device management
- [ ] Security alerts
- [ ] Session analytics
- [ ] Advanced permission system

## Success Metrics

- [ ] All protected routes require authentication
- [ ] Session management is seamless
- [ ] No authentication loops or errors
- [ ] Fast page loads with cached sessions
- [ ] Smooth user experience across the app

## Timeline

Total estimated time: **1-2 hours**

1. Route restructuring: 15 minutes
2. Auth guard implementation: 20 minutes
3. Auth page updates: 10 minutes
4. Client session setup: 15 minutes
5. Error handling: 10 minutes
6. Testing and refinement: 30-60 minutes

---

*This plan focuses on simplicity and security while leveraging Better Auth's built-in features and SvelteKit's native patterns.* 