import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
	baseURL:
		process.env.NODE_ENV === 'production'
			? process.env.PUBLIC_APP_URL || 'https://haptic.app'
			: 'http://localhost:5173',
	basePath: '/api/auth'
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
