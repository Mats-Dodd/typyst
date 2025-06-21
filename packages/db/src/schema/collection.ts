import { pgTable, uuid, text, timestamp, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { user } from './user';

export const collection = pgTable(
  'collection',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    name: text('name').notNull(),
    lastOpened: timestamp('last_opened', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [uniqueIndex('collection_user_path_idx').on(table.userId, table.path)]
);

export const collectionSettings = pgTable(
  'collection_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collection.id, { onDelete: 'cascade' })
      .unique(),
    editor: jsonb('editor').notNull(),
    notes: jsonb('notes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  (table) => [uniqueIndex('collection_settings_collection_id_idx').on(table.collectionId)]
);
