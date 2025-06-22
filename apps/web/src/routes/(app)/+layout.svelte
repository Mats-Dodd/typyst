<script lang="ts">
	import { loadSettings } from '@/api/settings';
	import { loadCollection } from '@/api/collection';
	import Footer from '@/components/layout/footer.svelte';
	import Header from '@/components/layout/header.svelte';
	import Sidebar from '@/components/layout/sidebar.svelte';
	import Command from '@/components/shared/command-menu/command.svelte';
	import Icon from '@/components/shared/icon.svelte';
	import { createDeviceDetector } from '@/utils';
	import '@haptic/ui/app.web.css';
	import { ModeWatcher } from 'mode-watcher';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	const device = createDeviceDetector();

	async function loadLatestCollection() {
		try {
			const response = await fetch('/api/collections/latest');
			if (!response.ok) {
				throw new Error('Failed to load latest collection');
			}
			const data = await response.json();
			if (data && data.path) {
				await loadCollection(data.path);
			}
		} catch (error) {
			console.error('Error loading latest collection:', error);
		}
	}

	onMount(async () => {
		await loadLatestCollection();

		loadSettings(true, true);
	});
</script>

<svelte:head>
	<title>Haptic</title>
	<meta
		name="description"
		content="Haptic is a new local-first & privacy-focused home for your markdown notes. It's a minimalistic, lightweight and fast note-taking app that's designed to be distraction-free."
	/>
	<meta
		name="keywords"
		content="Haptic, Note-taking, Markdown, Local-first, Privacy-focused, Open-source, Online Markdown Editor, Fast Note-taking, Minimalistic Design"
	/>
	<meta name="author" content="Haptic" />
	<meta name="robots" content="index, follow" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#0F0F0F" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

	<!-- Open Graph -->
	<meta property="og:site_name" content="Haptic" />
	<meta property="og:locale" content="en" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://haptic.md/" />
	<meta property="og:title" content="Haptic - Write Notes at the speed of touch" />
	<meta
		property="og:description"
		content="Haptic is a new local-first & privacy-focused home for your markdown notes. It's a minimalistic, lightweight and fast note-taking app that's designed to be distraction-free."
	/>
	<meta property="og:image" content="https://haptic.md/landing.png" />
	<meta property="og:image:alt" content="Haptic - Markdown Editor" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="627" />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:url" content="https://haptic.md/" />
	<meta property="twitter:title" content="Haptic - Write Notes at the speed of touch" />
	<meta
		property="twitter:description"
		content="Haptic is a new local-first & privacy-focused home for your markdown notes. It's a minimalistic, lightweight and fast note-taking app that's designed to be distraction-free."
	/>
	<meta property="twitter:image" content="https://haptic.md/landing.png" />

	{#if import.meta.env.PROD}
		<script
			defer
			src="https://cloud.umami.is/script.js"
			data-website-id="279d8c15-20ea-4cc9-91b0-647c90767f15"
		></script>
		<script async src="https://cdn.seline.so/seline.js" data-token="d028e058129b859"></script>
	{/if}
</svelte:head>

{#if $device.isDesktop}
	{#if data.session}
		<Command />
		<ModeWatcher />
		<Header />
		<Sidebar />
		<main class="flex min-h-screen w-full items-center justify-center">
			<slot />
		</main>
		<Footer />
	{:else}
		<main class="flex min-h-screen w-full items-center justify-center">
			<div class="text-muted-foreground">Redirecting to login...</div>
		</main>
	{/if}
{:else}
	<main class="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-5">
		<Icon name="phoneOff" class="w-9 h-9 fill-none text-secondary-foreground" />
		<div class="flex flex-col text-center gap-2">
			<h1 class="text-secondary-foreground">Seems like you're on mobile</h1>
			<p class="text-muted-foreground text-sm leading-relaxed">
				Haptic isn't yet supported on mobile devices.<br />Please try again on a desktop.
			</p>
		</div>
	</main>
{/if}

<style>
	/* Custom scrollbar */
	:global(::-webkit-scrollbar) {
		width: 14px;
	}

	:global(::-webkit-scrollbar-thumb) {
		border: 4px solid rgba(0, 0, 0, 0);
		background-clip: padding-box;
		border-radius: 50px;
		background-color: hsl(var(--border) / 1);

		&:hover {
			background-color: hsl(var(--foreground) / 0.15);
		}
	}
</style>
