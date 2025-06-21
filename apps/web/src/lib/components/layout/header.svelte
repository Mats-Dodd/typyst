<script lang="ts">
	import { collection } from '$lib/store';
	import Button from '@haptic/ui/components/button/button.svelte';
</script>

<header
	class="absolute top-0 w-full flex justify-between items-center h-9 border-b pl-20 bg-background z-40 px-1.5"
>
	<div />
	<p
		class="pointer-events-none text-sm text-foreground/85 hover:text-foreground/100 transition-all cursor-default outline-none -mr-[159px]"
	>
		{$collection?.split('/').pop() || ''}
	</p>
	<div class="flex gap-1">
		<a href="/auth/signout">
			<Button size="sm" scale="sm" class="rounded-full h-[27px] px-2.5">Sign Out</Button>
		</a>
	</div>
</header>
