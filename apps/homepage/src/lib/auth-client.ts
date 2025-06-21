import { createAuthClient } from 'better-auth/client';

const getWebAppURL = () => {
	if (typeof window !== 'undefined') {
		// Client-side - make requests to web app
		return process.env.NODE_ENV === 'production'
			? 'https://app.haptic.app'
			: 'http://localhost:5173'; // Web app dev server
	}
	// Server-side - use environment variable or default
	return process.env.WEB_APP_URL || 'http://localhost:5173';
};

export const authClient = createAuthClient({
	baseURL: getWebAppURL(),
	basePath: '/api/auth',
	fetchOptions: {
		credentials: 'include' // Include cookies for cross-origin requests
	}
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
