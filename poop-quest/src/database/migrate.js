#!/usr/bin/env node

/**
 * Database migration runner
 * Executes all SQL migration files in order
 */

import { runMigrations } from './connection.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
    try {
        console.log('Starting database migrations...');
        await runMigrations();
        console.log('All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}