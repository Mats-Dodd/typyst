<script lang="ts">
	import { collection, collectionId } from '$lib/store';
	import { FileSearchDialog } from '$lib/components/shared/file-search';
	import Button from '@haptic/ui/components/button/button.svelte';
	import { Search } from 'lucide-svelte';
</script>

<header
	class="absolute top-0 w-full flex justify-between items-center h-9 border-b pl-20 bg-background/95 backdrop-blur-sm z-40 px-1.5"
>
	<div class="flex items-center gap-2">
		<Button
			size="sm"
			variant="ghost"
			class="h-7 px-2 gap-2 text-xs text-muted-foreground hover:text-foreground"
			on:click={() => {
				const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
				document.dispatchEvent(event);
			}}
		>
			<Search class="h-3.5 w-3.5" />
			<span>Search</span>
			<kbd class="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘K</kbd>
		</Button>
	</div>

	<div class="flex-1 flex justify-center">
		<p
			class="text-sm text-foreground/85 hover:text-foreground/100 transition-all cursor-default outline-none"
		>
			{$collection?.split('/').pop() || ''}
		</p>
	</div>

	<div class="flex gap-1">
		<a href="/auth/signout">
			<Button size="sm" scale="sm" class="rounded-full h-[27px] px-2.5">Sign Out</Button>
		</a>
	</div>
</header>

<FileSearchDialog collectionId={$collectionId} />
