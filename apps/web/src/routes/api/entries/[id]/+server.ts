import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId, schema, verifyUserOwnership } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import base64 from 'base64-js';

const validateEntryPath = (path: string): string | null => {
	if (!path || typeof path !== 'string') {
		return 'Path is required';
	}
	if (path.length > 500) {
		return 'Path is too long (max 500 characters)';
	}
	if (path.includes('\0')) {
		return 'Path contains invalid characters';
	}
	return null;
};

const validateEntryName = (name: string | null | undefined): string | null => {
	if (name === null || name === undefined) {
		return null;
	}
	if (typeof name !== 'string') {
		return 'Name must be a string';
	}
	if (name.length > 255) {
		return 'Name is too long (max 255 characters)';
	}
	return null;
};

export const GET = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { id } = event.params;

		if (!id) {
			return json({ error: 'Entry ID is required' }, { status: 400 });
		}

		const [entry] = await db
			.select()
			.from(schema.entry)
			.where(and(eq(schema.entry.id, id), eq(schema.entry.userId, userId)));

		if (!entry) {
			return json({ error: 'Entry not found', code: 'NOT_FOUND' }, { status: 404 });
		}

		// Convert loroSnapshot Buffer to array for JSON serialization
		const response = {
			...entry,
			loroSnapshot: entry.loroSnapshot ? Array.from(entry.loroSnapshot as Buffer) : null
		};

		return json(response, { status: 200 });
	} catch (error) {
		console.error('Failed to fetch entry:', error);

		if (error instanceof Error && error.message === 'User not authenticated') {
			return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
		}

		return json({ error: 'Failed to fetch entry', code: 'FETCH_ERROR' }, { status: 500 });
	}
};

export const PUT = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { id } = event.params;

		if (!id) {
			return json({ error: 'Entry ID is required' }, { status: 400 });
		}

		const [existingEntry] = await db
			.select()
			.from(schema.entry)
			.where(and(eq(schema.entry.id, id), eq(schema.entry.userId, userId)));

		if (!existingEntry) {
			return json({ error: 'Entry not found', code: 'NOT_FOUND' }, { status: 404 });
		}

		const body = await event.request.json();
		const updateData: Partial<{
			path: string;
			name: string | null;
			parentPath: string;
			content: string | null;
			isFolder: boolean;
			size: number | null;
			loroSnapshot: Buffer | null;
		}> = {};

		if ('path' in body) {
			const pathError = validateEntryPath(body.path);
			if (pathError) {
				return json({ error: pathError, code: 'VALIDATION_ERROR' }, { status: 400 });
			}
			updateData.path = body.path.trim();
		}

		if ('name' in body) {
			const nameError = validateEntryName(body.name);
			if (nameError) {
				return json({ error: nameError, code: 'VALIDATION_ERROR' }, { status: 400 });
			}
			updateData.name = body.name?.trim() || null;
		}

		if ('parentPath' in body) {
			if (!body.parentPath || typeof body.parentPath !== 'string') {
				return json(
					{ error: 'Parent path must be a string', code: 'VALIDATION_ERROR' },
					{ status: 400 }
				);
			}
			updateData.parentPath = body.parentPath.trim();
		}

		if ('content' in body) {
			updateData.content = body.content || null;
		}

		if ('isFolder' in body) {
			if (typeof body.isFolder !== 'boolean') {
				return json(
					{ error: 'isFolder must be a boolean', code: 'VALIDATION_ERROR' },
					{ status: 400 }
				);
			}
			updateData.isFolder = body.isFolder;
		}

		if ('size' in body) {
			if (body.size !== null && (typeof body.size !== 'number' || body.size < 0)) {
				return json(
					{ error: 'Size must be a positive number or null', code: 'VALIDATION_ERROR' },
					{ status: 400 }
				);
			}
			updateData.size = body.size;
		}

		if ('loroSnapshot' in body) {
			if (!body.loroSnapshot || typeof body.loroSnapshot !== 'string') {
				return json(
					{ error: 'loroSnapshot must be a base64 encoded string', code: 'VALIDATION_ERROR' },
					{ status: 400 }
				);
			}
			try {
				const snapshot = base64.toByteArray(body.loroSnapshot);
				updateData.loroSnapshot = Buffer.from(snapshot);
			} catch (error) {
				return json(
					{ error: 'Invalid base64 encoding for loroSnapshot', code: 'VALIDATION_ERROR' },
					{ status: 400 }
				);
			}
		}

		if (Object.keys(updateData).length === 0) {
			return json(
				{ error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
				{ status: 400 }
			);
		}

		const [updatedEntry] = await db
			.update(schema.entry)
			.set(updateData)
			.where(eq(schema.entry.id, id))
			.returning();

		// Convert loroSnapshot Buffer to array for JSON serialization
		const response = {
			...updatedEntry,
			loroSnapshot: updatedEntry.loroSnapshot ? Array.from(updatedEntry.loroSnapshot as Buffer) : null
		};

		return json(response, { status: 200 });
	} catch (error) {
		console.error('Failed to update entry:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}

			if ('code' in error && error.code === '23505') {
				return json(
					{ error: 'An entry with this path already exists', code: 'DUPLICATE_ERROR' },
					{ status: 409 }
				);
			}
		}

		return json({ error: 'Failed to update entry', code: 'UPDATE_ERROR' }, { status: 500 });
	}
};

export const DELETE = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { id } = event.params;

		if (!id) {
			return json({ error: 'Entry ID is required' }, { status: 400 });
		}

		const [existingEntry] = await db
			.select()
			.from(schema.entry)
			.where(and(eq(schema.entry.id, id), eq(schema.entry.userId, userId)));

		if (!existingEntry) {
			return json({ error: 'Entry not found', code: 'NOT_FOUND' }, { status: 404 });
		}

		if (existingEntry.isFolder) {
			const [childEntry] = await db
				.select({ id: schema.entry.id })
				.from(schema.entry)
				.where(
					and(eq(schema.entry.userId, userId), eq(schema.entry.parentPath, existingEntry.path))
				)
				.limit(1);

			if (childEntry) {
				return json(
					{ error: 'Cannot delete folder with contents', code: 'FOLDER_NOT_EMPTY' },
					{ status: 400 }
				);
			}
		}

		await db.delete(schema.entry).where(eq(schema.entry.id, id));

		return json({ success: true }, { status: 200 });
	} catch (error) {
		console.error('Failed to delete entry:', error);

		if (error instanceof Error && error.message === 'User not authenticated') {
			return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
		}

		return json({ error: 'Failed to delete entry', code: 'DELETE_ERROR' }, { status: 500 });
	}
};
