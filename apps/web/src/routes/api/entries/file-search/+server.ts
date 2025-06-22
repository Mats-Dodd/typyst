import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId, schema, verifyUserOwnership } from '$lib/server/db';
import { eq, and, or, ilike, desc, sql } from 'drizzle-orm';

// Helper function to create fuzzy search pattern
const createFuzzyPattern = (query: string): string => {
	// Escape special SQL pattern characters
	const escaped = query.replace(/[_%\\]/g, '\\$&');
	// Add % between each character for fuzzy matching
	return '%' + escaped.split('').join('%') + '%';
};

// Helper function to calculate a simple relevance score
const calculateRelevanceScore = (path: string, name: string | null, query: string): number => {
	const lowerQuery = query.toLowerCase();
	const lowerPath = path.toLowerCase();
	const lowerName = (name || '').toLowerCase();

	let score = 0;

	// Exact match in name gets highest score
	if (lowerName === lowerQuery) score += 1000;
	// Name starts with query
	else if (lowerName.startsWith(lowerQuery)) score += 500;
	// Name contains query
	else if (lowerName.includes(lowerQuery)) score += 200;

	// Path exact match
	if (lowerPath === lowerQuery) score += 800;
	// Path ends with query (filename match)
	else if (lowerPath.endsWith('/' + lowerQuery)) score += 400;
	// Path contains query
	else if (lowerPath.includes(lowerQuery)) score += 100;

	// Boost for shorter paths (less nested)
	const depth = path.split('/').length;
	score += Math.max(0, 10 - depth);

	return score;
};

export const GET = async (event: RequestEvent) => {
	try {
		const userId = await getUserId(event);
		const url = new URL(event.request.url);
		const query = url.searchParams.get('q') || '';
		const collectionId = url.searchParams.get('collectionId');
		const limit = parseInt(url.searchParams.get('limit') || '20', 10);

		// Validate inputs
		if (!query || query.length < 1) {
			return json(
				{ error: 'Query must be at least 1 character', code: 'VALIDATION_ERROR' },
				{ status: 400 }
			);
		}

		if (query.length > 100) {
			return json(
				{ error: 'Query is too long (max 100 characters)', code: 'VALIDATION_ERROR' },
				{ status: 400 }
			);
		}

		if (limit < 1 || limit > 100) {
			return json(
				{ error: 'Limit must be between 1 and 100', code: 'VALIDATION_ERROR' },
				{ status: 400 }
			);
		}

		if (collectionId) {
			await verifyUserOwnership(userId, collectionId, schema.collection);
		}

		// Create fuzzy search pattern
		const fuzzyPattern = createFuzzyPattern(query);

		// Build search condition - search in both name and path
		const searchCondition = or(
			ilike(schema.entry.name, fuzzyPattern),
			ilike(schema.entry.path, fuzzyPattern)
		);

		// Build where condition - only include non-folder entries
		const baseCondition = and(
			eq(schema.entry.userId, userId),
			eq(schema.entry.isFolder, false),
			searchCondition
		);

		const whereCondition = collectionId
			? and(baseCondition, eq(schema.entry.collectionId, collectionId))
			: baseCondition;

		// Fetch matching entries
		const searchResults = await db
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
			.limit(limit * 2); // Fetch more than needed for scoring

		// Calculate relevance scores and sort
		const scoredResults = searchResults
			.map((entry) => ({
				...entry,
				score: calculateRelevanceScore(entry.path, entry.name, query)
			}))
			.sort((a, b) => b.score - a.score)
			.slice(0, limit);

		// Remove score from final results
		const finalResults = scoredResults.map(({ score, ...entry }) => entry);

		return json({ entries: finalResults, query }, { status: 200 });
	} catch (error) {
		console.error('Failed to search entries:', error);

		if (error instanceof Error) {
			if (error.message === 'User not authenticated') {
				return json({ error: 'Authentication required', code: 'AUTH_ERROR' }, { status: 401 });
			}
			if (error.message === 'Resource not found or access denied') {
				return json({ error: 'Collection not found', code: 'NOT_FOUND' }, { status: 404 });
			}
		}

		return json({ error: 'Failed to search entries', code: 'SEARCH_ERROR' }, { status: 500 });
	}
};
