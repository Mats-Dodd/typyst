# @haptic/db

Database package for Haptic with Drizzle ORM and Supabase PostgreSQL.

## Setup

Make sure you have the environment variables set in your app:

```bash
SUPABASE_URL=postgresql://postgres:your_password@db.your_project_ref.supabase.co:5432/postgres
```

## Usage

### Basic Import

```typescript
import { db, users } from '@haptic/db';
```

### Create a User

```typescript
import { db, users } from '@haptic/db';

// Insert a new user
const newUser = await db.insert(users).values({
  email: 'user@example.com'
}).returning();

console.log('Created user:', newUser[0]);
```

### Query Users

```typescript
import { db, users } from '@haptic/db';
import { eq } from 'drizzle-orm';

// Get all users
const allUsers = await db.select().from(users);

// Get user by email
const user = await db.select()
  .from(users)
  .where(eq(users.email, 'user@example.com'));
```

### Update a User

```typescript
import { db, users } from '@haptic/db';
import { eq } from 'drizzle-orm';

await db.update(users)
  .set({ email: 'newemail@example.com' })
  .where(eq(users.id, 1));
```

### Delete a User

```typescript
import { db, users } from '@haptic/db';
import { eq } from 'drizzle-orm';

await db.delete(users)
  .where(eq(users.id, 1));
```

### TypeScript Types

```typescript
import { users, type InferSelectModel, type InferInsertModel } from '@haptic/db';

// Type for selecting from users table
type User = InferSelectModel<typeof users>;

// Type for inserting into users table
type NewUser = InferInsertModel<typeof users>;

// Example usage
const createUser = async (userData: NewUser): Promise<User> => {
  const result = await db.insert(users).values(userData).returning();
  return result[0];
};
```

## Available Exports

- `db` - The configured Drizzle database instance
- `users` - The users table schema
- `InferSelectModel`, `InferInsertModel` - TypeScript utility types
- `client` - The raw postgres client (for advanced usage)

## Scripts

- `pnpm build` - Build the package
- `pnpm dev` - Build in watch mode  
- `pnpm migrate:generate` - Generate migrations from schema changes
- `pnpm migrate:push` - Push schema changes to database
- `pnpm studio` - Open Drizzle Studio 