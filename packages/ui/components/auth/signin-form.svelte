<script lang="ts">
	import { Input } from '../input';
	import { Label } from '../label';
	import AuthForm from './auth-form.svelte';

	export let onSubmit: (data: { email: string; password: string }) => Promise<void>;
	export let error: string | null = null;
	export let loading: boolean = false;
	export let className: string = '';

	async function handleSubmit(formData: FormData) {
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		await onSubmit({ email, password });
	}
</script>

<AuthForm
	title="Welcome back"
	subtitle="Enter your credentials to sign in to your account"
	submitLabel="Sign In"
	onSubmit={handleSubmit}
	{error}
	{loading}
	{className}
>
	<div class="grid grid-cols-1 gap-4">
		<div class="grid gap-2">
			<Label for="email">Email</Label>
			<Input
				id="email"
				name="email"
				type="email"
				placeholder="name@example.com"
				autocomplete="email"
				required
				disabled={loading}
			/>
		</div>
		<div class="grid gap-2">
			<Label for="password">Password</Label>
			<Input
				id="password"
				name="password"
				type="password"
				placeholder="Enter your password"
				autocomplete="current-password"
				required
				disabled={loading}
			/>
		</div>
	</div>

	<div slot="footer">
		<slot name="footer" />
	</div>
</AuthForm>
