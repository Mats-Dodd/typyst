import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
	baseURL:
		process.env.NODE_ENV === 'production'
			? process.env.PUBLIC_WEB_APP_URL || 'https://app.haptic.app'
			: 'http://localhost:5173', // Point to web app for auth
	basePath: '/api/auth'
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
