import { useSession } from '$lib/auth-client';
import { get } from 'svelte/store';

// The session is reactive and automatically updates
export const session = useSession;

// Helper functions
export function isAuthenticated() {
	const $session = get(useSession);
	return !!$session.data;
}

export function getUser() {
	const $session = get(useSession);
	return $session.data?.user;
}
