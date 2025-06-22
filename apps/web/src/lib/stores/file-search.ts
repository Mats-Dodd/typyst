import { writable, derived } from 'svelte/store';

export interface FileSearchEntry {
	id: string;
	collectionId: string;
	path: string;
	name: string | null;
	parentPath: string;
	updatedAt: Date;
	createdAt: Date;
}

export interface FileSearchState {
	query: string;
	isOpen: boolean;
	isLoading: boolean;
	searchResults: FileSearchEntry[];
	recentFiles: FileSearchEntry[];
	selectedIndex: number;
	error: string | null;
}

function createFileSearchStore() {
	const initialState: FileSearchState = {
		query: '',
		isOpen: false,
		isLoading: false,
		searchResults: [],
		recentFiles: [],
		selectedIndex: 0,
		error: null
	};

	const { subscribe, set, update } = writable<FileSearchState>(initialState);

	return {
		subscribe,

		// Open/close the search
		open: () => update((state) => ({ ...state, isOpen: true })),
		close: () => update((state) => ({ ...state, isOpen: false, query: '', selectedIndex: 0 })),
		toggle: () => update((state) => ({ ...state, isOpen: !state.isOpen })),

		// Update query
		setQuery: (query: string) => update((state) => ({ ...state, query, selectedIndex: 0 })),

		// Update results
		setSearchResults: (results: FileSearchEntry[]) =>
			update((state) => ({ ...state, searchResults: results, isLoading: false, error: null })),

		setRecentFiles: (files: FileSearchEntry[]) =>
			update((state) => ({ ...state, recentFiles: files })),

		// Loading state
		setLoading: (isLoading: boolean) => update((state) => ({ ...state, isLoading })),

		// Error handling
		setError: (error: string | null) => update((state) => ({ ...state, error, isLoading: false })),

		// Navigation
		selectNext: () =>
			update((state) => {
				const totalItems = state.query ? state.searchResults.length : state.recentFiles.length;
				if (totalItems === 0) return state;
				return { ...state, selectedIndex: (state.selectedIndex + 1) % totalItems };
			}),

		selectPrevious: () =>
			update((state) => {
				const totalItems = state.query ? state.searchResults.length : state.recentFiles.length;
				if (totalItems === 0) return state;
				return {
					...state,
					selectedIndex: state.selectedIndex === 0 ? totalItems - 1 : state.selectedIndex - 1
				};
			}),

		setSelectedIndex: (index: number) => update((state) => ({ ...state, selectedIndex: index })),

		// Reset
		reset: () => set(initialState)
	};
}

export const fileSearchStore = createFileSearchStore();

// Derived store for the currently displayed items (search results or recent files)
export const displayedItems = derived(fileSearchStore, ($store) =>
	$store.query ? $store.searchResults : $store.recentFiles
);

// Derived store for the currently selected item
export const selectedItem = derived(
	[fileSearchStore, displayedItems],
	([$store, $items]) => $items[$store.selectedIndex] || null
);
