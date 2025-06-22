import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId, schema, verifyUserOwnership } from '$lib/server/db';
import { eq, and, desc, isNotNull } from 'drizzle-orm';

export const GET = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const url = new URL(event.request.url);
		const collectionId = url.searchParams.get('collectionId');
		const limit = parseInt(url.searchParams.get('limit') || '10', 10);

		// Validate limit
		if (limit < 1 || limit > 50) {
			return json(
				{ error: 'Limit must be between 1 and 50', code: 'VALIDATION_ERROR' },
				{ status: 400 }
			);
		}

		if (collectionId) {
			await verifyUserOwnership(userId, collectionId, schema.collection);
		}

		// Build where condition - only include non-folder entries
		const baseCondition = and(
			eq(schema.entry.userId, userId),
			eq(schema.entry.isFolder, false),
			isNotNull(schema.entry.name)
		);

		const whereCondition = collectionId
			? and(baseCondition, eq(schema.entry.collectionId, collectionId))
			: baseCondition;

		// Fetch recent entries ordered by updatedAt
		const recentEntries = await db
			.select({
				id: schema.entry.id,
				collectionId: schema.entry.collectionId,
				path: schema.entry.path,
				name: schema.entry.name,
				parentPath: schema.entry.parentPath,
				updatedAt: schema.entry.updatedAt,
				createdAt: schema.entry.createdAt
			})
			.from(schema.entry)
			.where(whereCondition)
			.orderBy(desc(schema.entry.updatedAt))
			.limit(limit);

		return json({ entries: recentEntries }, { status: 200 });
	} catch (error) {
		console.error('Failed to fetch recent entries:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}
			if (error.message === 'Resource not found or access denied') {
				return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
			}
		}

		return json({ error: 'Failed to fetch recent entries', code: 'FETCH_ERROR' }, { status: 500 });
	}
};
