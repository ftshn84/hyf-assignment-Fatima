import knex from 'knex';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const dbFile = join(__dirname, 'hyf_node_week1');
const config = isProduction
    ? {
        client: 'pg',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        },
    }
    : {
        client: 'sqlite3',
        connection: {
            filename: process.env.DB_FILENAME || dbFile,
        },
        pool: {
            afterCreate: (conn, done) => {
                conn.run('PRAGMA foreign_keys = ON', done);
            },
        },
        useNullAsDefault: true,
    };

const db = knex(config);

export const ensureSchema = async () => {
    const hasUsers = await db.schema.hasTable('users');
    if (!hasUsers) {
        await db.schema.createTable('users', (table) => {
            table.increments('id').primary();
            table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
            table.timestamp('confirmed_at').nullable();
            table.string('first_name').notNullable();
            table.string('last_name').notNullable();
            table.string('email').notNullable().unique();
            table.string('token').unique();
        });
    }

    const hasSnippets = await db.schema.hasTable('snippets');
    if (!hasSnippets) {
        await db.schema.createTable('snippets', (table) => {
            table.increments('id').primary();
            table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
            table.integer('user_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
            table.string('title').notNullable();
            table.text('contents').notNullable();
            table.boolean('is_private').notNullable().defaultTo(true);
        });
    }

    const hasUpdatedAt = await db.schema.hasColumn('snippets', 'updated_at');
    if (!hasUpdatedAt) {
        await db.schema.alterTable('snippets', (table) => {
            table.timestamp('updated_at').nullable();
        });
    }

    const hasTags = await db.schema.hasTable('tags');
    if (!hasTags) {
        await db.schema.createTable('tags', (table) => {
            table.increments('id').primary();
            table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
            table.string('name').notNullable().unique();
        });
    }

    const hasSnippetTags = await db.schema.hasTable('snippet_tags');
    if (!hasSnippetTags) {
        await db.schema.createTable('snippet_tags', (table) => {
            table.integer('snippet_id').notNullable().references('id').inTable('snippets').onDelete('CASCADE');
            table.integer('tag_id').notNullable().references('id').inTable('tags').onDelete('CASCADE');
            table.primary(['snippet_id', 'tag_id']);
        });
    }
};

export default db;