import type { CollectionParams, CollectionSettingsParams } from '$lib/types';

export interface Collection extends CollectionParams {
	id: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
	settings?: CollectionSettings | null;
}

export interface CollectionSettings {
	id: string;
	collectionId: string;
	editor: CollectionSettingsParams['editor'];
	notes: CollectionSettingsParams['notes'];
	createdAt: string;
	updatedAt: string;
}

export interface ApiError {
	error: string;
	code: string;
}

class CollectionsApi {
	private async handleResponse<T>(response: Response): Promise<T> {
		const data = await response.json();

		if (!response.ok) {
			throw data as ApiError;
		}

		return data as T;
	}

	async getAll(): Promise<{ collections: Collection[] }> {
		const response = await fetch('/api/collections');
		return this.handleResponse(response);
	}

	async get(id: string): Promise<Collection> {
		const response = await fetch(`/api/collections/${id}`);
		return this.handleResponse(response);
	}

	async create(data: {
		path: string;
		name?: string;
	}): Promise<{ collection: Collection; settings: CollectionSettings }> {
		const response = await fetch('/api/collections', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});
		return this.handleResponse(response);
	}

	async update(id: string, data: { name?: string; path?: string }): Promise<Collection> {
		const response = await fetch(`/api/collections/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});
		return this.handleResponse(response);
	}

	async delete(id: string): Promise<{ success: boolean }> {
		const response = await fetch(`/api/collections/${id}`, {
			method: 'DELETE'
		});
		return this.handleResponse(response);
	}

	async getSettings(collectionId: string): Promise<CollectionSettings> {
		const response = await fetch(`/api/collections/${collectionId}/settings`);
		return this.handleResponse(response);
	}

	async updateSettings(
		collectionId: string,
		updates: {
			editor?: Partial<CollectionSettingsParams['editor']>;
			notes?: Partial<CollectionSettingsParams['notes']>;
		}
	): Promise<CollectionSettings> {
		const response = await fetch(`/api/collections/${collectionId}/settings`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(updates)
		});
		return this.handleResponse(response);
	}

	async resetSettings(collectionId: string): Promise<CollectionSettings> {
		const response = await fetch(`/api/collections/${collectionId}/settings`, {
			method: 'DELETE'
		});
		return this.handleResponse(response);
	}

	async touchCollection(id: string): Promise<Collection> {
		return this.update(id, {});
	}
}

export const collectionsApi = new CollectionsApi();
