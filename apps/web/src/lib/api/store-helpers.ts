import { collectionEntries, collection, collectionId } from '$lib/store';
import { get } from 'svelte/store';
import type { FileEntry } from '$lib/types';
import { buildFileTree } from '$lib/utils';

export function updateCollectionEntries(
	action: 'add' | 'update' | 'remove',
	entry: FileEntry | FileEntry[]
) {
	collectionEntries.update((entries) => {
		const entryArray = Array.isArray(entry) ? entry : [entry];

		switch (action) {
			case 'add': {
				return [...entries, ...entryArray];
			}

			case 'update': {
				return entries.map((e) => {
					const updated = entryArray.find((u) => u.path === e.path);
					return updated || e;
				});
			}

			case 'remove': {
				const pathsToRemove = entryArray.map((e) => e.path);
				return entries.filter((e) => !pathsToRemove.includes(e.path));
			}

			default: {
				return entries;
			}
		}
	});
}

interface EntryResponse {
	path: string;
	name: string;
	isFolder: boolean;
	parentPath?: string;
	content?: string;
	[key: string]: unknown;
}

export async function refreshCollection(collectionPath?: string) {
	const currentCollection = collectionPath || get(collection);
	if (!currentCollection) return;

	try {
		const currentCollectionId = get(collectionId);

		const url = currentCollectionId
			? `/api/entries/by-parent?collectionId=${currentCollectionId}`
			: `/api/entries/by-parent?path=${encodeURIComponent(currentCollection)}&recursive=true`;

		const response = await fetch(url);
		if (!response.ok) throw new Error('Failed to fetch entries');

		const entries: EntryResponse[] = await response.json();

		const treeEntries = buildFileTree(entries, currentCollection);

		collectionEntries.set(treeEntries);
	} catch (error) {
		console.error('Error refreshing collection:', error);
	}
}

export function optimisticUpdate<T>(updateFn: () => void, apiCall: () => Promise<T>): Promise<T> {
	updateFn();

	return apiCall().catch((error) => {
		// Simple rollback: refresh the collection
		refreshCollection();
		throw error;
	});
}
