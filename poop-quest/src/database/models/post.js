import { withDatabase, promisifyDb, prepareStatement } from '../connection.js';

/**
 * Post model with CRUD operations
 * Follows patterns from use-cases examples with SQLite-specific implementations
 */
export class Post {
    constructor(data) {
        this.id = data.id || null;
        this.slug = data.slug || null;
        this.title = data.title || null;
        this.description = data.description || null;
        this.html_content = data.html_content || null;
        this.discord_user_id = data.discord_user_id || null;
        this.discord_username = data.discord_username || null;
        this.created_at = data.created_at || null;
        this.updated_at = data.updated_at || null;
    }

    /**
     * Validate post data
     * Ensures all required fields are present and valid
     */
    validate() {
        const errors = [];

        if (!this.slug || this.slug.trim() === '') {
            errors.push('Slug is required');
        }

        if (!this.title || this.title.trim() === '') {
            errors.push('Title is required');
        }

        if (!this.description || this.description.trim() === '') {
            errors.push('Description is required');
        }

        if (!this.html_content || this.html_content.trim() === '') {
            errors.push('HTML content is required');
        }

        if (!this.discord_user_id || this.discord_user_id.trim() === '') {
            errors.push('Discord user ID is required');
        }

        if (!this.discord_username || this.discord_username.trim() === '') {
            errors.push('Discord username is required');
        }

        // Validate slug format (URL-safe)
        if (this.slug && !/^[a-z0-9-]+$/.test(this.slug)) {
            errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
        }

        return errors;
    }

    /**
     * Create a new post
     * Validates data and inserts into database
     */
    static async create(data) {
        const post = new Post(data);
        const validationErrors = post.validate();

        if (validationErrors.length > 0) {
            throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }

        return await withDatabase(async (db) => {
            const dbAsync = promisifyDb(db);

            // Check if slug already exists
            const existingPost = await dbAsync.get(
                'SELECT id FROM posts WHERE slug = ?',
                [post.slug]
            );

            if (existingPost) {
                throw new Error(`Post with slug '${post.slug}' already exists`);
            }

            // Insert new post
            const result = await dbAsync.run(
                `INSERT INTO posts (slug, title, description, html_content, discord_user_id, discord_username)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [post.slug, post.title, post.description, post.html_content, post.discord_user_id, post.discord_username]
            );

            // Fetch the created post
            const createdPost = await dbAsync.get(
                'SELECT * FROM posts WHERE id = ?',
                [result.lastID]
            );

            return new Post(createdPost);
        });
    }

    /**
     * Find a post by its slug
     * Returns null if not found
     */
    static async findBySlug(slug) {
        if (!slug || slug.trim() === '') {
            return null;
        }

        return await withDatabase(async (db) => {
            const dbAsync = promisifyDb(db);
            const postData = await dbAsync.get(
                'SELECT * FROM posts WHERE slug = ?',
                [slug.trim()]
            );

            return postData ? new Post(postData) : null;
        });
    }

    /**
     * Find a post by its ID
     * Returns null if not found
     */
    static async findById(id) {
        if (!id || isNaN(id)) {
            return null;
        }

        return await withDatabase(async (db) => {
            const dbAsync = promisifyDb(db);
            const postData = await dbAsync.get(
                'SELECT * FROM posts WHERE id = ?',
                [parseInt(id)]
            );

            return postData ? new Post(postData) : null;
        });
    }

    /**
     * Get all posts with pagination
     * Returns array of posts ordered by created_at (newest first)
     */
    static async findAll(options = {}) {
        const {
            limit = 20,
            offset = 0,
            orderBy = 'created_at',
            orderDirection = 'DESC'
        } = options;

        // Validate orderBy and orderDirection for security
        const validColumns = ['id', 'slug', 'title', 'created_at', 'updated_at'];
        const validDirections = ['ASC', 'DESC'];

        if (!validColumns.includes(orderBy)) {
            throw new Error(`Invalid orderBy column: ${orderBy}`);
        }

        if (!validDirections.includes(orderDirection.toUpperCase())) {
            throw new Error(`Invalid orderDirection: ${orderDirection}`);
        }

        return await withDatabase(async (db) => {
            const dbAsync = promisifyDb(db);
            const posts = await dbAsync.all(
                `SELECT * FROM posts ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`,
                [limit, offset]
            );

            return posts.map(postData => new Post(postData));
        });
    }

    /**
     * Get posts count
     * Returns total number of posts
     */
    static async getCount() {
        return await withDatabase(async (db) => {
            const dbAsync = promisifyDb(db);
            const result = await dbAsync.get('SELECT COUNT(*) as count FROM posts');
            return result.count;
        });
    }

    /**
     * Find posts by Discord user ID
     * Returns array of posts for a specific user
     */
    static async findByDiscordUserId(discordUserId, options = {}) {
        if (!discordUserId || discordUserId.trim() === '') {
            return [];
        }

        const {
            limit = 20,
            offset = 0,
            orderBy = 'created_at',
            orderDirection = 'DESC'
        } = options;

        return await withDatabase(async (db) => {
            const dbAsync = promisifyDb(db);
            const posts = await dbAsync.all(
                `SELECT * FROM posts WHERE discord_user_id = ? ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`,
                [discordUserId.trim(), limit, offset]
            );

            return posts.map(postData => new Post(postData));
        });
    }

    /**
     * Update a post
     * Only allows updating title, description, and html_content
     */
    async update(updateData) {
        if (!this.id) {
            throw new Error('Cannot update post without ID');
        }

        const allowedFields = ['title', 'description', 'html_content'];
        const updates = {};

        // Only allow updating specific fields
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updates[field] = updateData[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            throw new Error('No valid fields to update');
        }

        // Validate updated data
        const tempPost = new Post({ ...this, ...updates });
        const validationErrors = tempPost.validate();

        if (validationErrors.length > 0) {
            throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }

        return await withDatabase(async (db) => {
            const dbAsync = promisifyDb(db);
            const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(updates), this.id];

            await dbAsync.run(
                `UPDATE posts SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                values
            );

            // Return updated post
            const updatedPost = await dbAsync.get(
                'SELECT * FROM posts WHERE id = ?',
                [this.id]
            );

            return new Post(updatedPost);
        });
    }

    /**
     * Delete a post
     * Permanently removes the post from the database
     */
    async delete() {
        if (!this.id) {
            throw new Error('Cannot delete post without ID');
        }

        return await withDatabase(async (db) => {
            const dbAsync = promisifyDb(db);
            const result = await dbAsync.run(
                'DELETE FROM posts WHERE id = ?',
                [this.id]
            );

            return result.changes > 0;
        });
    }

    /**
     * Check if a slug is available
     * Returns true if slug is available, false if taken
     */
    static async isSlugAvailable(slug) {
        if (!slug || slug.trim() === '') {
            return false;
        }

        const existingPost = await Post.findBySlug(slug);
        return existingPost === null;
    }

    /**
     * Generate a unique slug from title
     * Creates URL-safe slug and ensures uniqueness
     */
    static async generateUniqueSlug(title) {
        if (!title || title.trim() === '') {
            throw new Error('Title is required to generate slug');
        }

        // Basic slug generation (this will be enhanced by the slug sanitizer utility)
        let baseSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        if (baseSlug === '') {
            baseSlug = 'untitled';
        }

        // Check if slug is available
        if (await Post.isSlugAvailable(baseSlug)) {
            return baseSlug;
        }

        // Generate unique slug by appending number
        let counter = 1;
        let uniqueSlug = `${baseSlug}-${counter}`;

        while (!(await Post.isSlugAvailable(uniqueSlug))) {
            counter++;
            uniqueSlug = `${baseSlug}-${counter}`;
        }

        return uniqueSlug;
    }

    /**
     * Convert post to JSON representation
     * Removes sensitive data and formats dates
     */
    toJSON() {
        return {
            id: this.id,
            slug: this.slug,
            title: this.title,
            description: this.description,
            html_content: this.html_content,
            discord_username: this.discord_username,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    /**
     * Convert post to safe JSON (without HTML content)
     * Useful for API responses and previews
     */
    toSafeJSON() {
        return {
            id: this.id,
            slug: this.slug,
            title: this.title,
            description: this.description,
            discord_username: this.discord_username,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

export default Post;