/**
 * Slug Sanitizer Utility
 * Comprehensive slug generation and validation for URL-safe identifiers
 */

/**
 * Generate a URL-safe slug from a given string
 * @param {string} text - The text to convert to a slug
 * @param {Object} options - Configuration options
 * @returns {string} The sanitized slug
 */
export function generateSlug(text, options = {}) {
    const config = {
        maxLength: 80,
        lowercase: true,
        stripDiacritics: true,
        allowUnicode: false,
        customReplacements: {},
        ...options
    };
    
    if (!text || typeof text !== 'string') {
        throw new Error('generateSlug requires a non-empty string');
    }
    
    let slug = text;
    
    // Apply custom replacements first
    if (config.customReplacements && typeof config.customReplacements === 'object') {
        Object.entries(config.customReplacements).forEach(([find, replace]) => {
            slug = slug.replace(new RegExp(find, 'g'), replace);
        });
    }
    
    // Strip HTML tags
    slug = slug.replace(/<[^>]*>/g, '');
    
    // Strip diacritics if enabled
    if (config.stripDiacritics) {
        slug = stripDiacritics(slug);
    }
    
    // Convert to lowercase if enabled
    if (config.lowercase) {
        slug = slug.toLowerCase();
    }
    
    // Replace problematic characters
    slug = slug
        // Replace spaces, underscores, and multiple dashes with single dash
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        // Remove or replace special characters
        .replace(/[^\w\-\.~]/g, config.allowUnicode ? '' : '-')
        // Remove leading/trailing dashes and dots
        .replace(/^[-\.]+|[-\.]+$/g, '')
        // Collapse multiple dashes
        .replace(/-+/g, '-');
    
    // Ensure it starts and ends with alphanumeric characters
    slug = slug.replace(/^[^a-zA-Z0-9]+/, '');
    slug = slug.replace(/[^a-zA-Z0-9]+$/, '');
    
    // Trim to max length
    if (slug.length > config.maxLength) {
        slug = slug.substring(0, config.maxLength);
        // Ensure we don't cut off in the middle of a word
        const lastDash = slug.lastIndexOf('-');
        if (lastDash > config.maxLength * 0.7) {
            slug = slug.substring(0, lastDash);
        }
    }
    
    // Ensure minimum length
    if (slug.length < 3) {
        slug = `post-${generateRandomString(6)}`;
    }
    
    return slug;
}

/**
 * Validate a slug against URL-safe criteria
 * @param {string} slug - The slug to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateSlug(slug) {
    const errors = [];
    
    // Check if slug exists
    if (!slug || typeof slug !== 'string') {
        errors.push('Slug must be a non-empty string');
        return { isValid: false, errors };
    }
    
    // Check length
    if (slug.length < 3) {
        errors.push('Slug must be at least 3 characters long');
    }
    
    if (slug.length > 80) {
        errors.push('Slug must be no more than 80 characters long');
    }
    
    // Check valid characters (alphanumeric, hyphens, dots, tildes)
    if (!/^[a-zA-Z0-9\-\.~]+$/.test(slug)) {
        errors.push('Slug contains invalid characters (only letters, numbers, hyphens, dots, and tildes allowed)');
    }
    
    // Check that it doesn't start or end with non-alphanumeric
    if (!/^[a-zA-Z0-9]/.test(slug)) {
        errors.push('Slug must start with a letter or number');
    }
    
    if (!/[a-zA-Z0-9]$/.test(slug)) {
        errors.push('Slug must end with a letter or number');
    }
    
    // Check for consecutive hyphens
    if (/--+/.test(slug)) {
        errors.push('Slug cannot contain consecutive hyphens');
    }
    
    // Check against reserved words
    if (isReservedSlug(slug)) {
        errors.push('Slug cannot be a reserved word');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Check if a slug is reserved (conflicts with routes/system words)
 * @param {string} slug - The slug to check
 * @returns {boolean} True if slug is reserved
 */
export function isReservedSlug(slug) {
    const reservedWords = new Set([
        // System routes
        'api', 'admin', 'auth', 'login', 'logout', 'register', 'dashboard',
        'static', 'assets', 'public', 'images', 'css', 'js', 'robots.txt',
        'sitemap.xml', 'favicon.ico', 'manifest.json',
        
        // Application routes
        'search', 'about', 'contact', 'help', 'privacy', 'terms', 'stats',
        'health', 'status', 'ping', 'metrics', 'sitemap', 'feed', 'rss',
        
        // Common reserved words
        'www', 'mail', 'ftp', 'localhost', 'test', 'staging', 'dev', 'demo',
        'blog', 'news', 'posts', 'post', 'page', 'pages', 'user', 'users',
        'profile', 'settings', 'config', 'system', 'internal', 'external',
        
        // HTTP methods and common API terms
        'get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace',
        'connect', 'webhook', 'callback', 'oauth', 'token', 'refresh',
        
        // Database/technical terms
        'db', 'database', 'sql', 'query', 'index', 'cache', 'session',
        'cookie', 'cors', 'csrf', 'xss', 'injection', 'exploit',
        
        // File extensions that might conflict
        'html', 'htm', 'xml', 'json', 'txt', 'pdf', 'jpg', 'jpeg', 'png',
        'gif', 'svg', 'ico', 'css', 'js', 'php', 'asp', 'jsp'
    ]);
    
    return reservedWords.has(slug.toLowerCase());
}

/**
 * Generate a unique slug by appending numbers if needed
 * @param {string} baseSlug - The base slug to make unique
 * @param {Function} existsCallback - Async function to check if slug exists
 * @returns {Promise<string>} A unique slug
 */
export async function generateUniqueSlug(baseSlug, existsCallback) {
    if (typeof existsCallback !== 'function') {
        throw new Error('existsCallback must be a function');
    }
    
    let slug = baseSlug;
    let counter = 1;
    const maxAttempts = 100;
    
    while (await existsCallback(slug)) {
        if (counter > maxAttempts) {
            // Fallback to random string if too many attempts
            slug = `${baseSlug}-${generateRandomString(8)}`;
            break;
        }
        
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    
    return slug;
}

/**
 * Strip diacritics from a string
 * @param {string} str - The string to process
 * @returns {string} String with diacritics removed
 */
function stripDiacritics(str) {
    const diacriticsMap = {
        'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE',
        'Ç': 'C', 'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E', 'Ì': 'I', 'Í': 'I',
        'Î': 'I', 'Ï': 'I', 'Ð': 'D', 'Ñ': 'N', 'Ò': 'O', 'Ó': 'O', 'Ô': 'O',
        'Õ': 'O', 'Ö': 'O', 'Ø': 'O', 'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
        'Ý': 'Y', 'Þ': 'TH', 'ß': 'ss', 'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a',
        'ä': 'a', 'å': 'a', 'æ': 'ae', 'ç': 'c', 'è': 'e', 'é': 'e', 'ê': 'e',
        'ë': 'e', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ð': 'd', 'ñ': 'n',
        'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o', 'ù': 'u',
        'ú': 'u', 'û': 'u', 'ü': 'u', 'ý': 'y', 'þ': 'th', 'ÿ': 'y'
    };
    
    return str.replace(/[^\u0000-\u007E]/g, char => diacriticsMap[char] || char);
}

/**
 * Generate a random string for fallback slugs
 * @param {number} length - Length of the random string
 * @returns {string} Random alphanumeric string
 */
function generateRandomString(length = 6) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

/**
 * Convert a title to a basic slug (convenience function)
 * @param {string} title - The title to convert
 * @returns {string} The generated slug
 */
export function titleToSlug(title) {
    return generateSlug(title, {
        maxLength: 60,
        lowercase: true,
        stripDiacritics: true,
        allowUnicode: false
    });
}

/**
 * Clean and format a slug input from user
 * @param {string} userInput - Raw user input
 * @returns {string} Cleaned slug
 */
export function cleanUserSlug(userInput) {
    if (!userInput || typeof userInput !== 'string') {
        return '';
    }
    
    return generateSlug(userInput, {
        maxLength: 80,
        lowercase: true,
        stripDiacritics: true,
        allowUnicode: false,
        customReplacements: {
            // Replace common symbols with words
            '&': 'and',
            '@': 'at',
            '#': 'hash',
            '%': 'percent',
            '\\$': 'dollar',
            '\\+': 'plus',
            '=': 'equals'
        }
    });
}

/**
 * Suggest alternative slugs based on a given slug
 * @param {string} slug - The original slug
 * @returns {string[]} Array of alternative slug suggestions
 */
export function suggestAlternativeSlug(slug) {
    if (!slug || typeof slug !== 'string') {
        return [];
    }
    
    const alternatives = [];
    const cleanSlug = cleanUserSlug(slug);
    
    // Add timestamp-based alternatives
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    alternatives.push(`${cleanSlug}-${year}`);
    alternatives.push(`${cleanSlug}-${year}-${month}`);
    alternatives.push(`${cleanSlug}-${year}-${month}-${day}`);
    
    // Add numbered alternatives
    for (let i = 1; i <= 5; i++) {
        alternatives.push(`${cleanSlug}-${i}`);
    }
    
    // Add random alternatives
    for (let i = 0; i < 3; i++) {
        alternatives.push(`${cleanSlug}-${generateRandomString(4)}`);
    }
    
    // Add shortened alternatives if original is long
    if (cleanSlug.length > 20) {
        const words = cleanSlug.split('-');
        if (words.length > 1) {
            // Take first few words
            alternatives.push(words.slice(0, 2).join('-'));
            alternatives.push(words.slice(0, 3).join('-'));
            
            // Take last few words
            alternatives.push(words.slice(-2).join('-'));
            alternatives.push(words.slice(-3).join('-'));
        }
    }
    
    // Remove duplicates and filter out invalid ones
    const uniqueAlternatives = [...new Set(alternatives)]
        .filter(alt => alt.length >= 3 && alt.length <= 80)
        .filter(alt => validateSlug(alt).isValid);
    
    return uniqueAlternatives;
}

/**
 * Extract potential slug from HTML content
 * @param {string} htmlContent - HTML content to analyze
 * @returns {string} Suggested slug based on content
 */
export function extractSlugFromHTML(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') {
        return '';
    }
    
    // Try to extract from title tags
    const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
        return titleToSlug(titleMatch[1]);
    }
    
    // Try to extract from first h1
    const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match && h1Match[1]) {
        return titleToSlug(h1Match[1]);
    }
    
    // Try to extract from first h2
    const h2Match = htmlContent.match(/<h2[^>]*>(.*?)<\/h2>/i);
    if (h2Match && h2Match[1]) {
        return titleToSlug(h2Match[1]);
    }
    
    // Try to extract from meta description
    const metaMatch = htmlContent.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (metaMatch && metaMatch[1]) {
        return titleToSlug(metaMatch[1]);
    }
    
    // Fallback to extracting first meaningful text
    const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (textContent.length > 0) {
        const words = textContent.split(' ').slice(0, 5).join(' ');
        return titleToSlug(words);
    }
    
    return '';
}

/**
 * Batch process multiple slugs
 * @param {string[]} slugs - Array of slugs to process
 * @param {Object} options - Processing options
 * @returns {Object[]} Array of processed slug results
 */
export function batchProcessSlugs(slugs, options = {}) {
    if (!Array.isArray(slugs)) {
        throw new Error('batchProcessSlugs expects an array of slugs');
    }
    
    return slugs.map(slug => {
        try {
            const processed = generateSlug(slug, options);
            const validation = validateSlug(processed);
            
            return {
                original: slug,
                processed,
                isValid: validation.isValid,
                errors: validation.errors
            };
        } catch (error) {
            return {
                original: slug,
                processed: '',
                isValid: false,
                errors: [error.message]
            };
        }
    });
}

export default {
    generateSlug,
    validateSlug,
    isReservedSlug,
    generateUniqueSlug,
    titleToSlug,
    cleanUserSlug,
    suggestAlternativeSlug,
    extractSlugFromHTML,
    batchProcessSlugs
};