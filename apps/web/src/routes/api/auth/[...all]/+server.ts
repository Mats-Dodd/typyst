import { auth } from '$lib/auth';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ request, url }) => {
	return auth.handler(request);
};

export const POST: RequestHandler = async ({ request, url, cookies }) => {
	try {
		const response = await auth.handler(request);

		// If the response is successful and contains a session token, log it
		if (response.status === 200) {
			const clonedResponse = response.clone();
			const body = await clonedResponse.json();
		}

		return response;
	} catch (error) {
		console.error('[Auth API] Error:', error);
		throw error;
	}
};
