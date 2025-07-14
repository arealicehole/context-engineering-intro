import axios from 'axios';

/**
 * File handler utility for Discord attachments and code blocks
 * Utility functions with error handling for content extraction
 */

/**
 * Extract content from Discord message (attachments or code blocks)
 */
export async function extractContent(message) {
    try {
        // Check for file attachments first
        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            return await extractFromAttachment(attachment);
        }

        // Check for code blocks in message content
        const codeBlockContent = extractFromCodeBlock(message.content);
        if (codeBlockContent) {
            return {
                success: true,
                data: {
                    content: codeBlockContent,
                    type: 'codeblock',
                    filename: null
                }
            };
        }

        // No content found
        return {
            success: false,
            error: 'No HTML content found. Please upload an HTML file or use ```html code block```'
        };

    } catch (error) {
        console.error('Error extracting content:', error);
        return {
            success: false,
            error: `Failed to extract content: ${error.message}`
        };
    }
}

/**
 * Extract content from Discord attachment
 */
export async function extractFromAttachment(attachment) {
    try {
        // Validate file type
        const validationResult = validateAttachment(attachment);
        if (!validationResult.isValid) {
            return {
                success: false,
                error: validationResult.error
            };
        }

        // Download file content
        const response = await axios.get(attachment.url, {
            timeout: 30000, // 30 second timeout
            maxContentLength: parseInt(process.env.MAX_FILE_SIZE || '26214400'), // 25MB default
            responseType: 'text'
        });

        // Validate response
        if (!response.data || response.data.trim() === '') {
            return {
                success: false,
                error: 'Downloaded file is empty'
            };
        }

        // Basic HTML validation
        const htmlContent = response.data.trim();
        if (!isValidHtml(htmlContent)) {
            return {
                success: false,
                error: 'File does not contain valid HTML content'
            };
        }

        return {
            success: true,
            data: {
                content: htmlContent,
                type: 'attachment',
                filename: attachment.name
            }
        };

    } catch (error) {
        console.error('Error extracting from attachment:', error);
        
        // Handle specific error types
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return {
                success: false,
                error: 'Failed to download file: Network error'
            };
        }
        
        if (error.code === 'ECONNABORTED') {
            return {
                success: false,
                error: 'Failed to download file: Request timeout'
            };
        }
        
        if (error.message.includes('maxContentLength')) {
            return {
                success: false,
                error: 'File is too large (maximum 25MB)'
            };
        }

        return {
            success: false,
            error: `Failed to process attachment: ${error.message}`
        };
    }
}

/**
 * Extract content from code block in message
 */
export function extractFromCodeBlock(messageContent) {
    try {
        // Look for HTML code blocks
        const htmlCodeBlockRegex = /```html\n?([\s\S]*?)\n?```/i;
        const htmlMatch = messageContent.match(htmlCodeBlockRegex);
        
        if (htmlMatch && htmlMatch[1]) {
            const htmlContent = htmlMatch[1].trim();
            if (isValidHtml(htmlContent)) {
                return htmlContent;
            }
        }

        // Look for generic code blocks that might contain HTML
        const genericCodeBlockRegex = /```\n?([\s\S]*?)\n?```/;
        const genericMatch = messageContent.match(genericCodeBlockRegex);
        
        if (genericMatch && genericMatch[1]) {
            const content = genericMatch[1].trim();
            if (isValidHtml(content)) {
                return content;
            }
        }

        // Look for inline code that might be HTML
        const inlineCodeRegex = /`([^`]+)`/g;
        const inlineMatches = messageContent.match(inlineCodeRegex);
        
        if (inlineMatches) {
            for (const match of inlineMatches) {
                const content = match.replace(/`/g, '').trim();
                if (isValidHtml(content) && content.length > 20) {
                    return content;
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Error extracting from code block:', error);
        return null;
    }
}

/**
 * Validate Discord attachment
 */
export function validateAttachment(attachment) {
    const errors = [];

    // Check file size
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '26214400'); // 25MB
    if (attachment.size > maxFileSize) {
        errors.push(`File is too large (${formatFileSize(attachment.size)}). Maximum size is ${formatFileSize(maxFileSize)}`);
    }

    // Check file extension
    const allowedExtensions = ['.html', '.htm', '.xhtml'];
    const fileExtension = getFileExtension(attachment.name);
    
    if (!allowedExtensions.includes(fileExtension)) {
        errors.push(`File type not supported (${fileExtension}). Allowed types: ${allowedExtensions.join(', ')}`);
    }

    // Check filename
    if (!attachment.name || attachment.name.trim() === '') {
        errors.push('File has no name');
    }

    // Check if file is accessible
    if (!attachment.url) {
        errors.push('File URL is not accessible');
    }

    return {
        isValid: errors.length === 0,
        error: errors.join(', ')
    };
}

/**
 * Basic HTML validation
 */
export function isValidHtml(content) {
    if (!content || content.trim() === '') {
        return false;
    }

    // Must contain at least one HTML tag
    const hasHtmlTags = /<[a-zA-Z][^>]*>/i.test(content);
    
    // Must not be just a single tag
    const tagCount = (content.match(/<[a-zA-Z][^>]*>/g) || []).length;
    
    return hasHtmlTags && tagCount >= 1;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename) {
    if (!filename || filename.trim() === '') {
        return '';
    }
    
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract metadata from HTML content
 */
export function extractHtmlMetadata(htmlContent) {
    const metadata = {
        title: null,
        description: null,
        hasImages: false,
        hasLinks: false,
        hasStyles: false,
        hasScripts: false,
        wordCount: 0
    };

    try {
        // Extract title
        const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
            metadata.title = titleMatch[1].trim();
        }

        // Extract meta description
        const descriptionMatch = htmlContent.match(/<meta[^>]*name=['"]description['"][^>]*content=['"]([^'"]+)['"][^>]*>/i);
        if (descriptionMatch) {
            metadata.description = descriptionMatch[1].trim();
        }

        // Check for various elements
        metadata.hasImages = /<img[^>]*>/i.test(htmlContent);
        metadata.hasLinks = /<a[^>]*href[^>]*>/i.test(htmlContent);
        metadata.hasStyles = /<style[^>]*>/i.test(htmlContent) || /<link[^>]*rel=['"]stylesheet['"][^>]*>/i.test(htmlContent);
        metadata.hasScripts = /<script[^>]*>/i.test(htmlContent);

        // Calculate word count (approximate)
        const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        metadata.wordCount = textContent.split(' ').filter(word => word.length > 0).length;

    } catch (error) {
        console.error('Error extracting HTML metadata:', error);
    }

    return metadata;
}

/**
 * Sanitize HTML content for basic security
 */
export function sanitizeHtmlContent(htmlContent) {
    // Remove potentially dangerous elements
    const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
        /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
        /<input\b[^<]*(?:(?!<\/input>)<[^<]*)*<\/input>/gi,
        /<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi
    ];

    let sanitized = htmlContent;
    
    for (const pattern of dangerousPatterns) {
        sanitized = sanitized.replace(pattern, '');
    }

    // Remove javascript: and vbscript: protocols
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

    return sanitized;
}

/**
 * Validate HTML content size and structure
 */
export function validateHtmlContent(htmlContent) {
    const errors = [];
    
    // Check minimum length
    if (htmlContent.length < 10) {
        errors.push('HTML content is too short (minimum 10 characters)');
    }

    // Check maximum length
    const maxLength = parseInt(process.env.MAX_CONTENT_LENGTH || '1000000'); // 1MB default
    if (htmlContent.length > maxLength) {
        errors.push(`HTML content is too long (maximum ${formatFileSize(maxLength)})`);
    }

    // Check for basic HTML structure
    if (!isValidHtml(htmlContent)) {
        errors.push('Content does not appear to be valid HTML');
    }

    // Check for potentially dangerous content
    const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /onload=/gi,
        /onerror=/gi
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(htmlContent)) {
            errors.push('Content contains potentially dangerous elements');
            break;
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings: []
    };
}

/**
 * Get content statistics
 */
export function getContentStats(htmlContent) {
    const metadata = extractHtmlMetadata(htmlContent);
    const validation = validateHtmlContent(htmlContent);
    
    return {
        size: htmlContent.length,
        sizeFormatted: formatFileSize(htmlContent.length),
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        metadata
    };
}

/**
 * Process content with full validation and sanitization
 */
export async function processContent(message) {
    try {
        // Extract content
        const extractResult = await extractContent(message);
        if (!extractResult.success) {
            return extractResult;
        }

        const { content, type, filename } = extractResult.data;

        // Validate content
        const validation = validateHtmlContent(content);
        if (!validation.isValid) {
            return {
                success: false,
                error: `Content validation failed: ${validation.errors.join(', ')}`
            };
        }

        // Sanitize content
        const sanitizedContent = sanitizeHtmlContent(content);

        // Get content statistics
        const stats = getContentStats(sanitizedContent);

        return {
            success: true,
            data: {
                content: sanitizedContent,
                originalContent: content,
                type,
                filename,
                stats
            }
        };

    } catch (error) {
        console.error('Error processing content:', error);
        return {
            success: false,
            error: `Content processing failed: ${error.message}`
        };
    }
}

export default {
    extractContent,
    extractFromAttachment,
    extractFromCodeBlock,
    validateAttachment,
    isValidHtml,
    getFileExtension,
    formatFileSize,
    extractHtmlMetadata,
    sanitizeHtmlContent,
    validateHtmlContent,
    getContentStats,
    processContent
};