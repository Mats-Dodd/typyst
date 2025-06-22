import { collectionEntries, collection } from '$lib/store';
import { get } from 'svelte/store';
import type { FileEntry } from '$lib/types';

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
	content?: string;
	[key: string]: unknown;
}

export async function refreshCollection(collectionPath?: string) {
	const currentCollection = collectionPath || get(collection);
	if (!currentCollection) return;

	try {
		const response = await fetch(
			`/api/entries/by-parent?path=${encodeURIComponent(currentCollection)}`
		);
		if (!response.ok) throw new Error('Failed to fetch entries');

		const entries: EntryResponse[] = await response.json();

		const treeEntries: FileEntry[] = entries.map((e) => ({
			path: e.path,
			name: e.name,
			children: e.isFolder ? [] : undefined
		}));

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
