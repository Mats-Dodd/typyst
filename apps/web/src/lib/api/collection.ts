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
	console.log('[loadCollection] Starting with path:', path);

	// Return if no path is provided
	if (!path) {
		console.log('[loadCollection] No path provided, returning');
		return;
	}

	// Set collection path
	collection.set(path);
	console.log('[loadCollection] Collection path set in store:', path);

	// Reset all collection states
	noteHistory.set([]);
	activeFile.set(null);
	collectionId.set(null);
	console.log('[loadCollection] Collection states reset');

	try {
		// Check if collection exists by fetching it by path
		const checkUrl = `/api/collections?path=${encodeURIComponent(path)}`;
		console.log('[loadCollection] Checking if collection exists:', checkUrl);

		const response = await fetch(checkUrl);
		console.log(
			'[loadCollection] Collection check response:',
			response.status,
			response.statusText
		);

		if (!response.ok && response.status === 404) {
			console.log('[loadCollection] Collection does not exist (404), creating new collection');

			// Collection doesn't exist, create it
			const createRequest: CreateCollectionRequest = {
				path: path,
				name: path.split('/').pop()!
			};
			console.log('[loadCollection] Create collection request:', createRequest);

			const createResponse = await apiClient.request<{
				collection: Collection;
				settings: CollectionSettings;
			}>('/api/collections', {
				method: 'POST',
				body: JSON.stringify(createRequest)
			});

			console.log('[loadCollection] Collection created:', createResponse);
			collectionId.set(createResponse.collection.id);
			console.log('[loadCollection] Collection ID set:', createResponse.collection.id);
		} else if (response.ok) {
			// Check if collection actually exists in the response
			const { collections } = await response.json();
			console.log('[loadCollection] Found collections:', collections);

			const collectionData = collections.find((c: Collection) => c.path === path);
			console.log('[loadCollection] Matching collection data:', collectionData);

			if (!collectionData || collections.length === 0) {
				console.log('[loadCollection] No collection found in response, creating new collection');

				// Collection doesn't exist, create it
				const createRequest: CreateCollectionRequest = {
					path: path,
					name: path.split('/').pop()!
				};
				console.log('[loadCollection] Create collection request:', createRequest);

				const createResponse = await apiClient.request<{
					collection: Collection;
					settings: CollectionSettings;
				}>('/api/collections', {
					method: 'POST',
					body: JSON.stringify(createRequest)
				});

				console.log('[loadCollection] Collection created:', createResponse);
				collectionId.set(createResponse.collection.id);
				console.log('[loadCollection] Collection ID set:', createResponse.collection.id);
			} else {
				console.log('[loadCollection] Collection exists, updating last accessed time');
				collectionId.set(collectionData.id);
				console.log('[loadCollection] Collection ID set:', collectionData.id);

				const updateUrl = `/api/collections/${collectionData.id}`;
				console.log('[loadCollection] Updating collection last accessed:', updateUrl);

				await apiClient.request(updateUrl, {
					method: 'PUT',
					body: JSON.stringify({})
				});
				console.log('[loadCollection] Collection last accessed time updated');
			}
		} else {
			console.error(
				'[loadCollection] Unexpected response:',
				response.status,
				await response.text()
			);
			throw new Error('Failed to load collection');
		}

		console.log('[loadCollection] Collection loaded successfully');
	} catch (error) {
		console.error('[loadCollection] Error loading collection:', error);
		throw error;
	}
};

// Get all collections
export const getCollections = async (): Promise<Collection[]> => {
	try {
		const response = await apiClient.request<{ collections: Collection[] }>('/api/collections');
		console.log('[getCollections] Response:', response);
		return response.collections || [];
	} catch (error) {
		console.error('Error fetching collections:', error);
		// Return empty array on error to prevent filter errors
		return [];
	}
};
