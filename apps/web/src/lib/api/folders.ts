import { collection, collectionId } from '@/store';
import { getNextUntitledName } from '@/utils';
import { get } from 'svelte/store';
import { moveNote } from './notes';
import { apiClient } from './client';
import type { Entry, CreateEntryRequest, UpdateEntryRequest } from './types';
import { refreshCollection } from './store-helpers';

// Create a new folder
export const createFolder = async (dirPath: string) => {
	try {
		// Get entries in the directory
		const files = await apiClient.request<Entry[]>(
			`/api/entries/by-parent?path=${encodeURIComponent(dirPath)}`
		);

		// Generate a new name (Untitled, if there are any existing Untitled folders, increment the number by 1)
		const name = getNextUntitledName(files, 'Untitled');

		// Create the new folder via API
		const createRequest: CreateEntryRequest = {
			name,
			path: `${dirPath}/${name}`.replace('//', '/'),
			parentPath: dirPath,
			collectionId: get(collectionId) || '',
			isFolder: true
		};

		const newFolder = await apiClient.request<{ path: string }>('/api/entries', {
			method: 'POST',
			body: JSON.stringify(createRequest)
		});

		// Refresh the collection to update the sidebar
		await refreshCollection();

		return newFolder.path;
	} catch (error) {
		console.error('Error creating folder:', error);
		throw error;
	}
};

// Delete a folder
export const deleteFolder = async (path: string, recursive = false) => {
	try {
		if (!recursive) {
			// Get children to check if folder is empty
			const children = await apiClient.request<Entry[]>(
				`/api/entries/by-parent?path=${encodeURIComponent(path)}`
			);

			// Filter out .DS_Store files and the folder itself
			const actualChildren = children.filter(
				(child) => child.name !== '.DS_Store' && child.path !== path
			);

			if (actualChildren.length > 0) {
				throw new Error('Folder is not empty');
			}
		}

		// Resolve path to ID
		const id = await apiClient.resolvePath(path);

		// Delete the folder via API
		await apiClient.request(`/api/entries/${id}`, {
			method: 'DELETE'
		});

		// Refresh the collection to update the sidebar
		await refreshCollection();
	} catch (error) {
		console.error('Error deleting folder:', error);
		throw error;
	}
};

// Rename a folder
export const renameFolder = async (path: string, name: string) => {
	try {
		// Resolve path to ID
		const id = await apiClient.resolvePath(path);

		// Update folder name via API
		await apiClient.request(`/api/entries/${id}`, {
			method: 'PATCH',
			body: JSON.stringify({
				name,
				path: `${path.split('/').slice(0, -1).join('/')}/${name}`
			})
		});

		// Refresh the collection to update the sidebar
		await refreshCollection();
	} catch (error) {
		console.error('Error renaming folder:', error);
		throw error;
	}
};

// Move a folder
export const moveFolder = async (source: string, target: string) => {
	try {
		// Get target directory entries to check for conflicts
		const targetFiles = await apiClient.request<Entry[]>(
			`/api/entries/by-parent?path=${encodeURIComponent(target)}`
		);

		// Make sure there are no name conflicts
		const folderName = source.split('/').pop()!;

		if (targetFiles.some((file) => file.name === folderName && file.isFolder)) {
			throw new Error('Name conflict');
		}

		// Get all source children
		const sourceFiles = await apiClient.request<Entry[]>(
			`/api/entries/by-parent?path=${encodeURIComponent(source)}`
		);

		// Filter out the source folder itself
		const children = sourceFiles.filter((file) => file.path !== source);

		// Move all children recursively
		for (const file of children) {
			if (file.isFolder) {
				await moveFolder(file.path, `${target}/${folderName}`);
			} else {
				await moveNote(file.path, `${target}/${folderName}`);
			}
		}

		// Resolve source path to ID
		const sourceId = await apiClient.resolvePath(source);

		// Move the folder itself
		const updateRequest: UpdateEntryRequest = {
			path: `${target}/${folderName}`,
			parentPath: target
		};

		await apiClient.request(`/api/entries/${sourceId}`, {
			method: 'PATCH',
			body: JSON.stringify(updateRequest)
		});

		// Refresh the collection to update the sidebar
		await refreshCollection();
	} catch (error) {
		console.error('Error moving folder:', error);
		throw error;
	}
};
