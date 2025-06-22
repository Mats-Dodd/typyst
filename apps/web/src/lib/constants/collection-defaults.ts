import type { CollectionSettingsParams } from '$lib/types';

export const DEFAULT_COLLECTION_SETTINGS: CollectionSettingsParams = {
	editor: {
		font: 'Inter',
		size: 16,
		auto_save: true,
		auto_save_debounce: 1000, // 1 second
		auto_correct: false,
		spell_check: true,
		show_inline_title: true,
		show_line_numbers: false,
		show_toolbar: true
	},
	notes: {
		trash_dir: 'haptic' as const,
		excluded_files: [
			'.DS_Store',
			'Thumbs.db',
			'.git',
			'node_modules',
			'*.tmp',
			'*.temp',
			'~$*' // Temporary Office files
		]
	}
};

// Validation schemas
export const COLLECTION_NAME_MAX_LENGTH = 255;
export const COLLECTION_PATH_MAX_LENGTH = 1024;

export function validateCollectionName(name: string): string | null {
	if (!name || name.trim().length === 0) {
		return 'Collection name cannot be empty';
	}
	if (name.length > COLLECTION_NAME_MAX_LENGTH) {
		return `Collection name must be less than ${COLLECTION_NAME_MAX_LENGTH} characters`;
	}
	return null;
}

export function validateCollectionPath(path: string): string | null {
	if (!path || path.trim().length === 0) {
		return 'Collection path cannot be empty';
	}
	if (path.length > COLLECTION_PATH_MAX_LENGTH) {
		return `Collection path must be less than ${COLLECTION_PATH_MAX_LENGTH} characters`;
	}
	// Basic path validation - you might want to add more based on your OS requirements
	if (path.includes('\0')) {
		return 'Collection path contains invalid characters';
	}
	return null;
}
