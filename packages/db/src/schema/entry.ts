import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  bigint,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { user } from './user';
import { collection } from './collection';

export const entry = pgTable(
  'entry',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collection.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    name: text('name'),
    parentPath: text('parent_path').notNull(),
    content: text('content'),
    isFolder: boolean('is_folder').default(false),
    size: bigint('size', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [
    uniqueIndex('entry_user_path_idx').on(table.userId, table.path),
    uniqueIndex('entry_collection_path_idx').on(table.collectionId, table.path),
    index('entry_updated_at_idx').on(table.updatedAt),
    index('entry_name_idx').on(table.name),
    index('entry_user_updated_idx').on(table.userId, table.updatedAt),
    index('entry_collection_updated_idx').on(table.collectionId, table.updatedAt)
  ]
);
