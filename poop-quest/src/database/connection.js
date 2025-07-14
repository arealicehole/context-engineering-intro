import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// Enable verbose mode for debugging (disable in production)
const verbose = process.env.NODE_ENV === 'development';
const sqlite = verbose ? sqlite3.verbose() : sqlite3;

let dbInstance = null;

/**
 * Get database connection singleton
 * Following the pattern from use-cases/mcp-server but adapted for SQLite3
 */
export function getDb(databasePath = process.env.DATABASE_PATH || './database.db') {
    if (!dbInstance) {
        try {
            // Ensure database directory exists
            const dbDir = path.dirname(databasePath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            dbInstance = new sqlite.Database(databasePath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    throw err;
                }
                if (verbose) {
                    console.log('Connected to SQLite database:', databasePath);
                }
            });

            // Enable foreign key constraints
            dbInstance.run('PRAGMA foreign_keys = ON');
            
            // Enable WAL mode for better concurrency
            dbInstance.run('PRAGMA journal_mode = WAL');
            
            // Set reasonable timeout for busy database
            dbInstance.run('PRAGMA busy_timeout = 5000');

        } catch (error) {
            console.error('Failed to create database connection:', error);
            throw error;
        }
    }
    return dbInstance;
}

/**
 * Close database connection
 * Call this when the application is shutting down
 */
export async function closeDb() {
    if (dbInstance) {
        try {
            await new Promise((resolve, reject) => {
                dbInstance.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
            if (verbose) {
                console.log('Database connection closed');
            }
        } catch (error) {
            console.error('Error closing database connection:', error);
        } finally {
            dbInstance = null;
        }
    }
}

/**
 * Execute database operation with connection wrapper
 * Provides consistent error handling and timing
 */
export async function withDatabase(operation) {
    const startTime = Date.now();
    const db = getDb();
    
    try {
        const result = await operation(db);
        const duration = Date.now() - startTime;
        
        if (verbose) {
            console.log(`Database operation completed in ${duration}ms`);
        }
        
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`Database operation failed after ${duration}ms:`, error);
        throw error;
    }
}

/**
 * Run migration scripts
 * Executes SQL files in the migrations directory
 */
export async function runMigrations() {
    const migrationsDir = path.join(process.cwd(), 'src', 'database', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
        console.log('No migrations directory found, skipping migrations');
        return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

    for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        try {
            await withDatabase(async (db) => {
                return new Promise((resolve, reject) => {
                    db.exec(sql, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });
            
            console.log(`Migration ${file} applied successfully`);
        } catch (error) {
            console.error(`Migration ${file} failed:`, error);
            throw error;
        }
    }
}

/**
 * Promisify sqlite3 methods for easier async/await usage
 */
export function promisifyDb(db) {
    return {
        run: promisify(db.run.bind(db)),
        get: promisify(db.get.bind(db)),
        all: promisify(db.all.bind(db)),
        exec: promisify(db.exec.bind(db))
    };
}

/**
 * Create a prepared statement wrapper
 * Provides better performance for repeated queries
 */
export function prepareStatement(db, sql) {
    const stmt = db.prepare(sql);
    return {
        run: promisify(stmt.run.bind(stmt)),
        get: promisify(stmt.get.bind(stmt)),
        all: promisify(stmt.all.bind(stmt)),
        finalize: promisify(stmt.finalize.bind(stmt))
    };
}

/**
 * Handle graceful shutdown
 * Ensures database connection is closed on process exit
 */
process.on('SIGINT', async () => {
    console.log('Received SIGINT, closing database connection...');
    await closeDb();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing database connection...');
    await closeDb();
    process.exit(0);
});

export default { getDb, closeDb, withDatabase, runMigrations, promisifyDb, prepareStatement };