import { authClient } from '$lib/auth-client';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		await authClient.signOut();
	} catch (error) {
		console.error('Sign out error:', error);
	}

	// Redirect to homepage after sign out
	throw redirect(302, 'http://localhost:5173');
};
