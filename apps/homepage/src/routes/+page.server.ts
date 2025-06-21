import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Get authentication data from parent layout
	const { isAuthenticated, user } = await parent();

	return {
		isAuthenticated,
		user
	};
};
