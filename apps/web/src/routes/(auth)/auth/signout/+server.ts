import { auth } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	try {
		await auth.api.signOut({
			headers: request.headers
		});
	} catch (error) {
		console.error('Sign out error:', error);
	}

	// Redirect to signin page after sign out
	redirect(302, '/auth/signin');
};
