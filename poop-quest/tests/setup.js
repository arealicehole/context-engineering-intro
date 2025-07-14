/**
 * Jest Test Setup
 * Global test configuration and mocks
 */

import { jest } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock crypto for Node.js environment
const crypto = {
    getRandomValues: jest.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
    })
};

global.crypto = crypto;

// Mock btoa/atob for Node.js environment
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.BASE_URL = 'https://test.poop.quest';

// Global test utilities
global.testUtils = {
    // Mock Discord message
    createMockMessage: (overrides = {}) => ({
        id: 'test-message-123',
        content: '',
        author: {
            id: 'test-user-123',
            username: 'testuser',
            discriminator: '1234',
            tag: 'testuser#1234'
        },
        channel: {
            id: 'test-channel-123',
            name: 'test-channel',
            send: jest.fn(),
            createMessageCollector: jest.fn()
        },
        guild: {
            id: 'test-guild-123',
            name: 'Test Server'
        },
        attachments: new Map(),
        createdAt: new Date(),
        reply: jest.fn(),
        react: jest.fn(),
        edit: jest.fn(),
        delete: jest.fn(),
        ...overrides
    }),
    
    // Mock Discord attachment
    createMockAttachment: (overrides = {}) => ({
        id: 'test-attachment-123',
        name: 'test.html',
        size: 1024,
        url: 'https://cdn.discord.com/attachments/test.html',
        contentType: 'text/html',
        ...overrides
    }),
    
    // Mock database post
    createMockPost: (overrides = {}) => ({
        id: 1,
        slug: 'test-post',
        title: 'Test Post',
        description: 'A test post',
        html_content: '<h1>Test</h1>',
        discord_user_id: 'test-user-123',
        discord_username: 'testuser',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
    }),
    
    // Mock AI analysis result
    createMockAnalysis: (overrides = {}) => ({
        slug: 'test-post',
        title: 'Test Post',
        description: 'A test post',
        ...overrides
    }),
    
    // Wait for async operations
    waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // Create test HTML content
    createTestHTML: (title = 'Test', content = 'Test content') => `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
        </head>
        <body>
            <h1>${title}</h1>
            <p>${content}</p>
        </body>
        </html>
    `.trim()
};

// Custom Jest matchers
expect.extend({
    toBeValidSlug(received) {
        const pass = /^[a-z0-9-]+$/.test(received) && 
                    received.length >= 3 && 
                    received.length <= 80 &&
                    !received.startsWith('-') &&
                    !received.endsWith('-');
        
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid slug`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${received} to be a valid slug (3-80 chars, alphanumeric + hyphens, no leading/trailing hyphens)`,
                pass: false
            };
        }
    },
    
    toBeValidHTML(received) {
        const pass = typeof received === 'string' && 
                    received.length > 0 &&
                    !received.includes('<script') &&
                    !received.includes('javascript:');
        
        if (pass) {
            return {
                message: () => `expected ${received} not to be valid HTML`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${received} to be valid HTML (no scripts, no javascript: protocols)`,
                pass: false
            };
        }
    }
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Cleanup after all tests
afterAll(() => {
    // Restore console
    global.console = originalConsole;
});