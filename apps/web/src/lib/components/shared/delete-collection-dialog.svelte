<script lang="ts">
	import { deleteCollection, getCollectionStats } from '@/api/collection';
	import { collection as activeCollection, collectionId as activeCollectionId } from '@/store';
	import { goto } from '$app/navigation';
	import { Button } from '@haptic/ui/components/button';
	import * as Dialog from '@haptic/ui/components/dialog';
	import { Input } from '@haptic/ui/components/input';
	import { Label } from '@haptic/ui/components/label';
	import { Loader } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import Icon from './icon.svelte';

	export let collectionId: string;
	export let collectionName: string = '';
	export let open = false;
	export let onSuccess: () => void = () => {};

	let confirmationText = '';
	let loading = false;
	let loadingStats = true;
	let error = '';
	let stats: { total: number; folders: number; notes: number } | null = null;

	$: canDelete = confirmationText === collectionName;

	onMount(async () => {
		if (collectionId) {
			try {
				const response = await getCollectionStats(collectionId);
				stats = response.stats;
				if (!collectionName) {
					collectionName = response.collection.name;
				}
			} catch (err) {
				console.error('Failed to fetch collection stats:', err);
			} finally {
				loadingStats = false;
			}
		}
	});

	async function handleDelete() {
		if (!canDelete || loading) return;

		loading = true;
		error = '';

		try {
			await deleteCollection(collectionId);

			// If we're deleting the active collection, redirect
			if (get(activeCollectionId) === collectionId || get(activeCollection) === `/${collectionName}`) {
				// Navigate to notes page (will show empty state or another collection)
				await goto('/notes');
			}

			// Call success callback
			onSuccess();

			// Close dialog
			open = false;
		} catch (err: any) {
			console.error('Failed to delete collection:', err);
			
			if (err?.code === 'LAST_COLLECTION') {
				error = 'Cannot delete your last collection';
			} else {
				error = err?.message || 'Failed to delete collection';
			}
		} finally {
			loading = false;
		}
	}

	function handleOpenChange(value: boolean) {
		if (!loading) {
			open = value;
			if (!value) {
				// Reset state when closing
				confirmationText = '';
				error = '';
			}
		}
	}
</script>

<Dialog.Root bind:open={open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Delete Collection</Dialog.Title>
			<Dialog.Description>
				This action cannot be undone. This will permanently delete the collection and all its contents.
			</Dialog.Description>
		</Dialog.Header>
		
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<Icon name="folder" class="w-4 h-4" />
					<span class="font-medium">{collectionName}</span>
				</div>
				
				{#if loadingStats}
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader class="w-3 h-3 animate-spin" />
						<span>Loading collection details...</span>
					</div>
				{:else if stats}
					<div class="text-sm text-muted-foreground">
						This collection contains:
						<ul class="mt-1 ml-4 space-y-0.5">
							<li>• {stats.notes} {stats.notes === 1 ? 'note' : 'notes'}</li>
							<li>• {stats.folders} {stats.folders === 1 ? 'folder' : 'folders'}</li>
						</ul>
					</div>
				{/if}
			</div>

			<div class="space-y-2">
				<Label htmlFor="confirmation">
					Type <span class="font-mono font-semibold">{collectionName}</span> to confirm
				</Label>
				<Input
					id="confirmation"
					bind:value={confirmationText}
					placeholder="Enter collection name"
					disabled={loading}
				/>
			</div>

			{#if error}
				<div class="text-sm text-destructive">{error}</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" disabled={loading} on:click={() => (open = false)}>
				Cancel
			</Button>
			<Button
				variant="destructive"
				disabled={!canDelete || loading}
				on:click={handleDelete}
			>
				{#if loading}
					<Loader class="mr-2 h-4 w-4 animate-spin" />
					Deleting...
				{:else}
					Delete Collection
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>