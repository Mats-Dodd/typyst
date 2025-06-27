import { activeFile, collection, editor, noteHistory, collectionId } from '@/store';
import type { NoteMetadataParams } from '@/types';
import { calculateReadingTime, getNextUntitledName, setEditorContent } from '@/utils';
import { get } from 'svelte/store';
import { apiClient } from './client';
import type { Entry, CreateEntryRequest, UpdateEntryRequest, EntryWithMetadata } from './types';
import { refreshCollection } from './store-helpers';
import { loroDocuments } from '@/stores/loro-document';
import { LoroDoc } from 'loro-crdt';

// Create a new note
export const createNote = async (dirPath: string, name?: string) => {
	try {
		// Get entries in the directory
		const files = await apiClient.request<Entry[]>(
			`/api/entries/by-parent?path=${encodeURIComponent(dirPath)}`
		);

		// Generate a new name if not provided
		if (!name) {
			name = getNextUntitledName(files, 'Untitled', '.md');
		}

		// Create a new Loro document for the note
		const doc = new LoroDoc();
		doc.setRecordTimestamp(true);
		doc.setChangeMergeInterval(10);
		
		// Create an empty snapshot
		const snapshot = doc.export({ mode: 'snapshot' });
		// Convert Uint8Array to base64 string
		let binaryString = '';
		snapshot.forEach((byte: number) => {
			binaryString += String.fromCharCode(byte);
		});
		const loroSnapshot = btoa(binaryString);

		// Create the new note via API
		const createRequest: CreateEntryRequest = {
			name,
			path: `${dirPath}/${name}`.replace('//', '/'),
			content: '', // Keep empty content as a fallback
			parentPath: dirPath,
			collectionId: get(collectionId) as string,
			isFolder: false,
			loroSnapshot
		};

		await apiClient.request('/api/entries', {
			method: 'POST',
			body: JSON.stringify(createRequest)
		});

		// Refresh the collection to update the sidebar
		await refreshCollection();

		// Open the note
		openNote(`${dirPath}/${name}`.replace('//', '/'));
	} catch (error) {
		console.error('Error creating note:', error);
		throw error;
	}
};

// Open a note
export async function openNote(path: string, skipHistory = false) {
	try {
		// Resolve path to ID
		const id = await apiClient.resolvePath(path);

		// Get note content and Loro snapshot
		const file = await apiClient.request<{ content?: string; loroSnapshot?: number[] | null }>(`/api/entries/${id}`);

		// Initialize Loro document BEFORE setting active file
		let hasLoroContent = false;
		
		if (file.loroSnapshot && Array.isArray(file.loroSnapshot)) {
			try {
				// Create or get the Loro document for this path
				let docState = loroDocuments.getDocument(path);
				if (!docState) {
					// Create new document
					const result = loroDocuments.createDocument(path);
					docState = {
						doc: result.doc,
						awareness: result.awareness,
						entryId: path,
						isDirty: false
					};
				}
				
				// Convert number array to Uint8Array and import
				const snapshotBytes = new Uint8Array(file.loroSnapshot);
				docState.doc.import(snapshotBytes);
				hasLoroContent = true;
				
				console.log('Loaded Loro snapshot for', path);
			} catch (error) {
				console.error('Error loading Loro snapshot:', error);
			}
		}
		
		// If no Loro snapshot but we have content, we need to initialize from content
		if (!hasLoroContent && file.content) {
			// Create a Loro document with the content
			let docState = loroDocuments.getDocument(path);
			if (!docState) {
				const result = loroDocuments.createDocument(path, file.content);
				docState = {
					doc: result.doc,
					awareness: result.awareness,
					entryId: path,
					isDirty: true // Mark as dirty to ensure it gets saved with a snapshot
				};
			}
			// For migration: set editor content for now
			// This will be removed once all entries have Loro snapshots
			setEditorContent(file.content);
		} else if (!hasLoroContent) {
			// No snapshot and no content - create empty document
			const result = loroDocuments.createDocument(path, '');
		}

		// NOW set active file - the editor will pick up the already-initialized Loro document
		activeFile.set(path);

		if (!skipHistory) {
			noteHistory.update((history) => {
				if (history[history.length - 1] !== path) {
					return [...history, path];
				}
				return history;
			});
		}
	} catch (error) {
		console.error('Error opening note:', error);
		throw error;
	}
}

// Delete a note
export const deleteNote = async (path: string) => {
	try {
		// Resolve path to ID
		const id = await apiClient.resolvePath(path);

		// Delete the note via API
		await apiClient.request(`/api/entries/${id}`, {
			method: 'DELETE'
		});

		activeFile.set(null);

		// Refresh the collection to update the sidebar
		await refreshCollection();
	} catch (error) {
		console.error('Error deleting note:', error);
		throw error;
	}
};

// Rename a note
export const renameNote = async (path: string, name: string) => {
	try {
		// Make sure file extension is included
		if (!name.endsWith('.md')) {
			name += '.md';
		}

		// Remove breaking characters
		name = name.replace(/[/\\?%*:|"<>]/g, '');

		// Get the parent directory
		const parentPath = path.split('/').slice(0, -1).join('/');

		// Get all files in the directory to check for conflicts
		const files = await apiClient.request<Entry[]>(
			`/api/entries/by-parent?path=${encodeURIComponent(parentPath)}`
		);

		// Make sure there are no name conflicts
		if (
			files.some(
				(file) =>
					file.name?.toLowerCase() === name.toLowerCase() && !file.isFolder && file.path !== path
			)
		) {
			throw new Error('Name conflict');
		}

		// Resolve path to ID
		const id = await apiClient.resolvePath(path);

		// Rename the file via API
		await apiClient.request(`/api/entries/${id}`, {
			method: 'PUT',
			body: JSON.stringify({
				name,
				path: `${parentPath}/${name}`
			})
		});

		activeFile.set(`${parentPath}/${name}`);

		// Refresh the collection to update the sidebar
		await refreshCollection();
	} catch (error) {
		console.error('Error renaming note:', error);
		throw error;
	}
};

// Save active note
export const saveNote = async (path: string) => {
	try {
		// Get note content
		let content = get(editor).storage.markdown.getMarkdown();

		// Remove the first heading title
		content = content.replace(/^# .*\n/, '');

		// Calculate file size in bytes
		const size = new TextEncoder().encode(content).length;

		// Get Loro snapshot if available
		let loroSnapshot: string | undefined;
		const docState = loroDocuments.getDocument(path);
		if (docState && docState.doc) {
			try {
				// Export the Loro document as a snapshot
				const snapshot = docState.doc.export({ mode: 'snapshot' });
				// Convert Uint8Array to base64 string
				let binaryString = '';
				snapshot.forEach((byte) => {
					binaryString += String.fromCharCode(byte);
				});
				loroSnapshot = btoa(binaryString);
			} catch (error) {
				console.error('Error exporting Loro snapshot:', error);
			}
		}

		// Resolve path to ID
		const id = await apiClient.resolvePath(path);

		// Update note content via API
		const updateRequest: UpdateEntryRequest = {
			content,
			loroSnapshot,
			updatedAt: new Date().toISOString(),
			size
		};

		await apiClient.request(`/api/entries/${id}`, {
			method: 'PUT',
			body: JSON.stringify(updateRequest)
		});
	} catch (error) {
		console.error('Error saving note:', error);
		throw error;
	}
};

export const moveNote = async (source: string, target: string) => {
	try {
		// Get target directory entries to check for conflicts
		const targetFiles = await apiClient.request<Entry[]>(
			`/api/entries/by-parent?path=${encodeURIComponent(target)}`
		);

		// Make sure there are no name conflicts
		const noteName = source.split('/').pop()!;

		if (
			targetFiles.some(
				(file) => file.name === noteName && !file.isFolder && file.parentPath === target
			)
		) {
			throw new Error('Name conflict');
		}

		// Resolve source path to ID
		const sourceId = await apiClient.resolvePath(source);

		// Update the note location via API
		const updateRequest: UpdateEntryRequest = {
			path: `${target}/${noteName}`.replace('//', '/'),
			parentPath: target
		};

		await apiClient.request(`/api/entries/${sourceId}`, {
			method: 'PUT',
			body: JSON.stringify(updateRequest)
		});

		// Refresh the collection to update the sidebar
		await refreshCollection();

		// Open the note at new location
		openNote(`${target}/${noteName}`);
	} catch (error) {
		console.error('Error moving note:', error);
		throw error;
	}
};

// Duplicate a note
export const duplicateNote = async (path: string) => {
	try {
		// Resolve path to ID and fetch content
		const id = await apiClient.resolvePath(path);
		const entry = await apiClient.request<EntryWithMetadata & { loroSnapshot?: number[] | null }>(`/api/entries/${id}`);

		// Extract the name and extension of the note
		const ext = path.split('.').pop()!;
		const parentPath = path.split('/').slice(0, -1).join('/');

		// Get files in parent directory
		const files = await apiClient.request<Entry[]>(
			`/api/entries/by-parent?path=${encodeURIComponent(parentPath)}`
		);

		// Filter notes with similar names
		const notes = files.filter(
			(file) => file.name?.startsWith(entry.name!.replace(`.${ext}`, '')) && !file.isFolder
		);

		// Create new name
		const newName = `${entry.name!.replace(`.${ext}`, '')} (${notes.length}).${ext}`;

		// Convert loroSnapshot from array to base64 string if it exists
		let loroSnapshot: string | undefined;
		if (entry.loroSnapshot && Array.isArray(entry.loroSnapshot)) {
			try {
				const snapshotBytes = new Uint8Array(entry.loroSnapshot);
				let binaryString = '';
				snapshotBytes.forEach((byte) => {
					binaryString += String.fromCharCode(byte);
				});
				loroSnapshot = btoa(binaryString);
			} catch (error) {
				console.error('Error converting Loro snapshot:', error);
			}
		}

		// Create duplicate note via API
		const createRequest: CreateEntryRequest = {
			name: newName,
			path: `${parentPath}/${newName}`,
			parentPath: parentPath,
			collectionId: entry.collectionId || (get(collectionId) as string),
			content: entry.content || '',
			loroSnapshot,
			isFolder: false
		};

		await apiClient.request('/api/entries', {
			method: 'POST',
			body: JSON.stringify(createRequest)
		});

		// Refresh the collection to update the sidebar
		await refreshCollection();

		// Open the new note
		openNote(`${parentPath}/${newName}`);
	} catch (error) {
		console.error('Error duplicating note:', error);
		throw error;
	}
};

export const getNoteMetadataParams = async (path: string): Promise<NoteMetadataParams> => {
	try {
		// Resolve path to ID and fetch metadata
		const id = await apiClient.resolvePath(path);
		const fileMetadata = await apiClient.request<Entry>(`/api/entries/${id}`);

		// Get editor metadata
		const editorWordCount = get(editor).storage.characterCount.words();
		const editorCharacterCount = get(editor).storage.characterCount.characters();

		// Calculate average reading time
		const avgReadingTime = calculateReadingTime(editorWordCount);

		return {
			fileMetadata: {
				createdAt: new Date(fileMetadata.createdAt),
				modifiedAt: new Date(fileMetadata.updatedAt),
				size: fileMetadata.size ?? 0
			},
			editorMetadata: {
				words: editorWordCount,
				characters: editorCharacterCount,
				avgReadingTime: avgReadingTime
			}
		};
	} catch (error) {
		console.error('Error fetching note metadata:', error);
		throw error;
	}
};
