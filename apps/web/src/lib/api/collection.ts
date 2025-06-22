import { activeFile, collection, collectionEntries, noteHistory } from '@/store';
import type { FileEntry } from '@/types';
import { buildFileTree, sortFileEntry } from '@/utils';
import { get } from 'svelte/store';
import { apiClient } from './client';
import type { Entry, Collection, CreateCollectionRequest } from './types';

// Fetch the collection entries
export const fetchCollectionEntries = async (
	dirPath?: string,
	sort: 'name' | 'date' = 'name',
	showDotfiles = false
): Promise<FileEntry[]> => {
	dirPath = dirPath || get(collection);
	if (!dirPath) throw new Error('No directory path provided');

	try {
		// Fetch entries from API
		const entries = await apiClient.request<Entry[]>(
			`/api/entries/by-parent?path=${encodeURIComponent(dirPath)}`
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
	if (!path) return;

	// Set collection path
	collection.set(path);

	// Reset all collection states
	noteHistory.set([]);
	activeFile.set(null);

	try {
		// Check if collection exists by fetching it
		const response = await fetch(`/api/collections/${encodeURIComponent(path)}`);

		if (!response.ok && response.status === 404) {
			// Collection doesn't exist, create it
			const createRequest: CreateCollectionRequest = {
				path: path,
				name: path.split('/').pop()!
			};

			await apiClient.request('/api/collections', {
				method: 'POST',
				body: JSON.stringify(createRequest)
			});
		} else if (response.ok) {
			// Collection exists, update last accessed time
			const collectionData = await response.json();
			await apiClient.request(`/api/collections/${collectionData.id}`, {
				method: 'PATCH',
				body: JSON.stringify({
					lastAccessedAt: new Date().toISOString()
				})
			});
		} else {
			throw new Error('Failed to load collection');
		}
	} catch (error) {
		console.error('Error loading collection:', error);
		throw error;
	}
};

// Get all collections
export const getCollections = async (): Promise<Collection[]> => {
	try {
		const collections = await apiClient.request<Collection[]>('/api/collections');
		return collections;
	} catch (error) {
		console.error('Error fetching collections:', error);
		throw error;
	}
};
