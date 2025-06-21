import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId, schema, verifyUserOwnership } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { DEFAULT_COLLECTION_SETTINGS } from '$lib/constants/collection-defaults';
import type { CollectionSettingsParams } from '$lib/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
	const result = { ...target };

	for (const key in source) {
		if (source[key] !== undefined) {
			if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
				result[key] = deepMerge(result[key] || ({} as any), source[key] as any);
			} else {
				result[key] = source[key] as any;
			}
		}
	}

	return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const GET = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { id } = event.params;

		if (!id) {
			return json({ error: 'Collection ID is required' }, { status: 400 });
		}

		await verifyUserOwnership(userId, id, schema.collection);

		const [settings] = await db
			.select()
			.from(schema.collectionSettings)
			.where(eq(schema.collectionSettings.collectionId, id));

		if (!settings) {
			const [newSettings] = await db
				.insert(schema.collectionSettings)
				.values({
					collectionId: id,
					editor: DEFAULT_COLLECTION_SETTINGS.editor,
					notes: DEFAULT_COLLECTION_SETTINGS.notes
				})
				.returning();

			return json(newSettings, { status: 200 });
		}

		return json(settings, { status: 200 });
	} catch (error) {
		console.error('Failed to fetch collection settings:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}

			if (error.message === 'Resource not found or access denied') {
				return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
			}
		}

		return json(
			{ error: 'Failed to fetch collection settings', code: 'FETCH_ERROR' },
			{ status: 500 }
		);
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

		const updates = await event.request.json();

		const [currentSettings] = await db
			.select()
			.from(schema.collectionSettings)
			.where(eq(schema.collectionSettings.collectionId, id));

		if (!currentSettings) {
			const newSettings: CollectionSettingsParams = {
				editor: DEFAULT_COLLECTION_SETTINGS.editor,
				notes: DEFAULT_COLLECTION_SETTINGS.notes
			};

			if (updates.editor) {
				newSettings.editor = deepMerge(newSettings.editor, updates.editor);
			}
			if (updates.notes) {
				newSettings.notes = deepMerge(newSettings.notes, updates.notes);
			}

			const [createdSettings] = await db
				.insert(schema.collectionSettings)
				.values({
					collectionId: id,
					editor: newSettings.editor,
					notes: newSettings.notes
				})
				.returning();

			return json(createdSettings, { status: 200 });
		}

		const updatedData: Partial<CollectionSettingsParams> = {};

		if (updates.editor) {
			updatedData.editor = deepMerge(
				currentSettings.editor as CollectionSettingsParams['editor'],
				updates.editor
			);
		}

		if (updates.notes) {
			updatedData.notes = deepMerge(
				currentSettings.notes as CollectionSettingsParams['notes'],
				updates.notes
			);
		}

		if (Object.keys(updatedData).length === 0) {
			return json(
				{ error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
				{ status: 400 }
			);
		}

		const [updatedSettings] = await db
			.update(schema.collectionSettings)
			.set(updatedData)
			.where(eq(schema.collectionSettings.collectionId, id))
			.returning();

		return json(updatedSettings, { status: 200 });
	} catch (error) {
		console.error('Failed to update collection settings:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}

			if (error.message === 'Resource not found or access denied') {
				return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
			}
		}

		return json(
			{ error: 'Failed to update collection settings', code: 'UPDATE_ERROR' },
			{ status: 500 }
		);
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

		const [resetSettings] = await db
			.update(schema.collectionSettings)
			.set({
				editor: DEFAULT_COLLECTION_SETTINGS.editor,
				notes: DEFAULT_COLLECTION_SETTINGS.notes
			})
			.where(eq(schema.collectionSettings.collectionId, id))
			.returning();

		if (!resetSettings) {
			const [newSettings] = await db
				.insert(schema.collectionSettings)
				.values({
					collectionId: id,
					editor: DEFAULT_COLLECTION_SETTINGS.editor,
					notes: DEFAULT_COLLECTION_SETTINGS.notes
				})
				.returning();

			return json(newSettings, { status: 200 });
		}

		return json(resetSettings, { status: 200 });
	} catch (error) {
		console.error('Failed to reset collection settings:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}

			if (error.message === 'Resource not found or access denied') {
				return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
			}
		}

		return json(
			{ error: 'Failed to reset collection settings', code: 'RESET_ERROR' },
			{ status: 500 }
		);
	}
};
