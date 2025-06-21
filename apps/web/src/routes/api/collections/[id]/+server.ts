import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId, schema, verifyUserOwnership } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { validateCollectionName, validateCollectionPath } from '$lib/constants/collection-defaults';

export const GET = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { id } = event.params;

		if (!id) {
			return json({ error: 'Collection ID is required' }, { status: 400 });
		}

		const result = await db
			.select({
				collection: schema.collection,
				settings: schema.collectionSettings
			})
			.from(schema.collection)
			.leftJoin(
				schema.collectionSettings,
				eq(schema.collection.id, schema.collectionSettings.collectionId)
			)
			.where(and(eq(schema.collection.id, id), eq(schema.collection.userId, userId)));

		if (result.length === 0) {
			return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
		}

		const { collection, settings } = result[0];

		return json(
			{
				...collection,
				settings: settings || null
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Failed to fetch collection:', error);

		if (error instanceof Error && error.message === 'User not authenticated') {
			return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
		}

		return json({ error: 'Failed to fetch collection', code: 'FETCH_ERROR' }, { status: 500 });
	}
};

export const PUT = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { id } = event.params;

		if (!id) {
			return json({ error: 'Collection ID is required' }, { status: 400 });
		}

		await verifyUserOwnership(userId, id, schema.collection);

		const body = await event.request.json();
		const updateData: Partial<{ name: string; path: string }> = {};

		// Validate and add name if provided
		if ('name' in body) {
			const nameError = validateCollectionName(body.name);
			if (nameError) {
				return json({ error: nameError, code: 'VALIDATION_ERROR' }, { status: 400 });
			}
			updateData.name = body.name.trim();
		}

		// Validate and add path if provided
		if ('path' in body) {
			const pathError = validateCollectionPath(body.path);
			if (pathError) {
				return json({ error: pathError, code: 'VALIDATION_ERROR' }, { status: 400 });
			}
			updateData.path = body.path.trim();
		}

		// Check if there's anything to update
		if (Object.keys(updateData).length === 0) {
			return json(
				{ error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
				{ status: 400 }
			);
		}

		// Update lastOpened whenever collection is modified
		const [updatedCollection] = await db
			.update(schema.collection)
			.set({
				...updateData,
				lastOpened: new Date()
			})
			.where(eq(schema.collection.id, id))
			.returning();

		// Fetch the settings as well
		const [settings] = await db
			.select()
			.from(schema.collectionSettings)
			.where(eq(schema.collectionSettings.collectionId, id));

		return json(
			{
				...updatedCollection,
				settings: settings || null
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Failed to update collection:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}

			if (error.message === 'Resource not found or access denied') {
				return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
			}

			// Check for unique constraint violation
			if ('code' in error && error.code === '23505') {
				return json(
					{ error: 'A collection with this path already exists', code: 'DUPLICATE_ERROR' },
					{ status: 409 }
				);
			}
		}

		return json({ error: 'Failed to update collection', code: 'UPDATE_ERROR' }, { status: 500 });
	}
};

export const DELETE = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { id } = event.params;

		if (!id) {
			return json({ error: 'Collection ID is required' }, { status: 400 });
		}

		await verifyUserOwnership(userId, id, schema.collection);

		// Settings will be cascade deleted due to foreign key constraint
		await db.delete(schema.collection).where(eq(schema.collection.id, id));

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Failed to delete collection:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}

			if (error.message === 'Resource not found or access denied') {
				return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
			}
		}

		return json({ error: 'Failed to delete collection', code: 'DELETE_ERROR' }, { status: 500 });
	}
};
