import { json, type RequestEvent } from '@sveltejs/kit';
import { db, getUserId } from '$lib/server/db';
import { entry } from '@haptic/db';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const searchSchema = z.object({
	collection: z.string().min(1),
	query: z.string().min(1).max(100),
	caseSensitive: z.enum(['true', 'false']).optional().default('false'),
	matchWord: z.enum(['true', 'false']).optional().default('false')
});

type SearchResult = {
	path: string;
	context_preview: string;
};

export const GET = async (event: RequestEvent) => {
	const userId = await getUserId(event);
	if (!userId) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const params = Object.fromEntries(event.url.searchParams);
	const parsed = searchSchema.safeParse(params);

	if (!parsed.success) {
		return json(
			{ error: 'Invalid query parameters', details: parsed.error.flatten() },
			{ status: 400 }
		);
	}

	const { collection: collectionPath, query, caseSensitive, matchWord } = parsed.data;
	const isCaseSensitive = caseSensitive === 'true';
	const isMatchWord = matchWord === 'true';

	try {
		// Escape single quotes in the query for SQL
		const escapedQuery = query.replace(/'/g, "''");
		const wordBoundary = isMatchWord ? ' ' : '';
		const searchPattern = `%${wordBoundary}${escapedQuery}${wordBoundary}%`;

		// Use raw SQL to match the exact functionality of the original searchEntries
		const likeOperator = isCaseSensitive ? 'LIKE' : 'ILIKE';

		const results = await db
			.select({
				path: entry.path,
				content: entry.content
			})
			.from(entry)
			.where(
				and(
					eq(entry.userId, userId),
					eq(entry.isFolder, false),
					sql`${entry.path} LIKE ${`${collectionPath}%`}`,
					sql`${entry.content} ${sql.raw(likeOperator)} ${searchPattern}`
				)
			);

		// Extract all contexts from the results
		const searchResults: SearchResult[] = [];
		results.forEach((row) => {
			const contexts = extractAllContexts(
				row.content || '',
				escapedQuery,
				isCaseSensitive,
				isMatchWord
			);
			contexts.forEach((context) => {
				searchResults.push({
					path: row.path,
					context_preview: context
				});
			});
		});

		return json(searchResults);
	} catch (error) {
		console.error('Error searching entries:', error);
		return json({ error: 'Failed to search entries' }, { status: 500 });
	}
};

function extractAllContexts(
	content: string,
	query: string,
	caseSensitive: boolean,
	matchWord: boolean
): string[] {
	const lines = content.split('\n');
	const contexts: string[] = [];
	lines.forEach((line, index) => {
		const compareLine = caseSensitive ? line : line.toLowerCase();
		const compareQuery = caseSensitive ? query : query.toLowerCase();
		if (matchWord) {
			const regex = new RegExp(`(^|\\s)${compareQuery}($|\\s)`, caseSensitive ? '' : 'i');
			if (regex.test(compareLine)) {
				const startLine = Math.max(0, index - 1);
				const endLine = Math.min(lines.length - 1, index + 1);
				contexts.push(lines.slice(startLine, endLine + 1).join('\n'));
			}
		} else if (compareLine.includes(compareQuery)) {
			const startLine = Math.max(0, index - 1);
			const endLine = Math.min(lines.length - 1, index + 1);
			contexts.push(lines.slice(startLine, endLine + 1).join('\n'));
		}
	});
	return contexts;
}
