import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId } from '$lib/server/db';
import { collection } from '@haptic/db';
import { eq, desc } from 'drizzle-orm';

export const GET = async (event: RequestEvent) => {
	const userId = await getUserId(event);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const result = await db
			.select({ path: collection.path })
			.from(collection)
			.where(eq(collection.userId, userId))
			.orderBy(desc(collection.lastOpened))
			.limit(1);

		if (result.length === 0) {
			return json(null);
		}

		return json({ path: result[0].path });
	} catch (error) {
		console.error('Error fetching latest collection:', error);
		return json({ error: 'Failed to fetch latest collection' }, { status: 500 });
	}
};
