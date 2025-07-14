-- Initial database schema for poop-quest
-- Migration: 001_init.sql
-- Created: 2024-01-01

BEGIN TRANSACTION;

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    html_content TEXT NOT NULL,
    discord_user_id TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_discord_user_id ON posts(discord_user_id);

-- Create trigger to update updated_at timestamp on updates
CREATE TRIGGER IF NOT EXISTS update_posts_updated_at
    AFTER UPDATE ON posts
    FOR EACH ROW
    BEGIN
        UPDATE posts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT UNIQUE NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert this migration into the migrations table
INSERT OR IGNORE INTO migrations (migration_name) VALUES ('001_init.sql');

COMMIT;

-- Sample data for development (comment out for production)
-- INSERT INTO posts (slug, title, description, html_content, discord_user_id, discord_username) VALUES 
-- ('welcome-to-poop-quest', 'Welcome to Poop Quest!', 'A sample post to demonstrate the platform.', '<h1>Welcome to Poop Quest!</h1><p>This is a sample post to show how the platform works.</p>', '123456789', 'admin');