<script lang="ts">
	import { SigninForm } from '@haptic/ui/components/auth';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let error: string | null = null;
	let loading = false;

	async function handleSignin(data: { email: string; password: string }) {
		loading = true;
		error = null;

		try {
			const result = await authClient.signIn.email({
				email: data.email,
				password: data.password
			});

			if (result.error) {
				error = result.error.message || 'Authentication failed';
			} else {
				const redirectTo = $page.url.searchParams.get('redirectTo') || '/notes';
				goto(redirectTo);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign In - Haptic</title>
</svelte:head>

<div
	class="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0"
>
	<div class="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
		<div class="absolute inset-0 bg-zinc-900" />
		<div class="relative z-20 flex items-center text-lg font-medium">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mr-2 h-6 w-6"
			>
				<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
			</svg>
			Haptic
		</div>
		<div class="relative z-20 mt-auto">
			<blockquote class="space-y-2">
				<p class="text-lg">
					"Haptic has transformed how I organize my thoughts and manage my daily tasks. The seamless
					note-taking experience is unmatched."
				</p>
				<footer class="text-sm">Sofia Davis</footer>
			</blockquote>
		</div>
	</div>

	<div class="lg:p-8">
		<div class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
			<SigninForm onSubmit={handleSignin} {error} {loading} />

			<p class="px-8 text-center text-sm text-muted-foreground">
				Don't have an account?{' '}
				<a
					href="/auth/signup{$page.url.search}"
					class="underline underline-offset-4 hover:text-primary"
				>
					Sign up
				</a>
			</p>
		</div>
	</div>
</div>
