<script lang="ts">
	import { fileSearchStore, displayedItems } from '$lib/stores/file-search';
	import { openNote } from '$lib/api/notes';
	import * as Command from '@haptic/ui/components/command';
	import Icon from '$lib/components/shared/icon.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { formatTimeAgo } from '$lib/utils';

	export let collectionId: string | null = null;

	let open = false;
	let search = '';
	let value: string | undefined = undefined;
	let searchTimeout: ReturnType<typeof setTimeout>;

	$: items = $displayedItems;
	$: isLoading = $fileSearchStore.isLoading;
	$: error = $fileSearchStore.error;

	// Sync with store
	$: if (open && !$fileSearchStore.isOpen) {
		fileSearchStore.open();
		loadRecentFiles();
	}
	$: if (!open && $fileSearchStore.isOpen) {
		fileSearchStore.close();
	}

	// Handle search input
	$: if (search !== undefined) {
		fileSearchStore.setQuery(search);

		// Clear existing timeout
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// Set new timeout for search
		if (search.trim()) {
			fileSearchStore.setLoading(true);
			searchTimeout = setTimeout(() => {
				performSearch(search);
			}, 150);
		} else {
			fileSearchStore.setSearchResults([]);
		}
	}

	async function performSearch(searchQuery: string) {
		try {
			const params = new URLSearchParams({
				q: searchQuery,
				limit: '20'
			});

			if (collectionId) {
				params.append('collectionId', collectionId);
			}

			const response = await fetch(`/api/entries/file-search?${params}`);

			if (!response.ok) {
				throw new Error('Search failed');
			}

			const data = await response.json();
			fileSearchStore.setSearchResults(data.entries);
		} catch (error) {
			console.error('Search error:', error);
			fileSearchStore.setError('Failed to search files');
		}
	}

	async function loadRecentFiles() {
		try {
			const params = new URLSearchParams({ limit: '10' });

			if (collectionId) {
				params.append('collectionId', collectionId);
			}

			const response = await fetch(`/api/entries/recent?${params}`);

			if (!response.ok) {
				throw new Error('Failed to load recent files');
			}

			const data = await response.json();
			fileSearchStore.setRecentFiles(data.entries);
		} catch (error) {
			console.error('Error loading recent files:', error);
		}
	}

	async function handleSelect(path: string) {
		await openNote(path);
		open = false;
		search = '';
		value = undefined;
	}

	// Keyboard shortcut handler
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			open = !open;
		}
	}

	// Format path for display
	function formatPath(path: string): string {
		const parts = path.split('/').filter(Boolean);
		if (parts.length > 3) {
			return '.../' + parts.slice(-3).join('/');
		}
		return parts.join('/');
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeydown);
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});
</script>

<Command.Dialog
	bind:open
	bind:value
	loop
	onKeydown={(e) => {
		if (e.key === 'Escape') {
			open = false;
		}
	}}
>
	<Command.Input bind:value={search} placeholder="Search files..." />
	<Command.List>
		{#if error}
			<Command.Empty class="text-foreground/60 font-light">
				{error}
			</Command.Empty>
		{:else if isLoading && items.length === 0}
			<Command.Loading class="text-foreground/90">Searching...</Command.Loading>
		{:else if search && items.length === 0 && !isLoading}
			<Command.Empty class="text-foreground/60 font-light">
				No files found for "{search}"
			</Command.Empty>
		{:else if items.length > 0}
			<Command.Group heading={search ? 'Search Results' : 'Recent Files'}>
				{#each items as item}
					<Command.Item
						class="text-foreground/90 gap-3 [&>*]:text-foreground/90 [&>*]:aria-selected:text-foreground [&>*]:fill-foreground/50 [&>*]:aria-selected:fill-foreground"
						value={item.path}
						onSelect={() => handleSelect(item.path)}
					>
						<Icon name="note" />
						<div class="flex w-full items-center justify-between">
							<div class="flex flex-col gap-0.5">
								<span class="text-sm">
									{item.name || item.path.split('/').pop() || 'Untitled'}
								</span>
								{#if item.parentPath && item.parentPath !== '/'}
									<span class="text-xs text-muted-foreground">
										{formatPath(item.parentPath)}
									</span>
								{/if}
							</div>
							{#if item.updatedAt}
								<span class="ml-auto text-xs text-muted-foreground">
									{formatTimeAgo(new Date(item.updatedAt))}
								</span>
							{/if}
						</div>
					</Command.Item>
				{/each}
			</Command.Group>
		{:else}
			<Command.Empty class="text-foreground/60 font-light">Type to search files</Command.Empty>
		{/if}
	</Command.List>
</Command.Dialog>
