import { getGrokClient, GrokAPIError } from './grok-client.js';
import { getPromptTemplates } from './prompt-templates.js';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

/**
 * Content analyzer service
 * Service layer pattern for HTML content analysis with Grok API
 */
export class ContentAnalyzer {
    constructor() {
        this.grokClient = getGrokClient();
        this.promptTemplates = getPromptTemplates();
    }

    /**
     * Analyze HTML content and generate metadata
     * Main entry point for content analysis
     */
    async analyzeContent(htmlContent, options = {}) {
        const {
            contentType = 'general',
            discordUser = null,
            skipSanitization = false,
            fallbackTitle = 'Untitled Post',
            maxRetries = 2
        } = options;

        // Validate input
        if (!htmlContent || htmlContent.trim() === '') {
            throw new Error('HTML content is required');
        }

        try {
            // Step 1: Sanitize and extract content
            const sanitizedContent = skipSanitization ? htmlContent : this.sanitizeHTML(htmlContent);
            const extractedContent = this.extractTextContent(sanitizedContent);

            // Step 2: Choose appropriate prompt template
            const promptTemplate = this.selectPromptTemplate(contentType, extractedContent);

            // Step 3: Analyze with Grok API
            let analysis;
            let attempt = 0;
            
            while (attempt <= maxRetries) {
                try {
                    analysis = await this.grokClient.analyzeContent(sanitizedContent, {
                        customInstructions: promptTemplate,
                        temperature: 0.7 + (attempt * 0.1) // Slightly increase temperature on retries
                    });
                    break;
                } catch (error) {
                    if (attempt === maxRetries) {
                        throw error;
                    }
                    attempt++;
                    console.warn(`Analysis attempt ${attempt} failed, retrying...`);
                }
            }

            // Step 4: Post-process and validate results
            const processedAnalysis = this.postProcessAnalysis(analysis, {
                htmlContent: sanitizedContent,
                extractedContent,
                fallbackTitle,
                discordUser
            });

            // Step 5: Generate additional metadata
            const enhancedMetadata = await this.enhanceMetadata(processedAnalysis, {
                htmlContent: sanitizedContent,
                extractedContent,
                contentType
            });

            return {
                ...enhancedMetadata,
                analysis: {
                    contentType,
                    wordCount: this.getWordCount(extractedContent),
                    hasImages: this.hasImages(sanitizedContent),
                    hasLinks: this.hasLinks(sanitizedContent),
                    extractedContent: extractedContent.substring(0, 200) + '...' // Preview
                },
                metadata: {
                    analyzedAt: new Date().toISOString(),
                    analyzer: 'grok-content-analyzer',
                    version: '1.0.0',
                    discordUser: discordUser ? {
                        id: discordUser.id,
                        username: discordUser.username
                    } : null
                }
            };

        } catch (error) {
            console.error('Content analysis failed:', error);
            
            // Return fallback metadata on failure
            return this.generateFallbackMetadata(htmlContent, {
                fallbackTitle,
                discordUser,
                error: error.message
            });
        }
    }

    /**
     * Sanitize HTML content for security
     */
    sanitizeHTML(htmlContent) {
        try {
            const window = new JSDOM('').window;
            const purify = DOMPurify(window);
            
            // Configure DOMPurify for content analysis
            return purify.sanitize(htmlContent, {
                ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'strong', 'em', 'u', 'i', 'b', 'span', 'div', 'a', 'img', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
                KEEP_CONTENT: true,
                RETURN_DOM: false,
                RETURN_DOM_FRAGMENT: false
            });
        } catch (error) {
            console.warn('HTML sanitization failed, using original content:', error);
            return htmlContent;
        }
    }

    /**
     * Extract text content from HTML
     */
    extractTextContent(htmlContent) {
        try {
            const dom = new JSDOM(htmlContent);
            const textContent = dom.window.document.body?.textContent || '';
            return textContent.trim();
        } catch (error) {
            console.warn('Text extraction failed, using HTML content:', error);
            return htmlContent.replace(/<[^>]*>/g, '').trim();
        }
    }

    /**
     * Select appropriate prompt template based on content type
     */
    selectPromptTemplate(contentType, extractedContent) {
        const templates = this.promptTemplates;
        
        // Auto-detect content type if not specified
        if (contentType === 'general') {
            contentType = this.detectContentType(extractedContent);
        }

        switch (contentType) {
            case 'technical':
                return templates.technical;
            case 'creative':
                return templates.creative;
            case 'news':
                return templates.news;
            case 'tutorial':
                return templates.tutorial;
            default:
                return templates.general;
        }
    }

    /**
     * Auto-detect content type from text
     */
    detectContentType(text) {
        const lowerText = text.toLowerCase();

        // Technical content indicators
        if (lowerText.includes('function') || lowerText.includes('algorithm') || 
            lowerText.includes('code') || lowerText.includes('programming')) {
            return 'technical';
        }

        // Tutorial content indicators
        if (lowerText.includes('step') || lowerText.includes('tutorial') || 
            lowerText.includes('how to') || lowerText.includes('guide')) {
            return 'tutorial';
        }

        // News content indicators
        if (lowerText.includes('breaking') || lowerText.includes('announced') || 
            lowerText.includes('report') || lowerText.includes('according to')) {
            return 'news';
        }

        // Creative content indicators
        if (lowerText.includes('story') || lowerText.includes('poem') || 
            lowerText.includes('creative') || lowerText.includes('imagine')) {
            return 'creative';
        }

        return 'general';
    }

    /**
     * Post-process analysis results
     */
    postProcessAnalysis(analysis, context) {
        const { htmlContent, extractedContent, fallbackTitle, discordUser } = context;

        // Validate and clean slug
        let slug = analysis.slug || '';
        if (!/^[a-z0-9-]+$/.test(slug)) {
            slug = this.generateSlugFromTitle(analysis.title || fallbackTitle);
        }

        // Validate and clean title
        let title = analysis.title || fallbackTitle;
        if (title.length > 60) {
            title = title.substring(0, 57) + '...';
        }

        // Validate and clean description
        let description = analysis.description || this.generateDescriptionFromContent(extractedContent);
        if (description.length > 160) {
            description = description.substring(0, 157) + '...';
        }

        return {
            slug,
            title,
            description,
            originalAnalysis: analysis
        };
    }

    /**
     * Generate slug from title
     */
    generateSlugFromTitle(title) {
        if (!title || title.trim() === '') {
            return 'untitled-post';
        }

        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-')
            .substring(0, 50) || 'untitled-post';
    }

    /**
     * Generate description from content
     */
    generateDescriptionFromContent(content) {
        if (!content || content.trim() === '') {
            return 'User-generated content shared via Discord';
        }

        // Extract first meaningful sentence or paragraph
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
            let description = sentences[0].trim();
            if (description.length > 157) {
                description = description.substring(0, 154) + '...';
            }
            return description;
        }

        // Fallback to truncated content
        return content.length > 157 ? content.substring(0, 154) + '...' : content;
    }

    /**
     * Enhance metadata with additional analysis
     */
    async enhanceMetadata(analysis, context) {
        const { htmlContent, extractedContent, contentType } = context;

        // Generate additional metadata
        const enhanced = {
            ...analysis,
            wordCount: this.getWordCount(extractedContent),
            readingTime: this.calculateReadingTime(extractedContent),
            contentType,
            features: {
                hasImages: this.hasImages(htmlContent),
                hasLinks: this.hasLinks(htmlContent),
                hasCode: this.hasCode(htmlContent),
                hasLists: this.hasLists(htmlContent)
            }
        };

        // Generate tags/keywords (simple implementation)
        enhanced.tags = this.extractTags(extractedContent);

        return enhanced;
    }

    /**
     * Get word count from text
     */
    getWordCount(text) {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Calculate estimated reading time
     */
    calculateReadingTime(text) {
        const wordsPerMinute = 200;
        const wordCount = this.getWordCount(text);
        return Math.ceil(wordCount / wordsPerMinute);
    }

    /**
     * Check if HTML contains images
     */
    hasImages(htmlContent) {
        return /<img[^>]*>/i.test(htmlContent);
    }

    /**
     * Check if HTML contains links
     */
    hasLinks(htmlContent) {
        return /<a[^>]*href[^>]*>/i.test(htmlContent);
    }

    /**
     * Check if HTML contains code blocks
     */
    hasCode(htmlContent) {
        return /<(pre|code)[^>]*>/i.test(htmlContent);
    }

    /**
     * Check if HTML contains lists
     */
    hasLists(htmlContent) {
        return /<(ul|ol)[^>]*>/i.test(htmlContent);
    }

    /**
     * Extract simple tags from content
     */
    extractTags(text) {
        const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'a', 'an']);
        
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.has(word));

        // Count word frequency
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        // Return top 5 words as tags
        return Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    /**
     * Generate fallback metadata when analysis fails
     */
    generateFallbackMetadata(htmlContent, options = {}) {
        const { fallbackTitle = 'Untitled Post', discordUser, error } = options;

        const extractedContent = this.extractTextContent(htmlContent);
        const title = fallbackTitle;
        const slug = this.generateSlugFromTitle(title);
        const description = this.generateDescriptionFromContent(extractedContent);

        return {
            slug,
            title,
            description,
            wordCount: this.getWordCount(extractedContent),
            readingTime: this.calculateReadingTime(extractedContent),
            contentType: 'general',
            features: {
                hasImages: this.hasImages(htmlContent),
                hasLinks: this.hasLinks(htmlContent),
                hasCode: this.hasCode(htmlContent),
                hasLists: this.hasLists(htmlContent)
            },
            tags: this.extractTags(extractedContent),
            analysis: {
                contentType: 'general',
                wordCount: this.getWordCount(extractedContent),
                hasImages: this.hasImages(htmlContent),
                hasLinks: this.hasLinks(htmlContent),
                extractedContent: extractedContent.substring(0, 200) + '...'
            },
            metadata: {
                analyzedAt: new Date().toISOString(),
                analyzer: 'fallback-analyzer',
                version: '1.0.0',
                discordUser: discordUser ? {
                    id: discordUser.id,
                    username: discordUser.username
                } : null,
                error: error || 'AI analysis failed, used fallback'
            }
        };
    }

    /**
     * Batch analyze multiple pieces of content
     */
    async batchAnalyze(contentList, options = {}) {
        const results = [];
        
        for (const content of contentList) {
            try {
                const analysis = await this.analyzeContent(content, options);
                results.push({ success: true, analysis });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }

        return results;
    }
}

/**
 * Create singleton instance
 */
let contentAnalyzerInstance = null;

export function getContentAnalyzer() {
    if (!contentAnalyzerInstance) {
        contentAnalyzerInstance = new ContentAnalyzer();
    }
    return contentAnalyzerInstance;
}

export default ContentAnalyzer;