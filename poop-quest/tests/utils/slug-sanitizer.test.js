/**
 * Slug Sanitizer Tests
 * Comprehensive tests for URL slug generation and validation
 */

import { describe, test, expect } from '@jest/globals';
import {
    generateSlug,
    validateSlug,
    isReservedSlug,
    generateUniqueSlug,
    titleToSlug,
    cleanUserSlug,
    suggestAlternativeSlug,
    extractSlugFromHTML,
    batchProcessSlugs
} from '../../src/utils/slug-sanitizer.js';

describe('Slug Sanitizer', () => {
    describe('generateSlug', () => {
        test('should generate basic slug from title', () => {
            const result = generateSlug('Hello World');
            expect(result).toBe('hello-world');
        });

        test('should handle special characters', () => {
            const result = generateSlug('Hello & World! @#$%');
            expect(result).toBe('hello-world');
        });

        test('should handle spaces and underscores', () => {
            const result = generateSlug('Hello   World___Test');
            expect(result).toBe('hello-world-test');
        });

        test('should handle diacritics', () => {
            const result = generateSlug('Café & Naïve Résumé');
            expect(result).toBe('cafe-naive-resume');
        });

        test('should handle long titles', () => {
            const longTitle = 'This is a very long title that should be truncated to meet the maximum length requirement for URL slugs';
            const result = generateSlug(longTitle);
            expect(result.length).toBeLessThanOrEqual(80);
            expect(result).toBeValidSlug();
        });

        test('should handle empty or invalid input', () => {
            expect(() => generateSlug('')).toThrow('generateSlug requires a non-empty string');
            expect(() => generateSlug(null)).toThrow('generateSlug requires a non-empty string');
            expect(() => generateSlug(undefined)).toThrow('generateSlug requires a non-empty string');
        });

        test('should handle HTML content', () => {
            const result = generateSlug('<h1>Hello World</h1>');
            expect(result).toBe('hello-world');
        });

        test('should handle custom replacements', () => {
            const result = generateSlug('Hello & World', {
                customReplacements: {
                    '&': 'and'
                }
            });
            expect(result).toBe('hello-and-world');
        });

        test('should handle very short input', () => {
            const result = generateSlug('Hi');
            expect(result).toMatch(/^post-[a-z0-9]+$/);
        });

        test('should handle unicode characters', () => {
            const result = generateSlug('Hello 世界', { allowUnicode: false });
            expect(result).toBe('hello');
        });

        test('should handle consecutive dashes', () => {
            const result = generateSlug('Hello---World');
            expect(result).toBe('hello-world');
        });

        test('should handle leading and trailing dashes', () => {
            const result = generateSlug('---Hello World---');
            expect(result).toBe('hello-world');
        });
    });

    describe('validateSlug', () => {
        test('should validate correct slugs', () => {
            const validSlugs = [
                'hello-world',
                'test123',
                'my-awesome-post',
                'post-2023',
                'hello.world',
                'hello~world'
            ];

            validSlugs.forEach(slug => {
                const result = validateSlug(slug);
                expect(result.isValid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });

        test('should reject invalid slugs', () => {
            const invalidSlugs = [
                { slug: '', expectedError: 'Slug must be a non-empty string' },
                { slug: 'hi', expectedError: 'Slug must be at least 3 characters long' },
                { slug: 'a'.repeat(81), expectedError: 'Slug must be no more than 80 characters long' },
                { slug: 'hello world', expectedError: 'Slug contains invalid characters' },
                { slug: 'hello@world', expectedError: 'Slug contains invalid characters' },
                { slug: '-hello', expectedError: 'Slug must start with a letter or number' },
                { slug: 'hello-', expectedError: 'Slug must end with a letter or number' },
                { slug: 'hello--world', expectedError: 'Slug cannot contain consecutive hyphens' }
            ];

            invalidSlugs.forEach(({ slug, expectedError }) => {
                const result = validateSlug(slug);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(error => error.includes(expectedError.split(' ')[0]))).toBe(true);
            });
        });

        test('should handle null and undefined', () => {
            expect(validateSlug(null).isValid).toBe(false);
            expect(validateSlug(undefined).isValid).toBe(false);
        });
    });

    describe('isReservedSlug', () => {
        test('should identify reserved system routes', () => {
            const reserved = [
                'api', 'admin', 'auth', 'login', 'logout',
                'static', 'images', 'css', 'js',
                'search', 'about', 'contact', 'help'
            ];

            reserved.forEach(slug => {
                expect(isReservedSlug(slug)).toBe(true);
            });
        });

        test('should allow non-reserved slugs', () => {
            const allowed = [
                'hello-world', 'my-post', 'blog-entry',
                'user-content', 'custom-page'
            ];

            allowed.forEach(slug => {
                expect(isReservedSlug(slug)).toBe(false);
            });
        });

        test('should be case insensitive', () => {
            expect(isReservedSlug('API')).toBe(true);
            expect(isReservedSlug('Admin')).toBe(true);
            expect(isReservedSlug('SEARCH')).toBe(true);
        });
    });

    describe('generateUniqueSlug', () => {
        test('should return original slug if unique', async () => {
            const existsCallback = jest.fn().mockResolvedValue(false);
            const result = await generateUniqueSlug('test-slug', existsCallback);
            
            expect(result).toBe('test-slug');
            expect(existsCallback).toHaveBeenCalledWith('test-slug');
        });

        test('should append number if slug exists', async () => {
            const existsCallback = jest.fn()
                .mockResolvedValueOnce(true)  // 'test-slug' exists
                .mockResolvedValueOnce(false); // 'test-slug-1' doesn't exist
            
            const result = await generateUniqueSlug('test-slug', existsCallback);
            
            expect(result).toBe('test-slug-1');
            expect(existsCallback).toHaveBeenCalledWith('test-slug');
            expect(existsCallback).toHaveBeenCalledWith('test-slug-1');
        });

        test('should handle multiple conflicts', async () => {
            const existsCallback = jest.fn()
                .mockResolvedValueOnce(true)  // 'test-slug' exists
                .mockResolvedValueOnce(true)  // 'test-slug-1' exists
                .mockResolvedValueOnce(true)  // 'test-slug-2' exists
                .mockResolvedValueOnce(false); // 'test-slug-3' doesn't exist
            
            const result = await generateUniqueSlug('test-slug', existsCallback);
            
            expect(result).toBe('test-slug-3');
        });

        test('should fallback to random string after many attempts', async () => {
            const existsCallback = jest.fn().mockResolvedValue(true);
            
            const result = await generateUniqueSlug('test-slug', existsCallback);
            
            expect(result).toMatch(/^test-slug-[a-z0-9]+$/);
        });

        test('should throw error if existsCallback is not a function', async () => {
            await expect(generateUniqueSlug('test-slug', null))
                .rejects.toThrow('existsCallback must be a function');
        });
    });

    describe('titleToSlug', () => {
        test('should convert titles to slugs', () => {
            const titles = [
                { title: 'Hello World', expected: 'hello-world' },
                { title: 'My Amazing Blog Post!', expected: 'my-amazing-blog-post' },
                { title: 'Test & Development', expected: 'test-development' },
                { title: 'Café Naïve', expected: 'cafe-naive' }
            ];

            titles.forEach(({ title, expected }) => {
                const result = titleToSlug(title);
                expect(result).toBe(expected);
            });
        });

        test('should handle long titles', () => {
            const longTitle = 'This is a very long title that should be truncated according to the maxLength setting';
            const result = titleToSlug(longTitle);
            expect(result.length).toBeLessThanOrEqual(60);
        });
    });

    describe('cleanUserSlug', () => {
        test('should clean user input', () => {
            const inputs = [
                { input: 'Hello World!', expected: 'hello-world' },
                { input: 'test@example.com', expected: 'test-at-example-com' },
                { input: 'price: $100', expected: 'price-dollar-100' },
                { input: 'A & B + C = D', expected: 'a-and-b-plus-c-equals-d' }
            ];

            inputs.forEach(({ input, expected }) => {
                const result = cleanUserSlug(input);
                expect(result).toBe(expected);
            });
        });

        test('should handle empty input', () => {
            expect(cleanUserSlug('')).toBe('');
            expect(cleanUserSlug(null)).toBe('');
            expect(cleanUserSlug(undefined)).toBe('');
        });
    });

    describe('suggestAlternativeSlug', () => {
        test('should suggest alternatives', () => {
            const alternatives = suggestAlternativeSlug('test-post');
            
            expect(alternatives).toBeInstanceOf(Array);
            expect(alternatives.length).toBeGreaterThan(0);
            expect(alternatives).toContain('test-post-1');
            expect(alternatives).toContain('test-post-2');
        });

        test('should include year-based alternatives', () => {
            const alternatives = suggestAlternativeSlug('test-post');
            const currentYear = new Date().getFullYear();
            
            expect(alternatives.some(alt => alt.includes(currentYear.toString()))).toBe(true);
        });

        test('should handle empty input', () => {
            expect(suggestAlternativeSlug('')).toEqual([]);
            expect(suggestAlternativeSlug(null)).toEqual([]);
        });

        test('should suggest shortened versions for long slugs', () => {
            const longSlug = 'this-is-a-very-long-slug-that-should-be-shortened';
            const alternatives = suggestAlternativeSlug(longSlug);
            
            expect(alternatives.some(alt => alt.length < longSlug.length)).toBe(true);
        });
    });

    describe('extractSlugFromHTML', () => {
        test('should extract from title tag', () => {
            const html = '<html><head><title>My Blog Post</title></head><body>Content</body></html>';
            const result = extractSlugFromHTML(html);
            expect(result).toBe('my-blog-post');
        });

        test('should extract from h1 tag', () => {
            const html = '<div><h1>Main Heading</h1><p>Content</p></div>';
            const result = extractSlugFromHTML(html);
            expect(result).toBe('main-heading');
        });

        test('should extract from h2 tag if no h1', () => {
            const html = '<div><h2>Sub Heading</h2><p>Content</p></div>';
            const result = extractSlugFromHTML(html);
            expect(result).toBe('sub-heading');
        });

        test('should extract from meta description', () => {
            const html = '<head><meta name="description" content="This is a test page"></head>';
            const result = extractSlugFromHTML(html);
            expect(result).toBe('this-is-a-test-page');
        });

        test('should extract from text content as fallback', () => {
            const html = '<div>Welcome to my website</div>';
            const result = extractSlugFromHTML(html);
            expect(result).toBe('welcome-to-my-website');
        });

        test('should handle empty HTML', () => {
            expect(extractSlugFromHTML('')).toBe('');
            expect(extractSlugFromHTML(null)).toBe('');
        });
    });

    describe('batchProcessSlugs', () => {
        test('should process multiple slugs', () => {
            const slugs = ['Hello World', 'Test & Development', 'Café Naïve'];
            const results = batchProcessSlugs(slugs);
            
            expect(results).toHaveLength(3);
            
            results.forEach(result => {
                expect(result).toHaveProperty('original');
                expect(result).toHaveProperty('processed');
                expect(result).toHaveProperty('isValid');
                expect(result).toHaveProperty('errors');
            });
            
            expect(results[0].processed).toBe('hello-world');
            expect(results[1].processed).toBe('test-development');
            expect(results[2].processed).toBe('cafe-naive');
        });

        test('should handle invalid input', () => {
            const slugs = ['', 'valid-slug', null];
            const results = batchProcessSlugs(slugs);
            
            expect(results).toHaveLength(3);
            expect(results[0].isValid).toBe(false);
            expect(results[1].isValid).toBe(true);
            expect(results[2].isValid).toBe(false);
        });

        test('should throw error for non-array input', () => {
            expect(() => batchProcessSlugs('not-an-array'))
                .toThrow('batchProcessSlugs expects an array of slugs');
        });
    });

    describe('Edge cases and stress tests', () => {
        test('should handle very long input', () => {
            const veryLongInput = 'a'.repeat(1000);
            const result = generateSlug(veryLongInput);
            expect(result.length).toBeLessThanOrEqual(80);
        });

        test('should handle special Unicode characters', () => {
            const unicodeInput = 'Hello 🌍 World 🚀';
            const result = generateSlug(unicodeInput);
            expect(result).toBe('hello-world');
        });

        test('should handle mixed case consistently', () => {
            const inputs = ['Hello World', 'HELLO WORLD', 'hello world'];
            const results = inputs.map(input => generateSlug(input));
            
            results.forEach(result => {
                expect(result).toBe('hello-world');
            });
        });

        test('should handle numeric input', () => {
            const result = generateSlug('123 456 789');
            expect(result).toBe('123-456-789');
        });

        test('should handle only special characters', () => {
            const result = generateSlug('!@#$%^&*()');
            expect(result).toMatch(/^post-[a-z0-9]+$/);
        });
    });
});