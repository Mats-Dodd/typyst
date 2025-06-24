import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId, schema, verifyUserOwnership } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';

export const GET = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { id } = event.params;

		if (!id) {
			return json({ error: 'Collection ID is required' }, { status: 400 });
		}

		await verifyUserOwnership(userId, id, schema.collection);

		// Get collection info
		const [collection] = await db
			.select()
			.from(schema.collection)
			.where(eq(schema.collection.id, id));

		if (!collection) {
			return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
		}

		// Get entry counts
		const entriesResult = await db
			.select({ id: schema.entry.id, isFolder: schema.entry.isFolder })
			.from(schema.entry)
			.where(eq(schema.entry.collectionId, id));

		const entryStats = {
			totalEntries: entriesResult.length,
			folders: entriesResult.filter((e) => e.isFolder === true).length,
			notes: entriesResult.filter((e) => e.isFolder === false || e.isFolder === null).length
		};

		return json({
			collection: {
				id: collection.id,
				name: collection.name,
				path: collection.path,
				lastOpened: collection.lastOpened,
				createdAt: collection.createdAt
			},
			stats: {
				total: entryStats.totalEntries,
				folders: entryStats.folders,
				notes: entryStats.notes
			}
		}, { status: 200 });
	} catch (error) {
		console.error('Failed to fetch collection stats:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}

			if (error.message === 'Resource not found or access denied') {
				return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
			}
		}

		return json({ error: 'Failed to fetch collection stats', code: 'FETCH_ERROR' }, { status: 500 });
	}
};