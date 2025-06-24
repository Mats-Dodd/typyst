<script lang="ts">
	import { getCollections } from '@/api/collection';
	import { collection as activeCollectionPath, collectionId as activeCollectionId } from '@/store';
	import { formatTimeAgo } from '@/utils';
	import { Button } from '@haptic/ui/components/button';
	import { Loader, Trash2 } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import DeleteCollectionDialog from '../shared/delete-collection-dialog.svelte';
	import Icon from '../shared/icon.svelte';
	import type { Collection } from '@/api/types';

	let collections: Collection[] = [];
	let loading = true;
	let error = '';
	
	let deleteDialogOpen = false;
	let selectedCollection: { id: string; name: string } | null = null;

	async function loadCollections() {
		try {
			loading = true;
			collections = await getCollections();
			// Sort by last opened
			collections.sort((a, b) => 
				new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime()
			);
		} catch (err) {
			console.error('Failed to load collections:', err);
			error = 'Failed to load collections';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadCollections();
	});

	function handleDeleteClick(collection: Collection) {
		selectedCollection = { id: collection.id, name: collection.name };
		deleteDialogOpen = true;
	}

	function handleDeleteSuccess() {
		loadCollections();
	}

	$: currentActiveId = get(activeCollectionId);
</script>

<div class="space-y-6">
	<p class="text-sm text-muted-foreground">
		Manage your collections. You can delete collections you no longer need, but you must keep at least one collection.
	</p>

	{#if loading}
		<div class="flex items-center justify-center py-8">
			<Loader class="h-6 w-6 animate-spin text-muted-foreground" />
		</div>
	{:else if error}
		<div class="text-sm text-destructive">{error}</div>
	{:else if collections.length === 0}
		<div class="text-sm text-muted-foreground text-center py-8">
			No collections found
		</div>
	{:else}
		<div class="space-y-2">
			{#each collections as collection}
				<div
					class="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
					class:border-primary={collection.id === currentActiveId}
				>
					<div class="flex items-center gap-3 flex-1 min-w-0">
						<Icon name="folder" class="w-5 h-5 text-muted-foreground flex-shrink-0" />
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<h3 class="font-medium truncate">{collection.name}</h3>
								{#if collection.id === currentActiveId}
									<span class="text-xs text-primary font-medium">Active</span>
								{/if}
							</div>
							<p class="text-xs text-muted-foreground truncate">{collection.path}</p>
							<p class="text-xs text-muted-foreground">
								Last opened {formatTimeAgo(new Date(collection.lastOpened))}
							</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8 text-muted-foreground hover:text-destructive"
						on:click={() => handleDeleteClick(collection)}
						disabled={collections.length === 1}
						title={collections.length === 1 ? 'Cannot delete your last collection' : 'Delete collection'}
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
			{/each}
		</div>

		<div class="text-xs text-muted-foreground">
			Total collections: {collections.length}
		</div>
	{/if}
</div>

{#if selectedCollection}
	<DeleteCollectionDialog
		bind:open={deleteDialogOpen}
		collectionId={selectedCollection.id}
		collectionName={selectedCollection.name}
		onSuccess={handleDeleteSuccess}
	/>
{/if}