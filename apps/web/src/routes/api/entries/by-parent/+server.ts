import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId } from '$lib/server/db';
import { entry } from '@haptic/db';
import { eq, and, or, desc } from 'drizzle-orm';
import { z } from 'zod';

const querySchema = z.object({
	path: z.string().min(1)
});

export const GET = async (event: RequestEvent) => {
	const userId = await getUserId(event);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const params = Object.fromEntries(event.url.searchParams);
	const parsed = querySchema.safeParse(params);

	if (!parsed.success) {
		return json(
			{ error: 'Invalid query parameters', details: parsed.error.flatten() },
			{ status: 400 }
		);
	}

	const { path: parentPath } = parsed.data;

	try {
		const results = await db
			.select()
			.from(entry)
			.where(
				and(
					eq(entry.userId, userId),
					or(eq(entry.parentPath, parentPath), eq(entry.path, parentPath))
				)
			)
			.orderBy(desc(entry.isFolder), entry.name);

		return json(results);
	} catch (error) {
		console.error('Error fetching entries by parent:', error);
		return json({ error: 'Failed to fetch entries' }, { status: 500 });
	}
};
