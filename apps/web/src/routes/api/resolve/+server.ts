import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId } from '$lib/server/db';
import { entry } from '@haptic/db';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';

const resolveSchema = z.object({
	paths: z.array(z.string()).min(1).max(100)
});

export const POST = async (event: RequestEvent) => {
	const userId = await getUserId(event);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await event.request.json();
	const parsed = resolveSchema.safeParse(body);

	if (!parsed.success) {
		return json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
	}

	const { paths } = parsed.data;

	try {
		const results = await db
			.select({ path: entry.path, id: entry.id })
			.from(entry)
			.where(and(eq(entry.userId, userId), inArray(entry.path, paths)));

		const mappings = results.reduce(
			(acc, { path, id }) => {
				acc[path] = id;
				return acc;
			},
			{} as Record<string, string>
		);

		return json({ mappings });
	} catch (error) {
		console.error('Error resolving paths:', error);
		return json({ error: 'Failed to resolve paths' }, { status: 500 });
	}
};
