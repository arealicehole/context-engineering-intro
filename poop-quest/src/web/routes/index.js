import express from 'express';
import { Post } from '../../database/models/post.js';

const router = express.Router();

/**
 * Homepage route with recent posts
 * Express router pattern for displaying post listings
 */
router.get('/', async (req, res) => {
    try {
        // Parse pagination parameters
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 12));
        const offset = (page - 1) * limit;

        // Get recent posts with pagination
        const posts = await Post.findAll({
            limit,
            offset,
            orderBy: 'created_at',
            orderDirection: 'DESC'
        });

        // Get total count for pagination
        const totalPosts = await Post.getCount();
        const totalPages = Math.ceil(totalPosts / limit);

        // Calculate pagination info
        const pagination = {
            current: page,
            total: totalPages,
            limit,
            totalPosts,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null
        };

        // Generate pagination links
        const paginationLinks = generatePaginationLinks(page, totalPages, req.baseUrl);

        // SEO metadata for homepage
        const seoData = {
            title: 'Poop Quest - Transform HTML into Shareable Posts',
            description: 'Create and share beautiful web posts from your HTML content using Discord. Powered by AI for automatic metadata generation.',
            canonical: `${req.app.locals.baseUrl}/`,
            ogUrl: `${req.app.locals.baseUrl}/`,
            ogTitle: 'Poop Quest - HTML to Web Posts',
            ogDescription: 'Transform your HTML content into shareable web posts via Discord bot',
            ogImage: `${req.app.locals.baseUrl}/images/og-image.png`,
            twitterCard: 'summary_large_image',
            twitterTitle: 'Poop Quest - HTML to Web Posts',
            twitterDescription: 'Transform your HTML content into shareable web posts via Discord bot',
            twitterImage: `${req.app.locals.baseUrl}/images/twitter-card.png`,
            structuredData: {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'Poop Quest',
                description: 'Transform HTML content into shareable web posts',
                url: `${req.app.locals.baseUrl}/`,
                potentialAction: {
                    '@type': 'SearchAction',
                    target: `${req.app.locals.baseUrl}/search?q={search_term_string}`,
                    'query-input': 'required name=search_term_string'
                }
            }
        };

        // Render homepage template
        res.render('index', {
            title: seoData.title,
            description: seoData.description,
            posts,
            pagination,
            paginationLinks,
            seo: seoData,
            stats: {
                totalPosts,
                totalPages,
                currentPage: page
            }
        });

    } catch (error) {
        console.error('Homepage error:', error);
        
        // Render error page with fallback data
        res.status(500).render('error', {
            title: 'Error Loading Posts',
            description: 'An error occurred while loading the homepage.',
            error: {
                message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
                status: 500
            }
        });
    }
});

/**
 * Search route for posts
 */
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 12));
        const offset = (page - 1) * limit;

        let posts = [];
        let totalPosts = 0;

        if (query.trim()) {
            // Simple search implementation (can be enhanced with full-text search)
            const searchTerm = `%${query.trim()}%`;
            
            // This would need to be implemented in the Post model
            // For now, we'll use a basic approach
            const allPosts = await Post.findAll({
                orderBy: 'created_at',
                orderDirection: 'DESC'
            });

            // Filter posts by search term
            posts = allPosts.filter(post => 
                post.title.toLowerCase().includes(query.toLowerCase()) ||
                post.description.toLowerCase().includes(query.toLowerCase())
            ).slice(offset, offset + limit);

            totalPosts = allPosts.filter(post => 
                post.title.toLowerCase().includes(query.toLowerCase()) ||
                post.description.toLowerCase().includes(query.toLowerCase())
            ).length;
        }

        const totalPages = Math.ceil(totalPosts / limit);

        const pagination = {
            current: page,
            total: totalPages,
            limit,
            totalPosts,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null
        };

        const seoData = {
            title: query ? `Search Results for "${query}" - Poop Quest` : 'Search - Poop Quest',
            description: query ? `Search results for "${query}" in Poop Quest posts` : 'Search for posts in Poop Quest',
            canonical: `${req.app.locals.baseUrl}/search${query ? `?q=${encodeURIComponent(query)}` : ''}`,
            noindex: !query || posts.length === 0 // Don't index empty or no-query search pages
        };

        res.render('search', {
            title: seoData.title,
            description: seoData.description,
            posts,
            pagination,
            query,
            seo: seoData,
            stats: {
                totalPosts,
                totalPages,
                currentPage: page,
                searchTerm: query
            }
        });

    } catch (error) {
        console.error('Search error:', error);
        
        res.status(500).render('error', {
            title: 'Search Error',
            description: 'An error occurred while searching for posts.',
            error: {
                message: process.env.NODE_ENV === 'development' ? error.message : 'Search failed',
                status: 500
            }
        });
    }
});

/**
 * About page route
 */
router.get('/about', (req, res) => {
    const seoData = {
        title: 'About - Poop Quest',
        description: 'Learn about Poop Quest, the platform that transforms HTML content into shareable web posts using Discord and AI.',
        canonical: `${req.app.locals.baseUrl}/about`,
        ogUrl: `${req.app.locals.baseUrl}/about`,
        ogTitle: 'About Poop Quest',
        ogDescription: 'Platform for transforming HTML content into shareable web posts'
    };

    res.render('about', {
        title: seoData.title,
        description: seoData.description,
        seo: seoData
    });
});

/**
 * Privacy policy route
 */
router.get('/privacy', (req, res) => {
    const seoData = {
        title: 'Privacy Policy - Poop Quest',
        description: 'Privacy policy for Poop Quest platform and data handling practices.',
        canonical: `${req.app.locals.baseUrl}/privacy`,
        noindex: true // Don't index policy pages
    };

    res.render('privacy', {
        title: seoData.title,
        description: seoData.description,
        seo: seoData
    });
});

/**
 * Terms of service route
 */
router.get('/terms', (req, res) => {
    const seoData = {
        title: 'Terms of Service - Poop Quest',
        description: 'Terms of service for using the Poop Quest platform.',
        canonical: `${req.app.locals.baseUrl}/terms`,
        noindex: true // Don't index policy pages
    };

    res.render('terms', {
        title: seoData.title,
        description: seoData.description,
        seo: seoData
    });
});

/**
 * Statistics page (public stats)
 */
router.get('/stats', async (req, res) => {
    try {
        const totalPosts = await Post.getCount();
        const recentPosts = await Post.findAll({
            limit: 5,
            orderBy: 'created_at',
            orderDirection: 'DESC'
        });

        const seoData = {
            title: 'Statistics - Poop Quest',
            description: 'Public statistics for the Poop Quest platform.',
            canonical: `${req.app.locals.baseUrl}/stats`,
            noindex: true // Don't index stats pages
        };

        res.render('stats', {
            title: seoData.title,
            description: seoData.description,
            seo: seoData,
            stats: {
                totalPosts,
                recentPosts: recentPosts.map(post => post.toSafeJSON()),
                uptime: process.uptime(),
                memory: process.memoryUsage()
            }
        });

    } catch (error) {
        console.error('Stats error:', error);
        
        res.status(500).render('error', {
            title: 'Stats Error',
            description: 'An error occurred while loading statistics.',
            error: {
                message: process.env.NODE_ENV === 'development' ? error.message : 'Stats unavailable',
                status: 500
            }
        });
    }
});

/**
 * Generate pagination links for template
 */
function generatePaginationLinks(currentPage, totalPages, baseUrl) {
    const links = [];
    const maxLinks = 5;
    
    // Calculate start and end page numbers
    let startPage = Math.max(1, currentPage - Math.floor(maxLinks / 2));
    let endPage = Math.min(totalPages, startPage + maxLinks - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxLinks) {
        startPage = Math.max(1, endPage - maxLinks + 1);
    }

    // Previous page link
    if (currentPage > 1) {
        links.push({
            type: 'prev',
            page: currentPage - 1,
            url: `${baseUrl}?page=${currentPage - 1}`,
            text: 'Previous'
        });
    }

    // First page link
    if (startPage > 1) {
        links.push({
            type: 'page',
            page: 1,
            url: `${baseUrl}?page=1`,
            text: '1',
            active: false
        });
        
        if (startPage > 2) {
            links.push({
                type: 'ellipsis',
                text: '...'
            });
        }
    }

    // Page number links
    for (let i = startPage; i <= endPage; i++) {
        links.push({
            type: 'page',
            page: i,
            url: `${baseUrl}?page=${i}`,
            text: i.toString(),
            active: i === currentPage
        });
    }

    // Last page link
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            links.push({
                type: 'ellipsis',
                text: '...'
            });
        }
        
        links.push({
            type: 'page',
            page: totalPages,
            url: `${baseUrl}?page=${totalPages}`,
            text: totalPages.toString(),
            active: false
        });
    }

    // Next page link
    if (currentPage < totalPages) {
        links.push({
            type: 'next',
            page: currentPage + 1,
            url: `${baseUrl}?page=${currentPage + 1}`,
            text: 'Next'
        });
    }

    return links;
}

/**
 * Format date for display
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format relative time
 */
function formatRelativeTime(date) {
    const now = new Date();
    const postDate = new Date(date);
    const diffMs = now - postDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return postDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

export const indexRouter = router;
export default router;