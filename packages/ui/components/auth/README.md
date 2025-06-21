# Auth Components

Reusable authentication components for the Haptic UI library.

## Components

### SigninForm
A complete sign-in form with email and password fields.

```svelte
<script>
  import { SigninForm } from '@haptic/ui/components/auth';
  
  async function handleSignin(data) {
    // data: { email: string, password: string }
    const result = await authClient.signIn.email(data);
    // Handle result...
  }
</script>

<SigninForm 
  onSubmit={handleSignin} 
  error={errorMessage} 
  loading={isLoading} 
/>
```

### SignupForm
A complete sign-up form with name, email, and password fields.

```svelte
<script>
  import { SignupForm } from '@haptic/ui/components/auth';
  
  async function handleSignup(data) {
    // data: { name: string, email: string, password: string }
    const result = await authClient.signUp.email(data);
    // Handle result...
  }
</script>

<SignupForm 
  onSubmit={handleSignup} 
  error={errorMessage} 
  loading={isLoading} 
/>
```

### AuthForm
Base form component for creating custom auth forms.

```svelte
<script>
  import { AuthForm } from '@haptic/ui/components/auth';
  import { Input } from '@haptic/ui/components/input';
  import { Label } from '@haptic/ui/components/label';
</script>

<AuthForm 
  title="Custom Auth"
  subtitle="Enter your details"
  submitLabel="Submit"
  onSubmit={handleSubmit}
  error={errorMessage}
  loading={isLoading}
>
  <!-- Custom form fields -->
  <Label for="custom">Custom Field</Label>
  <Input id="custom" name="custom" />
</AuthForm>
```

### AuthError
Error display component for authentication errors.

```svelte
<script>
  import { AuthError } from '@haptic/ui/components/auth';
</script>

<AuthError error="Invalid credentials" />
```

### AuthLoading
Loading spinner component for auth operations.

```svelte
<script>
  import { AuthLoading } from '@haptic/ui/components/auth';
</script>

<AuthLoading size="md" />
<!-- Sizes: sm, md, lg -->
```

## Usage in Routes

The components are designed to be used in authentication routes like:

- `/auth/signin` - Sign in page
- `/auth/signup` - Sign up page  
- `/auth/signout` - Sign out handler

See the web app's auth routes for complete implementation examples. 