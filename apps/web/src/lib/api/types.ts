// API response types based on the Drizzle schema
import type { InferSelectModel } from '@haptic/db';
import type { collection, collectionSettings, entry } from '@haptic/db';

// Export the inferred types from the database schema
export type Collection = InferSelectModel<typeof collection>;
export type CollectionSettings = InferSelectModel<typeof collectionSettings>;
export type Entry = InferSelectModel<typeof entry>;

// API request types
export interface CreateEntryRequest {
	name?: string;
	path: string;
	content?: string;
	parentPath: string;
	collectionId: string;
	isFolder: boolean;
	size?: number;
}

export interface UpdateEntryRequest {
	name?: string;
	path?: string;
	parentPath?: string;
	content?: string;
	updatedAt?: string;
	size?: number;
}

export interface CreateCollectionRequest {
	path: string;
	name: string;
}

export interface UpdateCollectionRequest {
	lastAccessedAt?: string;
}

export interface CollectionSettingsRequest {
	editor?: Record<string, unknown>;
	notes?: Record<string, unknown>;
}

// Helper type for entries with optional properties used in UI
export interface EntryWithMetadata extends Entry {
	collectionPath?: string;
}
