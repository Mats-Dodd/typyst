import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ request, url, cookies }) => {
	try {
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
	} catch (error) {
		// Log error for monitoring
		console.error('Session validation error:', error);

		// Clear any stale cookies
		cookies.delete('better-auth.session_token', { path: '/' });

		// Redirect to login
		const redirectTo = url.pathname + url.search;
		redirect(303, `/auth/signin?redirectTo=${encodeURIComponent(redirectTo)}`);
	}
};
