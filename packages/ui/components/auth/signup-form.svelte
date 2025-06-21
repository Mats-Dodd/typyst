<script lang="ts">
	import { Input } from '../input';
	import { Label } from '../label';
	import AuthForm from './auth-form.svelte';

	export let onSubmit: (data: { name: string; email: string; password: string }) => Promise<void>;
	export let error: string | null = null;
	export let loading: boolean = false;
	export let className: string = '';

	async function handleSubmit(formData: FormData) {
		const name = formData.get('name') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		await onSubmit({ name, email, password });
	}
</script>

<AuthForm
	title="Create an account"
	subtitle="Enter your information to create your account"
	submitLabel="Create Account"
	onSubmit={handleSubmit}
	{error}
	{loading}
	{className}
>
	<div class="grid grid-cols-1 gap-4">
		<div class="grid gap-2">
			<Label for="name">Name</Label>
			<Input
				id="name"
				name="name"
				type="text"
				placeholder="Your full name"
				autocomplete="name"
				required
				disabled={loading}
			/>
		</div>
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
				placeholder="Create a password"
				autocomplete="new-password"
				required
				disabled={loading}
				minlength={8}
			/>
		</div>
	</div>

	<div slot="footer">
		<slot name="footer" />
	</div>
</AuthForm>
