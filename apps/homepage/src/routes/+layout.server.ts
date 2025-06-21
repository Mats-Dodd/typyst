import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, fetch }) => {
	try {
		// Get the session cookie that would be set by the web app
		const sessionToken = cookies.get('better-auth.session_token');

		if (!sessionToken) {
			return {
				isAuthenticated: false,
				user: null
			};
		}

		// Make a request to the web app to verify the session
		const webAppURL = process.env.WEB_APP_URL || 'http://localhost:5173';
		const response = await fetch(`${webAppURL}/api/auth/session`, {
			headers: {
				Cookie: `better-auth.session_token=${sessionToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			const sessionData = await response.json();
			return {
				isAuthenticated: !!sessionData.user,
				user: sessionData.user || null
			};
		}
	} catch (error) {
		console.error('Failed to check authentication status:', error);
	}

	return {
		isAuthenticated: false,
		user: null
	};
};
