import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@haptic/db';
import { DATABASE_URL } from '$env/static/private';
import type { RequestEvent } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { and, eq } from 'drizzle-orm';

const client = postgres(DATABASE_URL, {
	prepare: false
});

export const db = drizzle(client, { schema });

export { schema };

export async function getUserId(event: RequestEvent): Promise<string> {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (!session?.user?.id) {
		throw new Error('User not authenticated');
	}

	return session.user.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function verifyUserOwnership(userId: string, resourceId: string, table: any) {
	const [resource] = await db
		.select()
		.from(table)
		.where(and(eq(table.id, resourceId), eq(table.userId, userId)))
		.limit(1);

	if (!resource) {
		throw new Error('Resource not found or access denied');
	}

	return resource;
}
