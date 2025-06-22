import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId, schema, verifyUserOwnership } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';

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
		const url = new URL(event.request.url);
		const collectionId = url.searchParams.get('collectionId');

		if (collectionId) {
			await verifyUserOwnership(userId, collectionId, schema.collection);
		}

		const whereCondition = collectionId
			? and(eq(schema.entry.userId, userId), eq(schema.entry.collectionId, collectionId))
			: eq(schema.entry.userId, userId);

		const entries = await db
			.select()
			.from(schema.entry)
			.where(whereCondition)
			.orderBy(desc(schema.entry.updatedAt));

		return json({ entries }, { status: 200 });
	} catch (error) {
		console.error('Failed to fetch entries:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}
			if (error.message === 'Resource not found or access denied') {
				return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
			}
		}

		return json({ error: 'Failed to fetch entries', code: 'FETCH_ERROR' }, { status: 500 });
	}
};

export const POST = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const { collectionId, path, name, parentPath, content, isFolder, size } =
			await event.request.json();

		if (!collectionId) {
			return json(
				{ error: 'Collection ID is required', code: 'VALIDATION_ERROR' },
				{ status: 400 }
			);
		}

		await verifyUserOwnership(userId, collectionId, schema.collection);

		const pathError = validateEntryPath(path);
		if (pathError) {
			return json({ error: pathError, code: 'VALIDATION_ERROR' }, { status: 400 });
		}

		const nameError = validateEntryName(name);
		if (nameError) {
			return json({ error: nameError, code: 'VALIDATION_ERROR' }, { status: 400 });
		}

		if (!parentPath || typeof parentPath !== 'string') {
			return json({ error: 'Parent path is required', code: 'VALIDATION_ERROR' }, { status: 400 });
		}

		if (isFolder !== undefined && typeof isFolder !== 'boolean') {
			return json(
				{ error: 'isFolder must be a boolean', code: 'VALIDATION_ERROR' },
				{ status: 400 }
			);
		}

		if (size !== undefined && size !== null && (typeof size !== 'number' || size < 0)) {
			return json(
				{ error: 'Size must be a positive number', code: 'VALIDATION_ERROR' },
				{ status: 400 }
			);
		}

		const [newEntry] = await db
			.insert(schema.entry)
			.values({
				userId,
				collectionId,
				path: path.trim(),
				name: name?.trim() || null,
				parentPath: parentPath.trim(),
				content: content || null,
				isFolder: isFolder || false,
				size: size || null
			})
			.returning();

		return json(newEntry, { status: 201 });
	} catch (error) {
		console.error('Failed to create entry:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}
			if (error.message === 'Resource not found or access denied') {
				return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
			}

			if ('code' in error && error.code === '23505') {
				return json(
					{ error: 'An entry with this path already exists', code: 'DUPLICATE_ERROR' },
					{ status: 409 }
				);
			}
		}

		return json({ error: 'Failed to create entry', code: 'CREATE_ERROR' }, { status: 500 });
	}
};
