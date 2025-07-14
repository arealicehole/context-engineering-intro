/**
 * Security Utilities Tests
 * Comprehensive tests for XSS prevention and HTML sanitization
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
    sanitizeHTML,
    escapeHTML,
    unescapeHTML,
    validateInput,
    createCSPHeader,
    generateNonce,
    createRateLimiter,
    CSRFTokenManager,
    safeJSONParse,
    safeJSONStringify,
    validateFileUpload,
    securityHeaders
} from '../../src/utils/security.js';

describe('Security Utilities', () => {
    describe('sanitizeHTML', () => {
        test('should allow safe HTML tags', () => {
            const html = '<p>Hello <strong>world</strong>!</p>';
            const result = sanitizeHTML(html);
            expect(result).toBe('<p>Hello <strong>world</strong>!</p>');
        });

        test('should remove script tags', () => {
            const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
            const result = sanitizeHTML(html);
            expect(result).toBe('<p>Hello</p><p>World</p>');
        });

        test('should remove event handlers', () => {
            const html = '<div onclick="alert(\'xss\')">Click me</div>';
            const result = sanitizeHTML(html);
            expect(result).toBe('<div>Click me</div>');
        });

        test('should remove javascript: protocols', () => {
            const html = '<a href="javascript:alert(\'xss\')">Link</a>';
            const result = sanitizeHTML(html);
            expect(result).toBe('<a>Link</a>');
        });

        test('should remove dangerous attributes', () => {
            const html = '<img src="image.jpg" onload="alert(\'xss\')" onerror="alert(\'xss\')">';
            const result = sanitizeHTML(html);
            expect(result).toBe('<img src="image.jpg">');
        });

        test('should sanitize style attributes', () => {
            const html = '<div style="color: red; background: url(javascript:alert(1))">Test</div>';
            const result = sanitizeHTML(html);
            expect(result).toBe('<div style="color: red">Test</div>');
        });

        test('should handle empty input', () => {
            expect(sanitizeHTML('')).toBe('');
            expect(sanitizeHTML(null)).toBe('');
            expect(sanitizeHTML(undefined)).toBe('');
        });

        test('should remove style tags by default', () => {
            const html = '<style>body { background: red; }</style><p>Content</p>';
            const result = sanitizeHTML(html);
            expect(result).toBe('<p>Content</p>');
        });

        test('should handle complex nested HTML', () => {
            const html = `
                <div class="container">
                    <h1>Title</h1>
                    <p>Paragraph with <a href="https://example.com">link</a></p>
                    <img src="image.jpg" alt="Image">
                    <script>alert('xss')</script>
                </div>
            `;
            const result = sanitizeHTML(html);
            expect(result).not.toContain('<script>');
            expect(result).toContain('<h1>Title</h1>');
            expect(result).toContain('<a href="https://example.com">link</a>');
        });

        test('should handle malformed HTML', () => {
            const html = '<p>Test<script>alert(1)</p>';
            const result = sanitizeHTML(html);
            expect(result).not.toContain('<script>');
            expect(result).toContain('<p>Test</p>');
        });

        test('should preserve allowed attributes', () => {
            const html = '<a href="https://example.com" title="Example" target="_blank">Link</a>';
            const result = sanitizeHTML(html);
            expect(result).toBe('<a href="https://example.com" title="Example" target="_blank">Link</a>');
        });

        test('should handle data URLs carefully', () => {
            const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==">';
            const result = sanitizeHTML(html);
            expect(result).toBe('<img>');
        });

        test('should handle custom configuration', () => {
            const html = '<div>Hello <custom>world</custom></div>';
            const result = sanitizeHTML(html, {
                allowedTags: ['div', 'custom']
            });
            expect(result).toBe('<div>Hello <custom>world</custom></div>');
        });
    });

    describe('escapeHTML', () => {
        test('should escape HTML special characters', () => {
            const text = '<script>alert("xss")</script>';
            const result = escapeHTML(text);
            expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
        });

        test('should handle all special characters', () => {
            const text = '&<>"\'\/';
            const result = escapeHTML(text);
            expect(result).toBe('&amp;&lt;&gt;&quot;&#39;&#x2F;');
        });

        test('should handle empty input', () => {
            expect(escapeHTML('')).toBe('');
            expect(escapeHTML(null)).toBe('');
            expect(escapeHTML(undefined)).toBe('');
        });

        test('should handle normal text', () => {
            const text = 'Hello World';
            const result = escapeHTML(text);
            expect(result).toBe('Hello World');
        });
    });

    describe('unescapeHTML', () => {
        test('should unescape HTML entities', () => {
            const text = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
            const result = unescapeHTML(text);
            expect(result).toBe('<script>alert("xss")</script>');
        });

        test('should handle all HTML entities', () => {
            const text = '&amp;&lt;&gt;&quot;&#39;&#x2F;';
            const result = unescapeHTML(text);
            expect(result).toBe('&<>"\'\/');
        });

        test('should handle empty input', () => {
            expect(unescapeHTML('')).toBe('');
            expect(unescapeHTML(null)).toBe('');
            expect(unescapeHTML(undefined)).toBe('');
        });

        test('should handle normal text', () => {
            const text = 'Hello World';
            const result = unescapeHTML(text);
            expect(result).toBe('Hello World');
        });
    });

    describe('validateInput', () => {
        test('should validate safe input', () => {
            const input = 'Hello World';
            const result = validateInput(input);
            expect(result.isValid).toBe(true);
            expect(result.threats).toEqual([]);
        });

        test('should detect script injection', () => {
            const input = '<script>alert("xss")</script>';
            const result = validateInput(input);
            expect(result.isValid).toBe(false);
            expect(result.threats).toHaveLength(1);
            expect(result.threats[0].type).toBe('XSS');
        });

        test('should detect event handlers', () => {
            const input = '<div onclick="alert(1)">Click</div>';
            const result = validateInput(input);
            expect(result.isValid).toBe(false);
            expect(result.threats).toHaveLength(1);
        });

        test('should detect javascript: protocol', () => {
            const input = '<a href="javascript:alert(1)">Link</a>';
            const result = validateInput(input);
            expect(result.isValid).toBe(false);
            expect(result.threats).toHaveLength(1);
        });

        test('should detect multiple threats', () => {
            const input = '<script>alert(1)</script><div onclick="alert(2)">Test</div>';
            const result = validateInput(input);
            expect(result.isValid).toBe(false);
            expect(result.threats.length).toBeGreaterThan(1);
        });

        test('should handle empty input', () => {
            expect(validateInput('').isValid).toBe(true);
            expect(validateInput(null).isValid).toBe(true);
            expect(validateInput(undefined).isValid).toBe(true);
        });
    });

    describe('createCSPHeader', () => {
        test('should create default CSP header', () => {
            const csp = createCSPHeader();
            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain("script-src 'self' 'unsafe-inline'");
            expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
        });

        test('should allow custom CSP options', () => {
            const options = {
                'script-src': ["'self'", 'https://trusted.com']
            };
            const csp = createCSPHeader(options);
            expect(csp).toContain("script-src 'self' https://trusted.com");
        });

        test('should include security directives', () => {
            const csp = createCSPHeader();
            expect(csp).toContain("frame-ancestors 'none'");
            expect(csp).toContain("base-uri 'self'");
            expect(csp).toContain("form-action 'self'");
        });
    });

    describe('generateNonce', () => {
        test('should generate valid nonce', () => {
            const nonce = generateNonce();
            expect(typeof nonce).toBe('string');
            expect(nonce.length).toBeGreaterThan(0);
        });

        test('should generate different nonces', () => {
            const nonce1 = generateNonce();
            const nonce2 = generateNonce();
            expect(nonce1).not.toBe(nonce2);
        });

        test('should generate base64 encoded nonce', () => {
            const nonce = generateNonce();
            expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
        });
    });

    describe('createRateLimiter', () => {
        test('should allow requests within limit', () => {
            const limiter = createRateLimiter(60000, 5); // 5 requests per minute
            
            for (let i = 0; i < 5; i++) {
                const result = limiter('test-user');
                expect(result.allowed).toBe(true);
                expect(result.remaining).toBe(4 - i);
            }
        });

        test('should block requests over limit', () => {
            const limiter = createRateLimiter(60000, 2); // 2 requests per minute
            
            limiter('test-user');
            limiter('test-user');
            
            const result = limiter('test-user');
            expect(result.allowed).toBe(false);
            expect(result.resetTime).toBeDefined();
        });

        test('should handle different identifiers separately', () => {
            const limiter = createRateLimiter(60000, 1); // 1 request per minute
            
            const result1 = limiter('user1');
            const result2 = limiter('user2');
            
            expect(result1.allowed).toBe(true);
            expect(result2.allowed).toBe(true);
        });

        test('should reset after time window', () => {
            const limiter = createRateLimiter(100, 1); // 1 request per 100ms
            
            const result1 = limiter('test-user');
            expect(result1.allowed).toBe(true);
            
            const result2 = limiter('test-user');
            expect(result2.allowed).toBe(false);
            
            // Wait for window to reset
            return new Promise(resolve => {
                setTimeout(() => {
                    const result3 = limiter('test-user');
                    expect(result3.allowed).toBe(true);
                    resolve();
                }, 150);
            });
        });
    });

    describe('CSRFTokenManager', () => {
        let tokenManager;

        beforeEach(() => {
            tokenManager = new CSRFTokenManager();
        });

        test('should generate CSRF token', () => {
            const token = tokenManager.generateToken('session-123');
            expect(typeof token).toBe('string');
            expect(token.length).toBe(64); // 32 bytes * 2 (hex)
        });

        test('should validate correct token', () => {
            const token = tokenManager.generateToken('session-123');
            const isValid = tokenManager.validateToken('session-123', token);
            expect(isValid).toBe(true);
        });

        test('should reject invalid token', () => {
            tokenManager.generateToken('session-123');
            const isValid = tokenManager.validateToken('session-123', 'invalid-token');
            expect(isValid).toBe(false);
        });

        test('should reject token for wrong session', () => {
            const token = tokenManager.generateToken('session-123');
            const isValid = tokenManager.validateToken('session-456', token);
            expect(isValid).toBe(false);
        });

        test('should handle non-existent session', () => {
            const isValid = tokenManager.validateToken('non-existent', 'token');
            expect(isValid).toBe(false);
        });

        test('should generate unique tokens', () => {
            const token1 = tokenManager.generateToken('session-1');
            const token2 = tokenManager.generateToken('session-2');
            expect(token1).not.toBe(token2);
        });
    });

    describe('safeJSONParse', () => {
        test('should parse valid JSON', () => {
            const json = '{"name": "test", "value": 123}';
            const result = safeJSONParse(json);
            expect(result).toEqual({ name: 'test', value: 123 });
        });

        test('should return default value for invalid JSON', () => {
            const json = '{"invalid": json}';
            const result = safeJSONParse(json, { error: true });
            expect(result).toEqual({ error: true });
        });

        test('should return null as default for invalid JSON', () => {
            const json = '{"invalid": json}';
            const result = safeJSONParse(json);
            expect(result).toBeNull();
        });

        test('should handle empty string', () => {
            const result = safeJSONParse('', { empty: true });
            expect(result).toEqual({ empty: true });
        });
    });

    describe('safeJSONStringify', () => {
        test('should stringify valid object', () => {
            const obj = { name: 'test', value: 123 };
            const result = safeJSONStringify(obj);
            expect(result).toBe('{"name":"test","value":123}');
        });

        test('should handle circular references', () => {
            const obj = { name: 'test' };
            obj.self = obj; // Create circular reference
            
            const result = safeJSONStringify(obj, '{"error":"circular"}');
            expect(result).toBe('{"error":"circular"}');
        });

        test('should return default value for unstringifiable object', () => {
            const obj = { toJSON: () => { throw new Error('Cannot stringify'); } };
            const result = safeJSONStringify(obj, '{"error":true}');
            expect(result).toBe('{"error":true}');
        });
    });

    describe('validateFileUpload', () => {
        test('should validate correct file', () => {
            const file = {
                name: 'test.html',
                size: 1024,
                type: 'text/html'
            };
            
            const result = validateFileUpload(file);
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should reject file that is too large', () => {
            const file = {
                name: 'large.html',
                size: 20 * 1024 * 1024, // 20MB
                type: 'text/html'
            };
            
            const result = validateFileUpload(file);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('File size exceeds maximum allowed size of 10MB');
        });

        test('should reject disallowed file type', () => {
            const file = {
                name: 'test.exe',
                size: 1024,
                type: 'application/exe'
            };
            
            const result = validateFileUpload(file);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('File type'))).toBe(true);
        });

        test('should reject disallowed file extension', () => {
            const file = {
                name: 'test.php',
                size: 1024,
                type: 'text/html'
            };
            
            const result = validateFileUpload(file);
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('File extension'))).toBe(true);
        });

        test('should handle missing file', () => {
            const result = validateFileUpload(null);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('No file provided');
        });

        test('should handle custom options', () => {
            const file = {
                name: 'test.js',
                size: 1024,
                type: 'application/javascript'
            };
            
            const options = {
                allowedTypes: ['application/javascript'],
                allowedExtensions: ['.js']
            };
            
            const result = validateFileUpload(file, options);
            expect(result.isValid).toBe(true);
        });
    });

    describe('securityHeaders', () => {
        test('should set security headers', () => {
            const req = {};
            const res = {
                setHeader: jest.fn()
            };
            const next = jest.fn();
            
            securityHeaders(req, res, next);
            
            expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
            expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
            expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
            expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
            expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String));
            expect(next).toHaveBeenCalled();
        });
    });

    describe('Edge cases and stress tests', () => {
        test('should handle very large HTML content', () => {
            const largeHtml = '<div>' + 'x'.repeat(100000) + '</div>';
            const result = sanitizeHTML(largeHtml);
            expect(result).toContain('<div>');
            expect(result).toContain('</div>');
        });

        test('should handle deeply nested HTML', () => {
            let html = '';
            for (let i = 0; i < 100; i++) {
                html += '<div>';
            }
            html += 'content';
            for (let i = 0; i < 100; i++) {
                html += '</div>';
            }
            
            const result = sanitizeHTML(html);
            expect(result).toContain('content');
        });

        test('should handle mixed content types', () => {
            const html = `
                <div>
                    <p>Text content</p>
                    <img src="image.jpg" alt="Image">
                    <a href="https://example.com">Link</a>
                    <script>alert('xss')</script>
                    <style>body { background: red; }</style>
                </div>
            `;
            
            const result = sanitizeHTML(html);
            expect(result).toContain('<p>Text content</p>');
            expect(result).toContain('<img src="image.jpg" alt="Image">');
            expect(result).toContain('<a href="https://example.com">Link</a>');
            expect(result).not.toContain('<script>');
            expect(result).not.toContain('<style>');
        });
    });
});