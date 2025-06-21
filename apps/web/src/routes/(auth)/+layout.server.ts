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
