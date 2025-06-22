import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId, schema, verifyUserOwnership } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';

export const GET = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { id } = event.params;

		if (!id) {
			return json({ error: 'Collection ID is required' }, { status: 400 });
		}

		await verifyUserOwnership(userId, id, schema.collection);

		const entries = await db.select().from(schema.entry).where(eq(schema.entry.collectionId, id));

		return json({ entries }, { status: 200 });
	} catch (error) {
		return json({ error: 'Failed to fetch entries' }, { status: 500 });
	}
};

export const POST = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { collectionId } = event.params;

		if (!collectionId) {
			return json({ error: 'Collection ID is required' }, { status: 400 });
		}

		await verifyUserOwnership(userId, collectionId, schema.collection);

		const { path, name, parentPath, content, isFolder, size } = await event.request.json();

		const [newEntry] = await db
			.insert(schema.entry)
			.values({
				userId,
				collectionId,
				path,
				name,
				parentPath,
				content,
				isFolder,
				size
			})
			.returning();

		return json({ entry: newEntry }, { status: 201 });
	} catch (error) {
		return json({ error: 'Failed to create entry' }, { status: 500 });
	}
};
