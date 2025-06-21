<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '@/components/shared/icon.svelte';
</script>

<main class="flex min-h-screen w-full items-center justify-center">
	<div class="flex flex-col items-center gap-4 text-center">
		<Icon name="cloudX" class="h-12 w-12 text-destructive" />
		<h1 class="text-2xl font-semibold">Authentication Error</h1>
		<p class="text-muted-foreground max-w-md">
			{$page.error?.message ||
				'An error occurred while verifying your session. Please try logging in again.'}
		</p>
		<a
			href="/auth/signin"
			class="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
		>
			Go to Sign In
		</a>
	</div>
</main>
