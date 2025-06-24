import { activeFile, collection, collectionId, collectionEntries, noteHistory } from '@/store';
import type { FileEntry } from '@/types';
import { buildFileTree, sortFileEntry } from '@/utils';
import { get } from 'svelte/store';
import { apiClient } from './client';
import type { Entry, Collection, CreateCollectionRequest, CollectionSettings } from './types';

// Fetch the collection entries
export const fetchCollectionEntries = async (
	dirPath?: string,
	sort: 'name' | 'date' = 'name',
	showDotfiles = false
): Promise<FileEntry[]> => {
	dirPath = dirPath || get(collection);
	if (!dirPath) throw new Error('No directory path provided');

	try {
		const currentCollectionId = get(collectionId);

		// Fetch entries from API - use collectionId if available for better performance
		const entries = await apiClient.request<Entry[]>(
			currentCollectionId
				? `/api/entries/by-parent?collectionId=${currentCollectionId}`
				: `/api/entries/by-parent?path=${encodeURIComponent(dirPath)}&recursive=true`
		);

		// Convert entries to FileEntry[] format with recursive children
		const fileEntries = buildFileTree(entries, dirPath);

		// Sort entries recursively
		const sortEntries = (entries: FileEntry[]) => {
			entries.sort((a, b) => {
				if (sort === 'name' && a.name && b.name) {
					return sortFileEntry(a, b);
				} else if (sort === 'date') {
					console.warn('Sorting by date is not implemented yet');
				}
				return 0;
			});

			entries.forEach((entry) => {
				if (entry.children) {
					sortEntries(entry.children);
				}
			});
		};

		sortEntries(fileEntries);

		// Hide dotfiles recursively
		const filterDotfiles = (entries: FileEntry[]): FileEntry[] => {
			return entries.filter((entry) => {
				if (!showDotfiles && entry.name?.startsWith('.')) {
					return false;
				}
				if (entry.children) {
					entry.children = filterDotfiles(entry.children);
				}
				return true;
			});
		};

		// Set collectionEntries if length is different
		collectionEntries.set(showDotfiles ? fileEntries : filterDotfiles(fileEntries));

		return showDotfiles ? fileEntries : filterDotfiles(fileEntries);
	} catch (error) {
		console.error('Error fetching collection entries:', error);
		throw error;
	}
};

export const loadCollection = async (path?: string | undefined) => {
	// Return if no path is provided
	if (!path) {
		console.warn('[loadCollection] No path provided, returning');
		return;
	}

	// Set collection path
	collection.set(path);

	// Reset all collection states
	noteHistory.set([]);
	activeFile.set(null);
	collectionId.set(null);

	try {
		// Check if collection exists by fetching it by path
		const checkUrl = `/api/collections?path=${encodeURIComponent(path)}`;

		const response = await fetch(checkUrl);

		if (!response.ok && response.status === 404) {
			// Collection doesn't exist, create it
			const createRequest: CreateCollectionRequest = {
				path: path,
				name: path.split('/').pop()!
			};

			const createResponse = await apiClient.request<{
				collection: Collection;
				settings: CollectionSettings;
			}>('/api/collections', {
				method: 'POST',
				body: JSON.stringify(createRequest)
			});

			collectionId.set(createResponse.collection.id);
		} else if (response.ok) {
			// Check if collection actually exists in the response
			const { collections } = await response.json();

			const collectionData = collections.find((c: Collection) => c.path === path);

			if (!collectionData || collections.length === 0) {
				// Collection doesn't exist, create it
				const createRequest: CreateCollectionRequest = {
					path: path,
					name: path.split('/').pop()!
				};

				const createResponse = await apiClient.request<{
					collection: Collection;
					settings: CollectionSettings;
				}>('/api/collections', {
					method: 'POST',
					body: JSON.stringify(createRequest)
				});

				collectionId.set(createResponse.collection.id);
			} else {
				collectionId.set(collectionData.id);

				const updateUrl = `/api/collections/${collectionData.id}`;

				await apiClient.request(updateUrl, {
					method: 'PUT',
					body: JSON.stringify({})
				});
			}
		} else {
			console.error(
				'[loadCollection] Unexpected response:',
				response.status,
				await response.text()
			);
			throw new Error('Failed to load collection');
		}
	} catch (error) {
		console.error('[loadCollection] Error loading collection:', error);
		throw error;
	}
};

// Get all collections
export const getCollections = async (): Promise<Collection[]> => {
	try {
		const response = await apiClient.request<{ collections: Collection[] }>('/api/collections');
		return response.collections || [];
	} catch (error) {
		console.error('Error fetching collections:', error);
		// Return empty array on error to prevent filter errors
		return [];
	}
};
