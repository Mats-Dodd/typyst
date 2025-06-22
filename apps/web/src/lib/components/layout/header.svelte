<script lang="ts">
	import { collection, collectionId } from '$lib/store';
	import { FileSearchDialog } from '$lib/components/shared/file-search';
	import Button from '@haptic/ui/components/button/button.svelte';
	import { Search } from 'lucide-svelte';

	$: collectionName = $collection?.split('/').pop() || 'files';
</script>

<header
	class="absolute top-0 w-full flex justify-between items-center h-9 border-b pl-20 bg-background/95 backdrop-blur-sm z-40 px-1.5"
>
	<div class="flex-1" />

	<div class="flex items-center">
		<Button
			size="sm"
			variant="ghost"
			class="h-7 px-3 gap-2 text-xs text-muted-foreground hover:text-foreground"
			on:click={() => {
				const event = new KeyboardEvent('keydown', { key: 'p', metaKey: true });
				document.dispatchEvent(event);
			}}
		>
			<Search class="h-3.5 w-3.5" />
			<span>Search {collectionName}</span>
			<!-- <kbd class="ml-1 px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘P</kbd> -->
		</Button>
	</div>

	<div class="flex-1 flex justify-end gap-1">
		<a href="/auth/signout">
			<Button
				size="sm"
				variant="ghost"
				class="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
			>
				Sign Out
			</Button>
		</a>
	</div>
</header>

<FileSearchDialog collectionId={$collectionId} {collectionName} />
