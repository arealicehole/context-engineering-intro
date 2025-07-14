import express from 'express';
import { Post } from '../../database/models/post.js';

const router = express.Router();

/**
 * Dynamic post route /:slug
 * Dynamic route handling for individual posts
 */
router.get('/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        
        // Validate slug format
        if (!slug || slug.trim() === '' || !/^[a-z0-9-]+$/.test(slug)) {
            return res.status(404).render('404', {
                title: 'Post Not Found',
                description: 'The requested post could not be found.',
                error: {
                    message: 'Invalid post URL format',
                    status: 404
                }
            });
        }

        // Find post by slug
        const post = await Post.findBySlug(slug);
        
        if (!post) {
            return res.status(404).render('404', {
                title: 'Post Not Found',
                description: 'The requested post could not be found.',
                error: {
                    message: `Post with slug "${slug}" not found`,
                    status: 404
                }
            });
        }

        // Get related posts (same author or similar content)
        const relatedPosts = await getRelatedPosts(post);

        // SEO metadata for the post
        const seoData = {
            title: post.title,
            description: post.description,
            canonical: `${req.app.locals.baseUrl}/${post.slug}`,
            ogUrl: `${req.app.locals.baseUrl}/${post.slug}`,
            ogTitle: post.title,
            ogDescription: post.description,
            ogImage: generateOgImage(post),
            ogType: 'article',
            twitterCard: 'summary_large_image',
            twitterTitle: post.title,
            twitterDescription: post.description,
            twitterImage: generateTwitterImage(post),
            article: {
                author: post.discord_username,
                publishedTime: post.created_at,
                modifiedTime: post.updated_at,
                section: 'User Generated Content',
                tags: extractTags(post.html_content)
            },
            structuredData: {
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: post.title,
                description: post.description,
                author: {
                    '@type': 'Person',
                    name: post.discord_username
                },
                publisher: {
                    '@type': 'Organization',
                    name: 'Poop Quest',
                    logo: {
                        '@type': 'ImageObject',
                        url: `${req.app.locals.baseUrl}/images/logo.png`
                    }
                },
                datePublished: post.created_at,
                dateModified: post.updated_at,
                url: `${req.app.locals.baseUrl}/${post.slug}`,
                mainEntityOfPage: {
                    '@type': 'WebPage',
                    '@id': `${req.app.locals.baseUrl}/${post.slug}`
                }
            }
        };

        // Calculate reading time
        const readingTime = calculateReadingTime(post.html_content);
        
        // Generate breadcrumbs
        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: post.title, url: `/${post.slug}`, current: true }
        ];

        // Render post template
        res.render('post', {
            title: seoData.title,
            description: seoData.description,
            post,
            relatedPosts,
            readingTime,
            breadcrumbs,
            seo: seoData,
            shareUrls: generateShareUrls(post, req.app.locals.baseUrl)
        });

    } catch (error) {
        console.error('Post route error:', error);
        
        res.status(500).render('error', {
            title: 'Error Loading Post',
            description: 'An error occurred while loading the post.',
            error: {
                message: process.env.NODE_ENV === 'development' ? error.message : 'Post could not be loaded',
                status: 500
            }
        });
    }
});

/**
 * Post preview route (for drafts or admin)
 */
router.get('/:slug/preview', async (req, res) => {
    try {
        const slug = req.params.slug;
        const post = await Post.findBySlug(slug);
        
        if (!post) {
            return res.status(404).render('404', {
                title: 'Post Not Found',
                description: 'The requested post could not be found.',
                error: {
                    message: `Post with slug "${slug}" not found`,
                    status: 404
                }
            });
        }

        // Basic SEO for preview (no indexing)
        const seoData = {
            title: `Preview: ${post.title}`,
            description: post.description,
            canonical: `${req.app.locals.baseUrl}/${post.slug}/preview`,
            noindex: true,
            nofollow: true
        };

        res.render('post-preview', {
            title: seoData.title,
            description: seoData.description,
            post,
            seo: seoData,
            isPreview: true
        });

    } catch (error) {
        console.error('Post preview error:', error);
        
        res.status(500).render('error', {
            title: 'Preview Error',
            description: 'An error occurred while loading the post preview.',
            error: {
                message: process.env.NODE_ENV === 'development' ? error.message : 'Preview unavailable',
                status: 500
            }
        });
    }
});

/**
 * Post raw content route (for debugging/API access)
 */
router.get('/:slug/raw', async (req, res) => {
    try {
        const slug = req.params.slug;
        const post = await Post.findBySlug(slug);
        
        if (!post) {
            return res.status(404).json({
                error: 'Post not found',
                status: 404
            });
        }

        // Return raw HTML content
        res.type('text/html');
        res.send(post.html_content);

    } catch (error) {
        console.error('Post raw content error:', error);
        
        res.status(500).json({
            error: 'Failed to load raw content',
            status: 500
        });
    }
});

/**
 * Get related posts for a given post
 */
async function getRelatedPosts(post, limit = 3) {
    try {
        // Get posts from the same author
        const authorPosts = await Post.findByDiscordUserId(post.discord_user_id, {
            limit: limit + 1, // +1 to account for current post
            orderBy: 'created_at',
            orderDirection: 'DESC'
        });

        // Filter out current post
        const relatedFromAuthor = authorPosts.filter(p => p.id !== post.id).slice(0, limit);

        // If we need more posts, get recent ones
        if (relatedFromAuthor.length < limit) {
            const needed = limit - relatedFromAuthor.length;
            const recentPosts = await Post.findAll({
                limit: needed + 10, // Get extra to filter out current post and author posts
                orderBy: 'created_at',
                orderDirection: 'DESC'
            });

            const additionalPosts = recentPosts
                .filter(p => p.id !== post.id && p.discord_user_id !== post.discord_user_id)
                .slice(0, needed);

            return [...relatedFromAuthor, ...additionalPosts];
        }

        return relatedFromAuthor;
    } catch (error) {
        console.error('Error getting related posts:', error);
        return [];
    }
}

/**
 * Calculate reading time for HTML content
 */
function calculateReadingTime(htmlContent) {
    const wordsPerMinute = 200;
    
    // Strip HTML tags and count words
    const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(' ').filter(word => word.length > 0).length;
    
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return {
        minutes,
        words: wordCount,
        text: `${minutes} min read`
    };
}

/**
 * Extract tags from HTML content
 */
function extractTags(htmlContent) {
    const text = htmlContent.replace(/<[^>]*>/g, ' ').toLowerCase();
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    const words = text.split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.has(word))
        .slice(0, 10);
    
    return [...new Set(words)]; // Remove duplicates
}

/**
 * Generate OpenGraph image URL
 */
function generateOgImage(post) {
    // In a real implementation, you might generate dynamic OG images
    // For now, return a default image
    return `${process.env.BASE_URL || 'https://poop.quest'}/images/og-default.png`;
}

/**
 * Generate Twitter image URL
 */
function generateTwitterImage(post) {
    // In a real implementation, you might generate dynamic Twitter images
    // For now, return a default image
    return `${process.env.BASE_URL || 'https://poop.quest'}/images/twitter-default.png`;
}

/**
 * Generate social sharing URLs
 */
function generateShareUrls(post, baseUrl) {
    const postUrl = `${baseUrl}/${post.slug}`;
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedTitle = encodeURIComponent(post.title);
    const encodedDescription = encodeURIComponent(post.description);

    return {
        twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
        hackernews: `https://news.ycombinator.com/submitlink?u=${encodedUrl}&t=${encodedTitle}`,
        email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
        copy: postUrl
    };
}

/**
 * Handle post not found with suggestions
 */
router.use('/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        
        // Try to find similar posts
        const allPosts = await Post.findAll({
            limit: 50,
            orderBy: 'created_at',
            orderDirection: 'DESC'
        });

        // Simple similarity check
        const similarPosts = allPosts.filter(post => {
            const similarity = calculateSimilarity(slug, post.slug);
            return similarity > 0.5;
        }).slice(0, 5);

        res.status(404).render('404', {
            title: 'Post Not Found',
            description: 'The requested post could not be found.',
            error: {
                message: `Post with slug "${slug}" not found`,
                status: 404
            },
            suggestions: similarPosts.map(post => ({
                title: post.title,
                url: `/${post.slug}`,
                slug: post.slug
            }))
        });

    } catch (error) {
        console.error('404 handler error:', error);
        
        res.status(404).render('404', {
            title: 'Post Not Found',
            description: 'The requested post could not be found.',
            error: {
                message: 'Post not found',
                status: 404
            }
        });
    }
});

/**
 * Calculate similarity between two strings (basic implementation)
 */
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

export const postRouter = router;
export default router;