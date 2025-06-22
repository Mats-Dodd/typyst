import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId, schema } from '$lib/server/db';
import { eq, desc, and } from 'drizzle-orm';
import {
	DEFAULT_COLLECTION_SETTINGS,
	validateCollectionName,
	validateCollectionPath
} from '$lib/constants/collection-defaults';

export const GET = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const path = event.url.searchParams.get('path');

		let query = db
			.select({
				collection: schema.collection,
				settings: schema.collectionSettings
			})
			.from(schema.collection)
			.leftJoin(
				schema.collectionSettings,
				eq(schema.collection.id, schema.collectionSettings.collectionId)
			)
			.where(eq(schema.collection.userId, userId))
			.orderBy(desc(schema.collection.lastOpened));

		// If path is provided, filter by it
		if (path) {
			query = db
				.select({
					collection: schema.collection,
					settings: schema.collectionSettings
				})
				.from(schema.collection)
				.leftJoin(
					schema.collectionSettings,
					eq(schema.collection.id, schema.collectionSettings.collectionId)
				)
				.where(and(eq(schema.collection.userId, userId), eq(schema.collection.path, path)))
				.orderBy(desc(schema.collection.lastOpened));
		}

		const collectionsWithSettings = await query;

		const collections = collectionsWithSettings.map(({ collection, settings }) => ({
			...collection,
			settings: settings || null
		}));

		return json({ collections }, { status: 200 });
	} catch (error) {
		console.error('Failed to fetch collections:', error);

		if (error instanceof Error && error.message === 'User not authenticated') {
			return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
		}

		return json({ error: 'Failed to fetch collections', code: 'FETCH_ERROR' }, { status: 500 });
	}
};

export const POST = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { path, name } = await event.request.json();

		const pathError = validateCollectionPath(path);
		if (pathError) {
			return json({ error: pathError, code: 'VALIDATION_ERROR' }, { status: 400 });
		}

		const collectionName = name || path.split('/').pop() || 'Untitled';

		const nameError = validateCollectionName(collectionName);
		if (nameError) {
			return json({ error: nameError, code: 'VALIDATION_ERROR' }, { status: 400 });
		}

		const result = await db.transaction(async (tx) => {
			const [newCollection] = await tx
				.insert(schema.collection)
				.values({
					userId,
					path: path.trim(),
					name: collectionName.trim(),
					lastOpened: new Date()
				})
				.returning();

			const [newSettings] = await tx
				.insert(schema.collectionSettings)
				.values({
					collectionId: newCollection.id,
					editor: DEFAULT_COLLECTION_SETTINGS.editor,
					notes: DEFAULT_COLLECTION_SETTINGS.notes
				})
				.returning();

			return { collection: newCollection, settings: newSettings };
		});

		return json(result, { status: 201 });
	} catch (error) {
		console.error('Failed to create collection:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}

			if ('code' in error && error.code === '23505') {
				return json(
					{ error: 'A collection with this path already exists', code: 'DUPLICATE_ERROR' },
					{ status: 409 }
				);
			}
		}

		return json({ error: 'Failed to create collection', code: 'CREATE_ERROR' }, { status: 500 });
	}
};
