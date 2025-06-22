import { db } from '@haptic/db';
import * as schema from '@haptic/db';
import type { RequestEvent } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { and, eq } from 'drizzle-orm';

export { db, schema };

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

	return true;
}
