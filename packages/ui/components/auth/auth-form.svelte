<script lang="ts">
	import { Button } from '../button';
	import { Input } from '../input';
	import { Label } from '../label';
	import { cn } from '../../lib/utils';
	import AuthError from './auth-error.svelte';
	import AuthLoading from './auth-loading.svelte';

	export let title: string;
	export let subtitle: string = '';
	export let submitLabel: string;
	export let onSubmit: (data: FormData) => Promise<void>;
	export let error: string | null = null;
	export let loading: boolean = false;
	export let className: string = '';

	let formElement: HTMLFormElement;

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (loading) return;

		const formData = new FormData(formElement);
		await onSubmit(formData);
	}
</script>

<div class={cn('mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]', className)}>
	<div class="flex flex-col space-y-2 text-center">
		<h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
		{#if subtitle}
			<p class="text-sm text-muted-foreground">{subtitle}</p>
		{/if}
	</div>

	<div class="grid gap-6">
		<form bind:this={formElement} on:submit={handleSubmit} class="space-y-4">
			<slot />

			{#if error}
				<AuthError {error} />
			{/if}

			<Button type="submit" class="w-full" disabled={loading}>
				{#if loading}
					<AuthLoading size="sm" className="mr-2" />
				{/if}
				{submitLabel}
			</Button>
		</form>

		<slot name="footer" />
	</div>
</div>
