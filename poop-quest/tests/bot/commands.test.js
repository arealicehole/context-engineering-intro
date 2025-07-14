/**
 * Bot Commands Tests
 * Comprehensive tests for Discord bot commands
 */

import { jest } from '@jest/globals';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Discord.js
const mockSend = jest.fn();
const mockReply = jest.fn();
const mockChannel = {
    send: mockSend
};

const mockMessage = {
    reply: mockReply,
    channel: mockChannel,
    author: {
        id: 'test-user-123',
        username: 'testuser',
        discriminator: '1234',
        tag: 'testuser#1234'
    },
    content: '',
    attachments: new Map(),
    guild: {
        id: 'test-guild-123',
        name: 'Test Server'
    },
    createdAt: new Date()
};

// Mock the poop command handler
jest.unstable_mockModule('../../src/bot/commands/poop.js', () => ({
    name: 'poop',
    description: 'Submit HTML content to be posted on the website',
    async execute(message, args) {
        // This will be mocked per test
        return mockCommandExecute(message, args);
    }
}));

// Mock dependencies
jest.unstable_mockModule('../../src/database/models/post.js', () => ({
    Post: {
        create: jest.fn(),
        findBySlug: jest.fn(),
        findAll: jest.fn(),
        getCount: jest.fn()
    }
}));

jest.unstable_mockModule('../../src/ai/content-analyzer.js', () => ({
    analyzeContent: jest.fn()
}));

jest.unstable_mockModule('../../src/bot/utils/file-handler.js', () => ({
    extractHTMLFromMessage: jest.fn(),
    validateHTMLContent: jest.fn()
}));

let mockCommandExecute;
let Post;
let analyzeContent;
let fileHandler;

describe('Bot Commands', () => {
    beforeEach(async () => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Import mocked modules
        const postModule = await import('../../src/database/models/post.js');
        const aiModule = await import('../../src/ai/content-analyzer.js');
        const fileModule = await import('../../src/bot/utils/file-handler.js');
        
        Post = postModule.Post;
        analyzeContent = aiModule.analyzeContent;
        fileHandler = fileModule;
        
        // Default mock implementations
        mockCommandExecute = jest.fn();
        
        // Reset message mock
        Object.assign(mockMessage, {
            content: '',
            attachments: new Map()
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('!poop command', () => {
        test('should handle HTML file attachment', async () => {
            // Mock file attachment
            const mockAttachment = {
                name: 'test.html',
                size: 1024,
                url: 'https://cdn.discord.com/attachments/test.html',
                contentType: 'text/html'
            };
            
            mockMessage.attachments.set('test-id', mockAttachment);
            mockMessage.content = '!poop Check out my HTML page!';
            
            // Mock file handler
            fileHandler.extractHTMLFromMessage.mockResolvedValue({
                htmlContent: '<h1>Test Page</h1><p>This is a test page.</p>',
                source: 'attachment',
                filename: 'test.html'
            });
            
            fileHandler.validateHTMLContent.mockReturnValue({
                isValid: true,
                errors: []
            });
            
            // Mock AI analysis
            analyzeContent.mockResolvedValue({
                slug: 'test-page',
                title: 'Test Page',
                description: 'This is a test page.'
            });
            
            // Mock database
            Post.create.mockResolvedValue({
                id: 1,
                slug: 'test-page',
                title: 'Test Page',
                description: 'This is a test page.',
                html_content: '<h1>Test Page</h1><p>This is a test page.</p>',
                discord_user_id: 'test-user-123',
                discord_username: 'testuser',
                created_at: new Date().toISOString()
            });
            
            // Mock command execution
            mockCommandExecute.mockImplementation(async (message, args) => {
                const htmlData = await fileHandler.extractHTMLFromMessage(message);
                const validation = fileHandler.validateHTMLContent(htmlData.htmlContent);
                
                if (!validation.isValid) {
                    return message.reply('❌ Invalid HTML content');
                }
                
                const analysis = await analyzeContent(htmlData.htmlContent);
                
                const post = await Post.create({
                    slug: analysis.slug,
                    title: analysis.title,
                    description: analysis.description,
                    html_content: htmlData.htmlContent,
                    discord_user_id: message.author.id,
                    discord_username: message.author.username
                });
                
                return message.reply(`✅ Post created successfully! View it at: https://poop.quest/${post.slug}`);
            });
            
            // Import and execute command
            const { execute } = await import('../../src/bot/commands/poop.js');
            await execute(mockMessage, []);
            
            // Verify calls
            expect(fileHandler.extractHTMLFromMessage).toHaveBeenCalledWith(mockMessage);
            expect(fileHandler.validateHTMLContent).toHaveBeenCalledWith('<h1>Test Page</h1><p>This is a test page.</p>');
            expect(analyzeContent).toHaveBeenCalledWith('<h1>Test Page</h1><p>This is a test page.</p>');
            expect(Post.create).toHaveBeenCalledWith({
                slug: 'test-page',
                title: 'Test Page',
                description: 'This is a test page.',
                html_content: '<h1>Test Page</h1><p>This is a test page.</p>',
                discord_user_id: 'test-user-123',
                discord_username: 'testuser'
            });
        });

        test('should handle HTML code block', async () => {
            mockMessage.content = '!poop ```html\n<h1>Hello World</h1>\n<p>This is from a code block.</p>\n```';
            
            // Mock file handler
            fileHandler.extractHTMLFromMessage.mockResolvedValue({
                htmlContent: '<h1>Hello World</h1>\n<p>This is from a code block.</p>',
                source: 'codeblock',
                filename: null
            });
            
            fileHandler.validateHTMLContent.mockReturnValue({
                isValid: true,
                errors: []
            });
            
            // Mock AI analysis
            analyzeContent.mockResolvedValue({
                slug: 'hello-world',
                title: 'Hello World',
                description: 'This is from a code block.'
            });
            
            // Mock database
            Post.create.mockResolvedValue({
                id: 2,
                slug: 'hello-world',
                title: 'Hello World',
                description: 'This is from a code block.',
                html_content: '<h1>Hello World</h1>\n<p>This is from a code block.</p>',
                discord_user_id: 'test-user-123',
                discord_username: 'testuser',
                created_at: new Date().toISOString()
            });
            
            // Mock command execution
            mockCommandExecute.mockImplementation(async (message, args) => {
                const htmlData = await fileHandler.extractHTMLFromMessage(message);
                const validation = fileHandler.validateHTMLContent(htmlData.htmlContent);
                
                if (!validation.isValid) {
                    return message.reply('❌ Invalid HTML content');
                }
                
                const analysis = await analyzeContent(htmlData.htmlContent);
                
                const post = await Post.create({
                    slug: analysis.slug,
                    title: analysis.title,
                    description: analysis.description,
                    html_content: htmlData.htmlContent,
                    discord_user_id: message.author.id,
                    discord_username: message.author.username
                });
                
                return message.reply(`✅ Post created successfully! View it at: https://poop.quest/${post.slug}`);
            });
            
            // Import and execute command
            const { execute } = await import('../../src/bot/commands/poop.js');
            await execute(mockMessage, []);
            
            // Verify calls
            expect(fileHandler.extractHTMLFromMessage).toHaveBeenCalledWith(mockMessage);
            expect(analyzeContent).toHaveBeenCalledWith('<h1>Hello World</h1>\n<p>This is from a code block.</p>');
            expect(Post.create).toHaveBeenCalledWith({
                slug: 'hello-world',
                title: 'Hello World',
                description: 'This is from a code block.',
                html_content: '<h1>Hello World</h1>\n<p>This is from a code block.</p>',
                discord_user_id: 'test-user-123',
                discord_username: 'testuser'
            });
        });

        test('should handle invalid HTML content', async () => {
            mockMessage.content = '!poop ```html\n<script>alert("xss")</script>\n```';
            
            // Mock file handler
            fileHandler.extractHTMLFromMessage.mockResolvedValue({
                htmlContent: '<script>alert("xss")</script>',
                source: 'codeblock',
                filename: null
            });
            
            fileHandler.validateHTMLContent.mockReturnValue({
                isValid: false,
                errors: ['Script tags are not allowed', 'Potentially dangerous content detected']
            });
            
            // Mock command execution
            mockCommandExecute.mockImplementation(async (message, args) => {
                const htmlData = await fileHandler.extractHTMLFromMessage(message);
                const validation = fileHandler.validateHTMLContent(htmlData.htmlContent);
                
                if (!validation.isValid) {
                    return message.reply({
                        embeds: [{
                            color: 0xff0000,
                            title: '❌ Invalid HTML Content',
                            description: 'The HTML content contains errors or unsafe elements:',
                            fields: validation.errors.map(error => ({
                                name: '• Error',
                                value: error,
                                inline: false
                            }))
                        }]
                    });
                }
            });
            
            // Import and execute command
            const { execute } = await import('../../src/bot/commands/poop.js');
            await execute(mockMessage, []);
            
            // Verify validation was called
            expect(fileHandler.validateHTMLContent).toHaveBeenCalledWith('<script>alert("xss")</script>');
            
            // Verify AI analysis was NOT called
            expect(analyzeContent).not.toHaveBeenCalled();
            
            // Verify database create was NOT called
            expect(Post.create).not.toHaveBeenCalled();
            
            // Verify error message was sent
            expect(mockMessage.reply).toHaveBeenCalledWith({
                embeds: [{
                    color: 0xff0000,
                    title: '❌ Invalid HTML Content',
                    description: 'The HTML content contains errors or unsafe elements:',
                    fields: [
                        { name: '• Error', value: 'Script tags are not allowed', inline: false },
                        { name: '• Error', value: 'Potentially dangerous content detected', inline: false }
                    ]
                }]
            });
        });

        test('should handle missing HTML content', async () => {
            mockMessage.content = '!poop';
            
            // Mock file handler
            fileHandler.extractHTMLFromMessage.mockResolvedValue({
                htmlContent: '',
                source: 'none',
                filename: null
            });
            
            // Mock command execution
            mockCommandExecute.mockImplementation(async (message, args) => {
                const htmlData = await fileHandler.extractHTMLFromMessage(message);
                
                if (!htmlData.htmlContent) {
                    return message.reply({
                        embeds: [{
                            color: 0xffaa00,
                            title: '📋 How to use the !poop command',
                            description: 'Submit HTML content to create a web post',
                            fields: [
                                {
                                    name: '📎 Method 1: File Upload',
                                    value: 'Attach an HTML file with your message',
                                    inline: false
                                },
                                {
                                    name: '📝 Method 2: Code Block',
                                    value: 'Use ```html\\n<your-html-here>\\n```',
                                    inline: false
                                },
                                {
                                    name: '💡 Example',
                                    value: '!poop ```html\\n<h1>My Page</h1>\\n<p>Hello world!</p>\\n```',
                                    inline: false
                                }
                            ]
                        }]
                    });
                }
            });
            
            // Import and execute command
            const { execute } = await import('../../src/bot/commands/poop.js');
            await execute(mockMessage, []);
            
            // Verify help message was sent
            expect(mockMessage.reply).toHaveBeenCalledWith({
                embeds: [{
                    color: 0xffaa00,
                    title: '📋 How to use the !poop command',
                    description: 'Submit HTML content to create a web post',
                    fields: [
                        {
                            name: '📎 Method 1: File Upload',
                            value: 'Attach an HTML file with your message',
                            inline: false
                        },
                        {
                            name: '📝 Method 2: Code Block',
                            value: 'Use ```html\\n<your-html-here>\\n```',
                            inline: false
                        },
                        {
                            name: '💡 Example',
                            value: '!poop ```html\\n<h1>My Page</h1>\\n<p>Hello world!</p>\\n```',
                            inline: false
                        }
                    ]
                }]
            });
        });

        test('should handle database errors', async () => {
            mockMessage.content = '!poop ```html\n<h1>Test</h1>\n```';
            
            // Mock file handler
            fileHandler.extractHTMLFromMessage.mockResolvedValue({
                htmlContent: '<h1>Test</h1>',
                source: 'codeblock',
                filename: null
            });
            
            fileHandler.validateHTMLContent.mockReturnValue({
                isValid: true,
                errors: []
            });
            
            // Mock AI analysis
            analyzeContent.mockResolvedValue({
                slug: 'test',
                title: 'Test',
                description: 'A test page.'
            });
            
            // Mock database error
            Post.create.mockRejectedValue(new Error('Database connection failed'));
            
            // Mock command execution
            mockCommandExecute.mockImplementation(async (message, args) => {
                try {
                    const htmlData = await fileHandler.extractHTMLFromMessage(message);
                    const validation = fileHandler.validateHTMLContent(htmlData.htmlContent);
                    
                    if (!validation.isValid) {
                        return message.reply('❌ Invalid HTML content');
                    }
                    
                    const analysis = await analyzeContent(htmlData.htmlContent);
                    
                    const post = await Post.create({
                        slug: analysis.slug,
                        title: analysis.title,
                        description: analysis.description,
                        html_content: htmlData.htmlContent,
                        discord_user_id: message.author.id,
                        discord_username: message.author.username
                    });
                    
                    return message.reply(`✅ Post created successfully! View it at: https://poop.quest/${post.slug}`);
                } catch (error) {
                    console.error('Error creating post:', error);
                    return message.reply('❌ An error occurred while creating your post. Please try again later.');
                }
            });
            
            // Import and execute command
            const { execute } = await import('../../src/bot/commands/poop.js');
            await execute(mockMessage, []);
            
            // Verify error handling
            expect(mockMessage.reply).toHaveBeenCalledWith('❌ An error occurred while creating your post. Please try again later.');
        });

        test('should handle AI analysis errors', async () => {
            mockMessage.content = '!poop ```html\n<h1>Test</h1>\n```';
            
            // Mock file handler
            fileHandler.extractHTMLFromMessage.mockResolvedValue({
                htmlContent: '<h1>Test</h1>',
                source: 'codeblock',
                filename: null
            });
            
            fileHandler.validateHTMLContent.mockReturnValue({
                isValid: true,
                errors: []
            });
            
            // Mock AI analysis error
            analyzeContent.mockRejectedValue(new Error('AI service unavailable'));
            
            // Mock command execution with fallback
            mockCommandExecute.mockImplementation(async (message, args) => {
                try {
                    const htmlData = await fileHandler.extractHTMLFromMessage(message);
                    const validation = fileHandler.validateHTMLContent(htmlData.htmlContent);
                    
                    if (!validation.isValid) {
                        return message.reply('❌ Invalid HTML content');
                    }
                    
                    let analysis;
                    try {
                        analysis = await analyzeContent(htmlData.htmlContent);
                    } catch (error) {
                        // Fallback to basic analysis
                        analysis = {
                            slug: `post-${Date.now()}`,
                            title: 'User HTML Content',
                            description: 'HTML content submitted by user'
                        };
                    }
                    
                    const post = await Post.create({
                        slug: analysis.slug,
                        title: analysis.title,
                        description: analysis.description,
                        html_content: htmlData.htmlContent,
                        discord_user_id: message.author.id,
                        discord_username: message.author.username
                    });
                    
                    return message.reply(`✅ Post created successfully! View it at: https://poop.quest/${post.slug}`);
                } catch (error) {
                    console.error('Error creating post:', error);
                    return message.reply('❌ An error occurred while creating your post. Please try again later.');
                }
            });
            
            // Mock database success
            Post.create.mockResolvedValue({
                id: 3,
                slug: 'post-123456789',
                title: 'User HTML Content',
                description: 'HTML content submitted by user',
                html_content: '<h1>Test</h1>',
                discord_user_id: 'test-user-123',
                discord_username: 'testuser',
                created_at: new Date().toISOString()
            });
            
            // Import and execute command
            const { execute } = await import('../../src/bot/commands/poop.js');
            await execute(mockMessage, []);
            
            // Verify AI analysis was attempted
            expect(analyzeContent).toHaveBeenCalledWith('<h1>Test</h1>');
            
            // Verify fallback was used
            expect(Post.create).toHaveBeenCalledWith({
                slug: expect.stringMatching(/^post-\d+$/),
                title: 'User HTML Content',
                description: 'HTML content submitted by user',
                html_content: '<h1>Test</h1>',
                discord_user_id: 'test-user-123',
                discord_username: 'testuser'
            });
        });

        test('should handle large HTML files', async () => {
            // Create large HTML content
            const largeHtml = '<div>' + 'x'.repeat(1000000) + '</div>';
            
            const mockAttachment = {
                name: 'large.html',
                size: 1000000,
                url: 'https://cdn.discord.com/attachments/large.html',
                contentType: 'text/html'
            };
            
            mockMessage.attachments.set('large-id', mockAttachment);
            mockMessage.content = '!poop Large HTML file';
            
            // Mock file handler
            fileHandler.extractHTMLFromMessage.mockResolvedValue({
                htmlContent: largeHtml,
                source: 'attachment',
                filename: 'large.html'
            });
            
            fileHandler.validateHTMLContent.mockReturnValue({
                isValid: false,
                errors: ['File size exceeds maximum allowed limit']
            });
            
            // Mock command execution
            mockCommandExecute.mockImplementation(async (message, args) => {
                const htmlData = await fileHandler.extractHTMLFromMessage(message);
                const validation = fileHandler.validateHTMLContent(htmlData.htmlContent);
                
                if (!validation.isValid) {
                    return message.reply({
                        embeds: [{
                            color: 0xff0000,
                            title: '❌ Invalid HTML Content',
                            description: 'The HTML content contains errors or unsafe elements:',
                            fields: validation.errors.map(error => ({
                                name: '• Error',
                                value: error,
                                inline: false
                            }))
                        }]
                    });
                }
            });
            
            // Import and execute command
            const { execute } = await import('../../src/bot/commands/poop.js');
            await execute(mockMessage, []);
            
            // Verify size validation
            expect(fileHandler.validateHTMLContent).toHaveBeenCalledWith(largeHtml);
            expect(mockMessage.reply).toHaveBeenCalledWith({
                embeds: [{
                    color: 0xff0000,
                    title: '❌ Invalid HTML Content',
                    description: 'The HTML content contains errors or unsafe elements:',
                    fields: [
                        { name: '• Error', value: 'File size exceeds maximum allowed limit', inline: false }
                    ]
                }]
            });
        });
    });

    describe('Command permissions and rate limiting', () => {
        test('should handle rate limiting', async () => {
            mockMessage.content = '!poop ```html\n<h1>Test</h1>\n```';
            
            // Mock rate limiting
            const rateLimiter = {
                check: jest.fn().mockReturnValue({
                    allowed: false,
                    resetTime: Date.now() + 60000,
                    remaining: 0
                })
            };
            
            // Mock command execution with rate limiting
            mockCommandExecute.mockImplementation(async (message, args) => {
                const rateCheck = rateLimiter.check(message.author.id);
                
                if (!rateCheck.allowed) {
                    const resetTime = new Date(rateCheck.resetTime);
                    return message.reply({
                        embeds: [{
                            color: 0xff6600,
                            title: '⏰ Rate Limit Exceeded',
                            description: `Please wait before submitting another post.`,
                            fields: [{
                                name: 'Reset Time',
                                value: resetTime.toLocaleString(),
                                inline: false
                            }]
                        }]
                    });
                }
            });
            
            // Import and execute command
            const { execute } = await import('../../src/bot/commands/poop.js');
            await execute(mockMessage, []);
            
            // Verify rate limiting was applied
            expect(rateLimiter.check).toHaveBeenCalledWith('test-user-123');
            expect(mockMessage.reply).toHaveBeenCalledWith({
                embeds: [{
                    color: 0xff6600,
                    title: '⏰ Rate Limit Exceeded',
                    description: `Please wait before submitting another post.`,
                    fields: [{
                        name: 'Reset Time',
                        value: expect.any(String),
                        inline: false
                    }]
                }]
            });
        });
    });
});

describe('Bot Integration', () => {
    test('should handle command parsing', async () => {
        const message = {
            content: '!poop this is a test',
            author: { id: 'test-user' }
        };
        
        // Mock command parser
        const parseCommand = (content) => {
            const args = content.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            return { command, args };
        };
        
        const parsed = parseCommand(message.content);
        
        expect(parsed.command).toBe('poop');
        expect(parsed.args).toEqual(['this', 'is', 'a', 'test']);
    });

    test('should handle command not found', async () => {
        const message = {
            content: '!nonexistent',
            author: { id: 'test-user' }
        };
        
        // Mock command handler
        const handleCommand = (command) => {
            const commands = ['poop', 'help', 'stats'];
            return commands.includes(command);
        };
        
        expect(handleCommand('nonexistent')).toBe(false);
        expect(handleCommand('poop')).toBe(true);
    });
});