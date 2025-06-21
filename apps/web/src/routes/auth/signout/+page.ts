import { authClient } from '$lib/auth-client';
import { redirect } from '@sveltejs/kit';

export async function load() {
	try {
		await authClient.signOut();
	} catch (error) {
		console.error('Sign out error:', error);
	}

	// Redirect to homepage after sign out
	throw redirect(302, '/');
}
