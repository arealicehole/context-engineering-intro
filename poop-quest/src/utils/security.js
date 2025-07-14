/**
 * Security Utilities for XSS Prevention and Content Sanitization
 * Comprehensive security functions for safe HTML handling
 */

/**
 * HTML sanitization configuration
 * Defines allowed tags, attributes, and protocols
 */
const SAFE_HTML_CONFIG = {
    allowedTags: [
        // Text content
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
        // Headers
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        // Lists
        'ul', 'ol', 'li',
        // Links and media
        'a', 'img',
        // Tables
        'table', 'thead', 'tbody', 'tr', 'td', 'th',
        // Code
        'code', 'pre', 'blockquote',
        // Semantic
        'article', 'section', 'aside', 'header', 'footer', 'main', 'nav',
        // Other safe elements
        'hr', 'small', 'sub', 'sup', 'mark', 'del', 'ins', 'abbr', 'cite',
        'q', 'dfn', 'time', 'kbd', 'samp', 'var', 'details', 'summary'
    ],
    allowedAttributes: {
        'a': ['href', 'title', 'target', 'rel'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        'blockquote': ['cite'],
        'q': ['cite'],
        'time': ['datetime'],
        'abbr': ['title'],
        'dfn': ['title'],
        'th': ['scope', 'colspan', 'rowspan'],
        'td': ['colspan', 'rowspan'],
        'details': ['open'],
        '*': ['class', 'id', 'style'] // Limited global attributes
    },
    allowedProtocols: ['http', 'https', 'mailto', 'tel'],
    allowedStyles: [
        'color', 'background-color', 'font-size', 'font-family', 'font-weight',
        'text-align', 'text-decoration', 'margin', 'padding', 'border',
        'width', 'height', 'display', 'float', 'clear'
    ]
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - Raw HTML content
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html, options = {}) {
    if (!html || typeof html !== 'string') {
        return '';
    }
    
    const config = {
        ...SAFE_HTML_CONFIG,
        ...options
    };
    
    // Remove script tags and their content
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove style tags and their content (unless specifically allowed)
    if (!config.allowStyleTags) {
        html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    }
    
    // Remove dangerous event handlers
    html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    html = html.replace(/\s*on\w+\s*=\s*[^"'\s>]+/gi, '');
    
    // Remove javascript: protocols
    html = html.replace(/javascript:/gi, '');
    
    // Remove data: protocols (except for images if explicitly allowed)
    if (!config.allowDataUrls) {
        html = html.replace(/data:/gi, '');
    }
    
    // Remove vbscript: protocols
    html = html.replace(/vbscript:/gi, '');
    
    // Remove potentially dangerous attributes
    const dangerousAttrs = [
        'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
        'onkeydown', 'onkeyup', 'onsubmit', 'onchange', 'onfocus',
        'onblur', 'onscroll', 'onresize', 'onunload', 'onbeforeunload'
    ];
    
    dangerousAttrs.forEach(attr => {
        const regex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
        html = html.replace(regex, '');
    });
    
    // Sanitize specific elements
    html = sanitizeElements(html, config);
    
    // Sanitize attributes
    html = sanitizeAttributes(html, config);
    
    // Remove empty elements that might be used for injection
    html = html.replace(/<(\w+)(?:\s+[^>]*)?>[\s]*<\/\1>/gi, '');
    
    return html.trim();
}

/**
 * Sanitize specific HTML elements
 * @param {string} html - HTML content
 * @param {Object} config - Sanitization configuration
 * @returns {string} Sanitized HTML
 */
function sanitizeElements(html, config) {
    // Remove disallowed tags
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    
    return html.replace(tagRegex, (match, tagName) => {
        const lowerTagName = tagName.toLowerCase();
        
        // If tag is not in allowed list, remove it
        if (!config.allowedTags.includes(lowerTagName)) {
            return '';
        }
        
        return match;
    });
}

/**
 * Sanitize HTML attributes
 * @param {string} html - HTML content
 * @param {Object} config - Sanitization configuration
 * @returns {string} Sanitized HTML
 */
function sanitizeAttributes(html, config) {
    const elementRegex = /<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*)?)>/g;
    
    return html.replace(elementRegex, (match, tagName, attributes) => {
        const lowerTagName = tagName.toLowerCase();
        
        if (!attributes) {
            return match;
        }
        
        // Parse attributes
        const attrRegex = /\s+([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*["']([^"']*)["']/g;
        const sanitizedAttrs = [];
        let attrMatch;
        
        while ((attrMatch = attrRegex.exec(attributes)) !== null) {
            const [, attrName, attrValue] = attrMatch;
            const lowerAttrName = attrName.toLowerCase();
            
            // Check if attribute is allowed for this tag
            const allowedForTag = config.allowedAttributes[lowerTagName] || [];
            const allowedGlobally = config.allowedAttributes['*'] || [];
            
            if (allowedForTag.includes(lowerAttrName) || allowedGlobally.includes(lowerAttrName)) {
                const sanitizedValue = sanitizeAttributeValue(lowerAttrName, attrValue, config);
                if (sanitizedValue !== null) {
                    sanitizedAttrs.push(`${attrName}="${sanitizedValue}"`);
                }
            }
        }
        
        const attrString = sanitizedAttrs.length > 0 ? ' ' + sanitizedAttrs.join(' ') : '';
        return `<${tagName}${attrString}>`;
    });
}

/**
 * Sanitize attribute values
 * @param {string} attrName - Attribute name
 * @param {string} attrValue - Attribute value
 * @param {Object} config - Sanitization configuration
 * @returns {string|null} Sanitized value or null if invalid
 */
function sanitizeAttributeValue(attrName, attrValue, config) {
    if (!attrValue) return '';
    
    // Handle href attributes
    if (attrName === 'href') {
        return sanitizeURL(attrValue, config.allowedProtocols);
    }
    
    // Handle src attributes
    if (attrName === 'src') {
        return sanitizeURL(attrValue, [...config.allowedProtocols, 'data']);
    }
    
    // Handle style attributes
    if (attrName === 'style') {
        return sanitizeStyleAttribute(attrValue, config.allowedStyles);
    }
    
    // Handle class and id attributes
    if (attrName === 'class' || attrName === 'id') {
        return sanitizeClassOrId(attrValue);
    }
    
    // Handle target attribute
    if (attrName === 'target') {
        return ['_blank', '_self', '_parent', '_top'].includes(attrValue) ? attrValue : null;
    }
    
    // Handle rel attribute
    if (attrName === 'rel') {
        const allowedRels = ['nofollow', 'noopener', 'noreferrer', 'alternate', 'canonical'];
        const rels = attrValue.split(/\s+/).filter(rel => allowedRels.includes(rel));
        return rels.length > 0 ? rels.join(' ') : null;
    }
    
    // General sanitization for other attributes
    return escapeHTML(attrValue);
}

/**
 * Sanitize URLs
 * @param {string} url - URL to sanitize
 * @param {string[]} allowedProtocols - Allowed protocols
 * @returns {string|null} Sanitized URL or null if invalid
 */
function sanitizeURL(url, allowedProtocols) {
    if (!url || typeof url !== 'string') {
        return null;
    }
    
    // Remove whitespace
    url = url.trim();
    
    // Check for dangerous protocols
    if (url.match(/^(javascript|vbscript|data):/i)) {
        return null;
    }
    
    // Allow relative URLs
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
        return url;
    }
    
    // Check protocol
    try {
        const urlObj = new URL(url);
        if (!allowedProtocols.includes(urlObj.protocol.slice(0, -1))) {
            return null;
        }
        return url;
    } catch {
        // If URL parsing fails, treat as relative
        return url;
    }
}

/**
 * Sanitize style attribute
 * @param {string} style - Style attribute value
 * @param {string[]} allowedStyles - Allowed CSS properties
 * @returns {string} Sanitized style
 */
function sanitizeStyleAttribute(style, allowedStyles) {
    if (!style || typeof style !== 'string') {
        return '';
    }
    
    const declarations = style.split(';').map(decl => decl.trim()).filter(decl => decl);
    const sanitizedDeclarations = [];
    
    declarations.forEach(declaration => {
        const [property, value] = declaration.split(':').map(part => part.trim());
        
        if (property && value && allowedStyles.includes(property.toLowerCase())) {
            // Remove potentially dangerous CSS values
            if (!value.match(/(expression|javascript|vbscript|behavior|binding|@import|url\()/i)) {
                sanitizedDeclarations.push(`${property}: ${value}`);
            }
        }
    });
    
    return sanitizedDeclarations.join('; ');
}

/**
 * Sanitize class or id attributes
 * @param {string} value - Class or ID value
 * @returns {string} Sanitized value
 */
function sanitizeClassOrId(value) {
    if (!value || typeof value !== 'string') {
        return '';
    }
    
    // Remove potentially dangerous characters
    return value.replace(/[^a-zA-Z0-9_-\s]/g, '').trim();
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHTML(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'\/]/g, char => htmlEscapes[char]);
}

/**
 * Unescape HTML entities
 * @param {string} text - Text with HTML entities
 * @returns {string} Unescaped text
 */
export function unescapeHTML(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    const htmlUnescapes = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#x2F;': '/'
    };
    
    return text.replace(/&(?:amp|lt|gt|quot|#39|#x2F);/g, entity => htmlUnescapes[entity] || entity);
}

/**
 * Validate input against XSS patterns
 * @param {string} input - Input to validate
 * @returns {Object} Validation result
 */
export function validateInput(input) {
    if (!input || typeof input !== 'string') {
        return { isValid: true, threats: [] };
    }
    
    const threats = [];
    const xssPatterns = [
        // Script injection
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        // Event handlers
        /on\w+\s*=\s*["'][^"']*["']/gi,
        // JavaScript protocol
        /javascript:/gi,
        // VBScript protocol
        /vbscript:/gi,
        // Data URLs (potentially dangerous)
        /data:(?!image\/)/gi,
        // Expression in CSS
        /expression\s*\(/gi,
        // Import in CSS
        /@import/gi,
        // Behavior in CSS
        /behavior\s*:/gi,
        // Binding in CSS
        /binding\s*:/gi
    ];
    
    xssPatterns.forEach(pattern => {
        if (pattern.test(input)) {
            threats.push({
                type: 'XSS',
                pattern: pattern.source,
                description: 'Potential XSS attack pattern detected'
            });
        }
    });
    
    return {
        isValid: threats.length === 0,
        threats
    };
}

/**
 * Create Content Security Policy header
 * @param {Object} options - CSP options
 * @returns {string} CSP header value
 */
export function createCSPHeader(options = {}) {
    const defaultPolicy = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"]
    };
    
    const policy = { ...defaultPolicy, ...options };
    
    return Object.entries(policy)
        .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
        .join('; ');
}

/**
 * Generate nonce for inline scripts/styles
 * @returns {string} Base64 encoded nonce
 */
export function generateNonce() {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    return btoa(String.fromCharCode(...randomBytes));
}

/**
 * Rate limiting utility
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests per window
 * @returns {Function} Rate limiter function
 */
export function createRateLimiter(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    const requests = new Map();
    
    return (identifier) => {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        for (const [key, timestamps] of requests.entries()) {
            const validTimestamps = timestamps.filter(time => time > windowStart);
            if (validTimestamps.length === 0) {
                requests.delete(key);
            } else {
                requests.set(key, validTimestamps);
            }
        }
        
        // Check current identifier
        const currentRequests = requests.get(identifier) || [];
        const recentRequests = currentRequests.filter(time => time > windowStart);
        
        if (recentRequests.length >= maxRequests) {
            return {
                allowed: false,
                resetTime: Math.min(...recentRequests) + windowMs
            };
        }
        
        // Add current request
        recentRequests.push(now);
        requests.set(identifier, recentRequests);
        
        return {
            allowed: true,
            remaining: maxRequests - recentRequests.length
        };
    };
}

/**
 * CSRF token utilities
 */
export class CSRFTokenManager {
    constructor() {
        this.tokens = new Map();
        this.tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours
    }
    
    /**
     * Generate CSRF token
     * @param {string} sessionId - Session identifier
     * @returns {string} CSRF token
     */
    generateToken(sessionId) {
        const token = this.generateRandomToken();
        const expiresAt = Date.now() + this.tokenExpiry;
        
        this.tokens.set(sessionId, { token, expiresAt });
        
        // Clean expired tokens
        this.cleanExpiredTokens();
        
        return token;
    }
    
    /**
     * Validate CSRF token
     * @param {string} sessionId - Session identifier
     * @param {string} token - Token to validate
     * @returns {boolean} Is token valid
     */
    validateToken(sessionId, token) {
        const tokenData = this.tokens.get(sessionId);
        
        if (!tokenData) {
            return false;
        }
        
        if (Date.now() > tokenData.expiresAt) {
            this.tokens.delete(sessionId);
            return false;
        }
        
        return tokenData.token === token;
    }
    
    /**
     * Generate random token
     * @returns {string} Random token
     */
    generateRandomToken() {
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Clean expired tokens
     */
    cleanExpiredTokens() {
        const now = Date.now();
        for (const [sessionId, tokenData] of this.tokens.entries()) {
            if (now > tokenData.expiresAt) {
                this.tokens.delete(sessionId);
            }
        }
    }
}

/**
 * Safe JSON parsing with error handling
 * @param {string} json - JSON string
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed JSON or default value
 */
export function safeJSONParse(json, defaultValue = null) {
    try {
        return JSON.parse(json);
    } catch (error) {
        return defaultValue;
    }
}

/**
 * Safe JSON stringification
 * @param {*} obj - Object to stringify
 * @param {*} defaultValue - Default value if stringification fails
 * @returns {string} JSON string or default value
 */
export function safeJSONStringify(obj, defaultValue = '{}') {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        return defaultValue;
    }
}

/**
 * Validate file upload
 * @param {Object} file - File object
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateFileUpload(file, options = {}) {
    const config = {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['text/html', 'text/plain'],
        allowedExtensions: ['.html', '.htm', '.txt'],
        ...options
    };
    
    const errors = [];
    
    if (!file) {
        errors.push('No file provided');
        return { isValid: false, errors };
    }
    
    // Check file size
    if (file.size > config.maxSize) {
        errors.push(`File size exceeds maximum allowed size of ${config.maxSize / (1024 * 1024)}MB`);
    }
    
    // Check file type
    if (!config.allowedTypes.includes(file.type)) {
        errors.push(`File type '${file.type}' not allowed`);
    }
    
    // Check file extension
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (extension && !config.allowedExtensions.includes(extension)) {
        errors.push(`File extension '${extension}' not allowed`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Middleware for security headers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export function securityHeaders(req, res, next) {
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    const csp = createCSPHeader();
    res.setHeader('Content-Security-Policy', csp);
    
    next();
}

export default {
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
};