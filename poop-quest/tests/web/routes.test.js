/**
 * Web Routes Tests
 * Comprehensive tests for Express.js routes using Supertest
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { jest } from '@jest/globals';
import { createWebServer } from '../../src/web/server.js';

// Mock database
jest.unstable_mockModule('../../src/database/models/post.js', () => ({
    Post: {
        findAll: jest.fn(),
        findBySlug: jest.fn(),
        findByDiscordUserId: jest.fn(),
        getCount: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        toSafeJSON: jest.fn()
    }
}));

// Mock AI services
jest.unstable_mockModule('../../src/ai/content-analyzer.js', () => ({
    analyzeContent: jest.fn()
}));

// Mock Discord bot
jest.unstable_mockModule('../../src/bot/discord-bot.js', () => ({
    createDiscordBot: jest.fn()
}));

let app;
let Post;
let analyzeContent;

describe('Web Routes', () => {
    beforeAll(async () => {
        // Import mocked modules
        const postModule = await import('../../src/database/models/post.js');
        const aiModule = await import('../../src/ai/content-analyzer.js');
        
        Post = postModule.Post;
        analyzeContent = aiModule.analyzeContent;
        
        // Create test app
        app = await createWebServer();
        
        // Set test environment
        app.locals.baseUrl = 'https://test.poop.quest';
        app.locals.version = '1.0.0-test';
        app.locals.environment = 'test';
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup default mock responses
        Post.getCount.mockResolvedValue(10);
        Post.findAll.mockResolvedValue([]);
        Post.findBySlug.mockResolvedValue(null);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Homepage Route (/)', () => {
        test('should render homepage with posts', async () => {
            const mockPosts = [
                {
                    id: 1,
                    slug: 'test-post-1',
                    title: 'Test Post 1',
                    description: 'First test post',
                    html_content: '<h1>Test</h1>',
                    discord_user_id: 'user-123',
                    discord_username: 'testuser',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: 2,
                    slug: 'test-post-2',
                    title: 'Test Post 2',
                    description: 'Second test post',
                    html_content: '<h1>Test 2</h1>',
                    discord_user_id: 'user-456',
                    discord_username: 'testuser2',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];

            Post.findAll.mockResolvedValue(mockPosts);
            Post.getCount.mockResolvedValue(25);

            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.text).toContain('Poop Quest');
            expect(response.text).toContain('Test Post 1');
            expect(response.text).toContain('Test Post 2');
            expect(response.headers['content-type']).toMatch(/html/);
        });

        test('should handle pagination', async () => {
            const mockPosts = Array.from({ length: 12 }, (_, i) => ({
                id: i + 1,
                slug: `test-post-${i + 1}`,
                title: `Test Post ${i + 1}`,
                description: `Test post ${i + 1}`,
                html_content: `<h1>Test ${i + 1}</h1>`,
                discord_user_id: 'user-123',
                discord_username: 'testuser',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            Post.findAll.mockResolvedValue(mockPosts);
            Post.getCount.mockResolvedValue(50);

            const response = await request(app)
                .get('/?page=2')
                .expect(200);

            expect(Post.findAll).toHaveBeenCalledWith({
                limit: 12,
                offset: 12,
                orderBy: 'created_at',
                orderDirection: 'DESC'
            });
        });

        test('should handle invalid page numbers', async () => {
            Post.findAll.mockResolvedValue([]);
            Post.getCount.mockResolvedValue(0);

            const response = await request(app)
                .get('/?page=-1')
                .expect(200);

            expect(Post.findAll).toHaveBeenCalledWith({
                limit: 12,
                offset: 0,
                orderBy: 'created_at',
                orderDirection: 'DESC'
            });
        });

        test('should handle database errors', async () => {
            Post.findAll.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/')
                .expect(500);

            expect(response.text).toContain('Error Loading Posts');
        });
    });

    describe('Post Route (/:slug)', () => {
        test('should render individual post', async () => {
            const mockPost = {
                id: 1,
                slug: 'test-post',
                title: 'Test Post',
                description: 'A test post',
                html_content: '<h1>Test</h1><p>This is a test post.</p>',
                discord_user_id: 'user-123',
                discord_username: 'testuser',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const relatedPosts = [
                {
                    id: 2,
                    slug: 'related-post',
                    title: 'Related Post',
                    description: 'A related post',
                    discord_user_id: 'user-123',
                    discord_username: 'testuser',
                    created_at: new Date().toISOString()
                }
            ];

            Post.findBySlug.mockResolvedValue(mockPost);
            Post.findByDiscordUserId.mockResolvedValue(relatedPosts);

            const response = await request(app)
                .get('/test-post')
                .expect(200);

            expect(response.text).toContain('Test Post');
            expect(response.text).toContain('This is a test post.');
            expect(response.text).toContain('testuser');
            expect(response.headers['content-type']).toMatch(/html/);
        });

        test('should return 404 for non-existent post', async () => {
            Post.findBySlug.mockResolvedValue(null);

            const response = await request(app)
                .get('/non-existent-post')
                .expect(404);

            expect(response.text).toContain('Post Not Found');
        });

        test('should validate slug format', async () => {
            const response = await request(app)
                .get('/invalid slug!')
                .expect(404);

            expect(response.text).toContain('Invalid post URL format');
        });

        test('should handle database errors', async () => {
            Post.findBySlug.mockRejectedValue(new Error('Database error'));

            const response = await request(app)
                .get('/test-post')
                .expect(500);

            expect(response.text).toContain('Error Loading Post');
        });

        test('should include SEO metadata', async () => {
            const mockPost = {
                id: 1,
                slug: 'seo-test-post',
                title: 'SEO Test Post',
                description: 'A post for testing SEO',
                html_content: '<h1>SEO Test</h1>',
                discord_user_id: 'user-123',
                discord_username: 'testuser',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            Post.findBySlug.mockResolvedValue(mockPost);
            Post.findByDiscordUserId.mockResolvedValue([]);

            const response = await request(app)
                .get('/seo-test-post')
                .expect(200);

            expect(response.text).toContain('<meta property="og:title"');
            expect(response.text).toContain('<meta property="og:description"');
            expect(response.text).toContain('<meta name="twitter:card"');
            expect(response.text).toContain('application/ld+json');
        });
    });

    describe('Post Preview Route (/:slug/preview)', () => {
        test('should render post preview', async () => {
            const mockPost = {
                id: 1,
                slug: 'preview-test',
                title: 'Preview Test',
                description: 'A preview test',
                html_content: '<h1>Preview</h1>',
                discord_user_id: 'user-123',
                discord_username: 'testuser',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            Post.findBySlug.mockResolvedValue(mockPost);

            const response = await request(app)
                .get('/preview-test/preview')
                .expect(200);

            expect(response.text).toContain('Preview: Preview Test');
            expect(response.text).toContain('Preview</h1>');
        });

        test('should include noindex meta tag', async () => {
            const mockPost = {
                id: 1,
                slug: 'preview-test',
                title: 'Preview Test',
                description: 'A preview test',
                html_content: '<h1>Preview</h1>',
                discord_user_id: 'user-123',
                discord_username: 'testuser',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            Post.findBySlug.mockResolvedValue(mockPost);

            const response = await request(app)
                .get('/preview-test/preview')
                .expect(200);

            expect(response.text).toContain('noindex');
        });

        test('should return 404 for non-existent post preview', async () => {
            Post.findBySlug.mockResolvedValue(null);

            const response = await request(app)
                .get('/non-existent/preview')
                .expect(404);

            expect(response.text).toContain('Post Not Found');
        });
    });

    describe('Post Raw Content Route (/:slug/raw)', () => {
        test('should return raw HTML content', async () => {
            const mockPost = {
                id: 1,
                slug: 'raw-test',
                title: 'Raw Test',
                description: 'A raw test',
                html_content: '<h1>Raw HTML</h1><p>This is raw content.</p>',
                discord_user_id: 'user-123',
                discord_username: 'testuser',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            Post.findBySlug.mockResolvedValue(mockPost);

            const response = await request(app)
                .get('/raw-test/raw')
                .expect(200);

            expect(response.text).toBe('<h1>Raw HTML</h1><p>This is raw content.</p>');
            expect(response.headers['content-type']).toMatch(/text\/html/);
        });

        test('should return 404 for non-existent post raw content', async () => {
            Post.findBySlug.mockResolvedValue(null);

            const response = await request(app)
                .get('/non-existent/raw')
                .expect(404);

            expect(response.body).toEqual({
                error: 'Post not found',
                status: 404
            });
        });
    });

    describe('Search Route (/search)', () => {
        test('should render search page without query', async () => {
            const response = await request(app)
                .get('/search')
                .expect(200);

            expect(response.text).toContain('Search - Poop Quest');
            expect(response.text).toContain('Search for posts');
        });

        test('should search posts with query', async () => {
            const mockPosts = [
                {
                    id: 1,
                    slug: 'search-result-1',
                    title: 'JavaScript Tutorial',
                    description: 'Learn JavaScript basics',
                    html_content: '<h1>JavaScript</h1>',
                    discord_user_id: 'user-123',
                    discord_username: 'testuser',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];

            Post.findAll.mockResolvedValue(mockPosts);

            const response = await request(app)
                .get('/search?q=javascript')
                .expect(200);

            expect(response.text).toContain('Search Results for "javascript"');
            expect(response.text).toContain('JavaScript Tutorial');
        });

        test('should handle empty search results', async () => {
            Post.findAll.mockResolvedValue([]);

            const response = await request(app)
                .get('/search?q=nonexistent')
                .expect(200);

            expect(response.text).toContain('Search Results for "nonexistent"');
        });

        test('should handle search errors', async () => {
            Post.findAll.mockRejectedValue(new Error('Search error'));

            const response = await request(app)
                .get('/search?q=test')
                .expect(500);

            expect(response.text).toContain('Search Error');
        });
    });

    describe('Static Pages', () => {
        test('should render about page', async () => {
            const response = await request(app)
                .get('/about')
                .expect(200);

            expect(response.text).toContain('About - Poop Quest');
        });

        test('should render privacy page', async () => {
            const response = await request(app)
                .get('/privacy')
                .expect(200);

            expect(response.text).toContain('Privacy Policy - Poop Quest');
        });

        test('should render terms page', async () => {
            const response = await request(app)
                .get('/terms')
                .expect(200);

            expect(response.text).toContain('Terms of Service - Poop Quest');
        });

        test('should render stats page', async () => {
            Post.getCount.mockResolvedValue(42);
            Post.findAll.mockResolvedValue([
                {
                    id: 1,
                    slug: 'recent-post',
                    title: 'Recent Post',
                    description: 'A recent post',
                    toSafeJSON: jest.fn().mockReturnValue({
                        id: 1,
                        slug: 'recent-post',
                        title: 'Recent Post'
                    })
                }
            ]);

            const response = await request(app)
                .get('/stats')
                .expect(200);

            expect(response.text).toContain('Statistics - Poop Quest');
        });

        test('should handle stats page errors', async () => {
            Post.getCount.mockRejectedValue(new Error('Stats error'));

            const response = await request(app)
                .get('/stats')
                .expect(500);

            expect(response.text).toContain('Stats Error');
        });
    });

    describe('API Routes', () => {
        test('should return health check', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toEqual({
                status: 'healthy',
                timestamp: expect.any(String),
                version: '1.0.0-test',
                environment: 'test'
            });
        });

        test('should return stats API', async () => {
            Post.getCount.mockResolvedValue(15);

            const response = await request(app)
                .get('/api/stats')
                .expect(200);

            expect(response.body).toEqual({
                totalPosts: 15,
                timestamp: expect.any(String)
            });
        });

        test('should return posts API', async () => {
            const mockPosts = [
                {
                    id: 1,
                    slug: 'api-post-1',
                    title: 'API Post 1',
                    description: 'First API post',
                    discord_username: 'testuser',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];

            Post.findAll.mockResolvedValue(mockPosts);

            const response = await request(app)
                .get('/api/posts')
                .expect(200);

            expect(response.body).toEqual({
                posts: mockPosts,
                pagination: {
                    current: 1,
                    limit: 10,
                    total: expect.any(Number),
                    hasNext: false,
                    hasPrev: false
                }
            });
        });

        test('should return sitemap XML', async () => {
            const mockPosts = [
                {
                    slug: 'sitemap-post-1',
                    updated_at: new Date().toISOString()
                },
                {
                    slug: 'sitemap-post-2',
                    updated_at: new Date().toISOString()
                }
            ];

            Post.findAll.mockResolvedValue(mockPosts);

            const response = await request(app)
                .get('/sitemap.xml')
                .expect(200);

            expect(response.headers['content-type']).toMatch(/xml/);
            expect(response.text).toContain('<?xml version="1.0"');
            expect(response.text).toContain('<urlset');
            expect(response.text).toContain('sitemap-post-1');
            expect(response.text).toContain('sitemap-post-2');
        });

        test('should return robots.txt', async () => {
            const response = await request(app)
                .get('/robots.txt')
                .expect(200);

            expect(response.headers['content-type']).toMatch(/text\/plain/);
            expect(response.text).toContain('User-agent: *');
            expect(response.text).toContain('Disallow:');
            expect(response.text).toContain('Sitemap:');
        });
    });

    describe('Error Handling', () => {
        test('should handle 404 errors', async () => {
            const response = await request(app)
                .get('/non-existent-route')
                .expect(404);

            expect(response.text).toContain('Page Not Found');
        });

        test('should handle method not allowed', async () => {
            const response = await request(app)
                .post('/about')
                .expect(405);

            expect(response.text).toContain('Method Not Allowed');
        });

        test('should handle malformed URLs', async () => {
            const response = await request(app)
                .get('/malformed%url')
                .expect(400);

            expect(response.text).toContain('Bad Request');
        });
    });

    describe('Security Headers', () => {
        test('should include security headers', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-xss-protection']).toBe('1; mode=block');
            expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
            expect(response.headers['content-security-policy']).toBeDefined();
        });
    });

    describe('Rate Limiting', () => {
        test('should apply rate limiting to API endpoints', async () => {
            // Make multiple requests quickly
            const requests = Array.from({ length: 10 }, () => 
                request(app).get('/api/posts')
            );

            const responses = await Promise.all(requests);

            // Most should succeed, but some might be rate limited
            const successCount = responses.filter(r => r.status === 200).length;
            const rateLimitedCount = responses.filter(r => r.status === 429).length;

            expect(successCount).toBeGreaterThan(0);
            // Rate limiting might kick in depending on configuration
        });
    });

    describe('Content Negotiation', () => {
        test('should handle JSON accept header for API routes', async () => {
            const response = await request(app)
                .get('/api/posts')
                .set('Accept', 'application/json')
                .expect(200);

            expect(response.headers['content-type']).toMatch(/json/);
        });

        test('should handle HTML accept header for regular routes', async () => {
            Post.findAll.mockResolvedValue([]);
            Post.getCount.mockResolvedValue(0);

            const response = await request(app)
                .get('/')
                .set('Accept', 'text/html')
                .expect(200);

            expect(response.headers['content-type']).toMatch(/html/);
        });
    });

    describe('Performance', () => {
        test('should handle concurrent requests', async () => {
            Post.findAll.mockResolvedValue([]);
            Post.getCount.mockResolvedValue(0);

            const concurrentRequests = Array.from({ length: 20 }, () => 
                request(app).get('/')
            );

            const responses = await Promise.all(concurrentRequests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
        });

        test('should complete requests within reasonable time', async () => {
            Post.findAll.mockResolvedValue([]);
            Post.getCount.mockResolvedValue(0);

            const startTime = Date.now();
            
            await request(app)
                .get('/')
                .expect(200);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });
    });

    describe('Caching', () => {
        test('should include cache headers for static content', async () => {
            const response = await request(app)
                .get('/css/style.css')
                .expect(200);

            expect(response.headers['cache-control']).toBeDefined();
        });

        test('should include ETag for dynamic content', async () => {
            Post.findAll.mockResolvedValue([]);
            Post.getCount.mockResolvedValue(0);

            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.headers['etag']).toBeDefined();
        });
    });
});