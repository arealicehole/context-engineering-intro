/**
 * Grok API Integration Tests
 * Comprehensive tests for AI integration components
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import nock from 'nock';

// Mock environment variables
process.env.GROK_API_KEY = 'test-grok-api-key';
process.env.GROK_API_BASE_URL = 'https://api.x.ai/v1';

// Mock modules
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Grok API Integration', () => {
    let GrokAPIClient;
    let analyzeContent;
    let promptTemplates;
    let grokClient;

    beforeEach(async () => {
        jest.clearAllMocks();
        
        // Clean up nock
        nock.cleanAll();
        
        // Import modules
        const grokModule = await import('../../src/ai/grok-client.js');
        const analyzerModule = await import('../../src/ai/content-analyzer.js');
        const templatesModule = await import('../../src/ai/prompt-templates.js');
        
        GrokAPIClient = grokModule.GrokAPIClient;
        analyzeContent = analyzerModule.analyzeContent;
        promptTemplates = templatesModule;
        
        grokClient = new GrokAPIClient();
    });

    afterEach(() => {
        nock.cleanAll();
        jest.restoreAllMocks();
    });

    describe('GrokAPIClient', () => {
        test('should initialize with correct configuration', () => {
            expect(grokClient.apiKey).toBe('test-grok-api-key');
            expect(grokClient.baseUrl).toBe('https://api.x.ai/v1');
            expect(grokClient.model).toBe('grok-beta');
        });

        test('should make successful API request', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            slug: 'test-post',
                            title: 'Test Post',
                            description: 'A test post description'
                        })
                    }
                }],
                usage: {
                    prompt_tokens: 100,
                    completion_tokens: 50,
                    total_tokens: 150
                }
            };

            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(200, mockResponse);

            const result = await grokClient.analyzeContent('<h1>Test Post</h1><p>This is a test.</p>');

            expect(result).toEqual({
                slug: 'test-post',
                title: 'Test Post',
                description: 'A test post description'
            });
        });

        test('should handle API errors gracefully', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(500, { error: 'Internal Server Error' });

            await expect(grokClient.analyzeContent('<h1>Test</h1>'))
                .rejects.toThrow('Grok API request failed');
        });

        test('should handle network errors', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .replyWithError('Network Error');

            await expect(grokClient.analyzeContent('<h1>Test</h1>'))
                .rejects.toThrow('Network Error');
        });

        test('should handle rate limiting with retry', async () => {
            // First request returns rate limit error
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(429, { error: 'Rate limit exceeded' });

            // Second request succeeds
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'retry-test',
                                title: 'Retry Test',
                                description: 'Test after retry'
                            })
                        }
                    }]
                });

            const result = await grokClient.analyzeContent('<h1>Retry Test</h1>');
            
            expect(result).toEqual({
                slug: 'retry-test',
                title: 'Retry Test',
                description: 'Test after retry'
            });
        });

        test('should handle invalid JSON response', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(200, {
                    choices: [{
                        message: {
                            content: 'Invalid JSON response'
                        }
                    }]
                });

            await expect(grokClient.analyzeContent('<h1>Test</h1>'))
                .rejects.toThrow('Failed to parse Grok API response');
        });

        test('should handle empty response', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(200, {
                    choices: []
                });

            await expect(grokClient.analyzeContent('<h1>Test</h1>'))
                .rejects.toThrow('No response from Grok API');
        });

        test('should validate response structure', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'test',
                                title: 'Test'
                                // Missing description
                            })
                        }
                    }]
                });

            await expect(grokClient.analyzeContent('<h1>Test</h1>'))
                .rejects.toThrow('Invalid response structure');
        });

        test('should handle authentication errors', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(401, { error: 'Unauthorized' });

            await expect(grokClient.analyzeContent('<h1>Test</h1>'))
                .rejects.toThrow('Grok API authentication failed');
        });

        test('should include proper headers', async () => {
            const scope = nock('https://api.x.ai')
                .matchHeader('Authorization', 'Bearer test-grok-api-key')
                .matchHeader('Content-Type', 'application/json')
                .matchHeader('User-Agent', 'PoopQuest/1.0')
                .post('/v1/chat/completions')
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'test',
                                title: 'Test',
                                description: 'Test description'
                            })
                        }
                    }]
                });

            await grokClient.analyzeContent('<h1>Test</h1>');
            
            expect(scope.isDone()).toBe(true);
        });

        test('should handle timeout errors', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .delayConnection(31000) // Longer than timeout
                .reply(200, {});

            await expect(grokClient.analyzeContent('<h1>Test</h1>'))
                .rejects.toThrow('Request timeout');
        });

        test('should sanitize HTML input', async () => {
            const maliciousHtml = '<script>alert("xss")</script><h1>Test</h1>';
            
            nock('https://api.x.ai')
                .post('/v1/chat/completions', (body) => {
                    expect(body.messages[0].content).not.toContain('<script>');
                    return true;
                })
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'test',
                                title: 'Test',
                                description: 'Test description'
                            })
                        }
                    }]
                });

            await grokClient.analyzeContent(maliciousHtml);
        });
    });

    describe('Content Analyzer', () => {
        test('should analyze HTML content successfully', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'my-blog-post',
                                title: 'My Blog Post',
                                description: 'This is my first blog post about web development'
                            })
                        }
                    }]
                });

            const result = await analyzeContent('<h1>My Blog Post</h1><p>This is my first blog post about web development.</p>');

            expect(result).toEqual({
                slug: 'my-blog-post',
                title: 'My Blog Post',
                description: 'This is my first blog post about web development'
            });
        });

        test('should handle AI service failure with fallback', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(500, { error: 'Service unavailable' });

            const result = await analyzeContent('<h1>Fallback Test</h1><p>This should use fallback analysis.</p>');

            expect(result).toEqual({
                slug: expect.stringMatching(/^post-\d+$/),
                title: 'Fallback Test',
                description: 'This should use fallback analysis.'
            });
        });

        test('should detect content type and use appropriate prompt', async () => {
            const technicalContent = `
                <h1>API Documentation</h1>
                <h2>Authentication</h2>
                <code>GET /api/v1/auth</code>
                <p>This endpoint provides authentication functionality.</p>
            `;

            nock('https://api.x.ai')
                .post('/v1/chat/completions', (body) => {
                    expect(body.messages[0].content).toContain('technical documentation');
                    return true;
                })
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'api-documentation',
                                title: 'API Documentation',
                                description: 'Comprehensive API documentation with authentication details'
                            })
                        }
                    }]
                });

            const result = await analyzeContent(technicalContent);
            
            expect(result.slug).toBe('api-documentation');
            expect(result.title).toBe('API Documentation');
        });

        test('should handle different content types', async () => {
            const contentTypes = [
                {
                    html: '<h1>Recipe</h1><ul><li>Ingredients</li><li>Steps</li></ul>',
                    expectedType: 'tutorial'
                },
                {
                    html: '<h1>My Story</h1><p>Once upon a time...</p>',
                    expectedType: 'creative'
                },
                {
                    html: '<h1>Product Review</h1><p>This product is amazing...</p>',
                    expectedType: 'review'
                }
            ];

            for (const { html, expectedType } of contentTypes) {
                nock('https://api.x.ai')
                    .post('/v1/chat/completions')
                    .reply(200, {
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    slug: 'test-content',
                                    title: 'Test Content',
                                    description: 'Test description'
                                })
                            }
                        }]
                    });

                const result = await analyzeContent(html);
                expect(result).toBeDefined();
            }
        });

        test('should handle very long content', async () => {
            const longContent = '<h1>Long Content</h1>' + '<p>Long paragraph.</p>'.repeat(1000);

            nock('https://api.x.ai')
                .post('/v1/chat/completions', (body) => {
                    // Should truncate content if too long
                    expect(body.messages[0].content.length).toBeLessThan(10000);
                    return true;
                })
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'long-content',
                                title: 'Long Content',
                                description: 'This is a very long piece of content'
                            })
                        }
                    }]
                });

            const result = await analyzeContent(longContent);
            expect(result.slug).toBe('long-content');
        });

        test('should validate generated slugs', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'Invalid Slug!',
                                title: 'Test Title',
                                description: 'Test description'
                            })
                        }
                    }]
                });

            const result = await analyzeContent('<h1>Test</h1>');
            
            // Should sanitize invalid slug
            expect(result.slug).toMatch(/^[a-z0-9-]+$/);
            expect(result.slug).not.toContain(' ');
            expect(result.slug).not.toContain('!');
        });
    });

    describe('Prompt Templates', () => {
        test('should generate appropriate prompt for technical content', () => {
            const technicalPrompt = promptTemplates.generateTechnicalPrompt();
            
            expect(technicalPrompt).toContain('technical documentation');
            expect(technicalPrompt).toContain('API');
            expect(technicalPrompt).toContain('code');
        });

        test('should generate appropriate prompt for creative content', () => {
            const creativePrompt = promptTemplates.generateCreativePrompt();
            
            expect(creativePrompt).toContain('creative writing');
            expect(creativePrompt).toContain('story');
            expect(creativePrompt).toContain('narrative');
        });

        test('should generate appropriate prompt for tutorial content', () => {
            const tutorialPrompt = promptTemplates.generateTutorialPrompt();
            
            expect(tutorialPrompt).toContain('tutorial');
            expect(tutorialPrompt).toContain('learn');
            expect(tutorialPrompt).toContain('step');
        });

        test('should generate default prompt', () => {
            const defaultPrompt = promptTemplates.generateDefaultPrompt();
            
            expect(defaultPrompt).toContain('HTML content');
            expect(defaultPrompt).toContain('slug');
            expect(defaultPrompt).toContain('title');
            expect(defaultPrompt).toContain('description');
        });

        test('should include JSON format instructions', () => {
            const prompt = promptTemplates.generateDefaultPrompt();
            
            expect(prompt).toContain('JSON format');
            expect(prompt).toContain('slug');
            expect(prompt).toContain('title');
            expect(prompt).toContain('description');
        });

        test('should include retry instructions', () => {
            const prompt = promptTemplates.generateDefaultPrompt();
            
            expect(prompt).toContain('alphanumeric');
            expect(prompt).toContain('hyphens');
            expect(prompt).toContain('lowercase');
        });
    });

    describe('Error Recovery', () => {
        test('should retry on temporary failures', async () => {
            let attemptCount = 0;
            
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .times(3)
                .reply(() => {
                    attemptCount++;
                    if (attemptCount < 3) {
                        return [503, { error: 'Service temporarily unavailable' }];
                    }
                    return [200, {
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    slug: 'retry-success',
                                    title: 'Retry Success',
                                    description: 'Successfully retried after failures'
                                })
                            }
                        }]
                    }];
                });

            const result = await grokClient.analyzeContent('<h1>Retry Test</h1>');
            
            expect(result.slug).toBe('retry-success');
            expect(attemptCount).toBe(3);
        });

        test('should give up after max retries', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .times(5)
                .reply(503, { error: 'Persistent service error' });

            await expect(grokClient.analyzeContent('<h1>Test</h1>'))
                .rejects.toThrow('Max retries exceeded');
        });

        test('should handle partial response gracefully', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'partial-response',
                                title: 'Partial Response'
                                // Missing description
                            })
                        }
                    }]
                });

            const result = await analyzeContent('<h1>Partial Response</h1>');
            
            expect(result.slug).toBe('partial-response');
            expect(result.title).toBe('Partial Response');
            expect(result.description).toBe('Content submitted by user'); // Fallback description
        });
    });

    describe('Performance', () => {
        test('should handle concurrent requests', async () => {
            const requests = Array.from({ length: 5 }, (_, i) => {
                nock('https://api.x.ai')
                    .post('/v1/chat/completions')
                    .reply(200, {
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    slug: `concurrent-${i}`,
                                    title: `Concurrent ${i}`,
                                    description: `Concurrent request ${i}`
                                })
                            }
                        }]
                    });

                return analyzeContent(`<h1>Concurrent ${i}</h1>`);
            });

            const results = await Promise.all(requests);
            
            expect(results).toHaveLength(5);
            results.forEach((result, i) => {
                expect(result.slug).toBe(`concurrent-${i}`);
                expect(result.title).toBe(`Concurrent ${i}`);
            });
        });

        test('should complete analysis within reasonable time', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'performance-test',
                                title: 'Performance Test',
                                description: 'Testing performance'
                            })
                        }
                    }]
                });

            const startTime = Date.now();
            await analyzeContent('<h1>Performance Test</h1>');
            const endTime = Date.now();
            
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        test('should handle memory efficiently with large content', async () => {
            const largeContent = '<h1>Large Content</h1>' + '<p>Content</p>'.repeat(10000);
            
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'large-content',
                                title: 'Large Content',
                                description: 'Large content processed efficiently'
                            })
                        }
                    }]
                });

            const memoryBefore = process.memoryUsage().heapUsed;
            await analyzeContent(largeContent);
            const memoryAfter = process.memoryUsage().heapUsed;
            
            // Memory usage should not increase dramatically
            expect(memoryAfter - memoryBefore).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
        });
    });

    describe('Security', () => {
        test('should sanitize input before sending to API', async () => {
            const maliciousInput = '<script>alert("xss")</script><h1>Test</h1>';
            
            nock('https://api.x.ai')
                .post('/v1/chat/completions', (body) => {
                    expect(body.messages[0].content).not.toContain('<script>');
                    expect(body.messages[0].content).not.toContain('alert');
                    return true;
                })
                .reply(200, {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                slug: 'sanitized-content',
                                title: 'Sanitized Content',
                                description: 'Content has been sanitized'
                            })
                        }
                    }]
                });

            const result = await analyzeContent(maliciousInput);
            expect(result.slug).toBe('sanitized-content');
        });

        test('should not expose sensitive information in errors', async () => {
            nock('https://api.x.ai')
                .post('/v1/chat/completions')
                .reply(500, { error: 'Internal server error' });

            try {
                await grokClient.analyzeContent('<h1>Test</h1>');
            } catch (error) {
                expect(error.message).not.toContain('test-grok-api-key');
                expect(error.message).not.toContain('Bearer');
            }
        });
    });
});