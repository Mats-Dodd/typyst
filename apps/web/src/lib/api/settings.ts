import { appSettings, collection, collectionSettings } from '@/store';
import type { AppSettingsParams, CollectionSettingsParams } from '@/types';
import { get } from 'svelte/store';
import { apiClient } from './client';

export const loadSettings = async (loadApp: boolean, loadCollection: boolean) => {
	if (loadApp) {
		// Load app settings from local storage
		const appSettingsData = window.localStorage.getItem('appSettings');
		if (!appSettingsData) {
			setSettings('app');
		} else {
			appSettings.set(JSON.parse(appSettingsData));
		}
	}

	if (loadCollection) {
		try {
			// Fetch collection settings from API
			const response = await fetch(
				`/api/collections/${encodeURIComponent(get(collection))}/settings`
			);

			if (response.ok) {
				const collectionSettingsData = await response.json();
				collectionSettings.set({
					editor: collectionSettingsData.editor as CollectionSettingsParams['editor'],
					notes: collectionSettingsData.notes as CollectionSettingsParams['notes']
				});
			} else if (response.status === 404) {
				// No settings exist yet, use defaults
				setSettings('collection');
			} else {
				throw new Error('Failed to load collection settings');
			}
		} catch (error) {
			console.error('Error loading collection settings:', error);
			// Use defaults on error
			setSettings('collection');
		}
	}
};

export const setSettings = async (
	settingsType: 'app' | 'collection',
	value?: AppSettingsParams | CollectionSettingsParams
) => {
	if (settingsType === 'app') {
		appSettings.set((value ?? get(appSettings)) as AppSettingsParams);
		window.localStorage.setItem('appSettings', JSON.stringify(value ?? get(appSettings)));
	}

	if (settingsType === 'collection') {
		const settings = (value ?? get(collectionSettings)) as CollectionSettingsParams;
		collectionSettings.set(settings);

		try {
			// Save collection settings via API
			await apiClient.request(`/api/collections/${encodeURIComponent(get(collection))}/settings`, {
				method: 'PUT',
				body: JSON.stringify({
					editor: settings.editor,
					notes: settings.notes
				})
			});
		} catch (error) {
			console.error('Error saving collection settings:', error);
			throw error;
		}
	}
};
