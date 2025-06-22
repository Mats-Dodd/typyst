import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId } from '$lib/server/db';
import { entry } from '@haptic/db';
import { eq, and, like, ilike } from 'drizzle-orm';
import { z } from 'zod';

const searchSchema = z.object({
	collection: z.string().min(1),
	query: z.string().min(1).max(100),
	caseSensitive: z.enum(['true', 'false']).optional().default('false')
});

export const GET = async (event: RequestEvent) => {
	const userId = await getUserId(event);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const params = Object.fromEntries(event.url.searchParams);
	const parsed = searchSchema.safeParse(params);

	if (!parsed.success) {
		return json(
			{ error: 'Invalid query parameters', details: parsed.error.flatten() },
			{ status: 400 }
		);
	}

	const { collection: collectionPath, query, caseSensitive } = parsed.data;
	const isCaseSensitive = caseSensitive === 'true';

	try {
		const searchOp = isCaseSensitive ? like : ilike;

		const results = await db
			.select({
				id: entry.id,
				path: entry.path,
				name: entry.name,
				snippet: entry.content
			})
			.from(entry)
			.where(
				and(
					eq(entry.userId, userId),
					like(entry.path, `${collectionPath}%`),
					searchOp(entry.content, `%${query}%`),
					eq(entry.isFolder, false)
				)
			)
			.limit(50);

		const resultsWithSnippets = results.map((r) => ({
			...r,
			snippet: r.snippet?.substring(0, 150) || ''
		}));

		return json(resultsWithSnippets);
	} catch (error) {
		console.error('Error searching entries:', error);
		return json({ error: 'Failed to search entries' }, { status: 500 });
	}
};
