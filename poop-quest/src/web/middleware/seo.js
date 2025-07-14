/**
 * SEO middleware for metadata injection
 * Express middleware pattern for SEO optimization
 */

/**
 * SEO middleware that adds SEO helper functions to res.locals
 */
export function seoMiddleware(req, res, next) {
    // Add SEO helper functions to res.locals
    res.locals.seo = {
        generateMetaTags: generateMetaTags,
        generateOpenGraphTags: generateOpenGraphTags,
        generateTwitterCardTags: generateTwitterCardTags,
        generateStructuredData: generateStructuredData,
        generateCanonicalTag: generateCanonicalTag,
        generateAlternateLinks: generateAlternateLinks,
        generatePaginationLinks: generatePaginationLinks,
        sanitizeTitle: sanitizeTitle,
        sanitizeDescription: sanitizeDescription,
        truncateDescription: truncateDescription
    };

    // Add default SEO data
    res.locals.defaultSeo = {
        siteName: 'Poop Quest',
        siteDescription: 'Transform your HTML content into shareable web posts',
        siteUrl: req.app.locals.baseUrl,
        author: 'Poop Quest',
        twitterHandle: '@poopquest',
        locale: 'en_US',
        type: 'website',
        image: `${req.app.locals.baseUrl}/images/og-default.png`,
        imageWidth: 1200,
        imageHeight: 630
    };

    // Add request-specific data
    res.locals.requestData = {
        url: req.originalUrl,
        fullUrl: `${req.app.locals.baseUrl}${req.originalUrl}`,
        userAgent: req.get('User-Agent'),
        isBot: isBot(req.get('User-Agent')),
        timestamp: new Date().toISOString()
    };

    next();
}

/**
 * Generate basic meta tags
 */
function generateMetaTags(seoData) {
    const tags = [];
    
    // Basic meta tags
    if (seoData.title) {
        tags.push(`<title>${sanitizeTitle(seoData.title)}</title>`);
    }
    
    if (seoData.description) {
        tags.push(`<meta name="description" content="${sanitizeDescription(seoData.description)}">`);
    }
    
    if (seoData.keywords) {
        tags.push(`<meta name="keywords" content="${seoData.keywords.join(', ')}">`);
    }
    
    if (seoData.author) {
        tags.push(`<meta name="author" content="${seoData.author}">`);
    }
    
    // Canonical URL
    if (seoData.canonical) {
        tags.push(`<link rel="canonical" href="${seoData.canonical}">`);
    }
    
    // Robots directives
    const robotsDirectives = [];
    if (seoData.noindex) robotsDirectives.push('noindex');
    if (seoData.nofollow) robotsDirectives.push('nofollow');
    if (seoData.noarchive) robotsDirectives.push('noarchive');
    if (seoData.nosnippet) robotsDirectives.push('nosnippet');
    
    if (robotsDirectives.length > 0) {
        tags.push(`<meta name="robots" content="${robotsDirectives.join(', ')}">`);
    } else {
        tags.push('<meta name="robots" content="index, follow">');
    }
    
    // Language
    if (seoData.language) {
        tags.push(`<meta name="language" content="${seoData.language}">`);
    }
    
    // Viewport (mobile optimization)
    tags.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    
    // Content type
    tags.push('<meta charset="UTF-8">');
    
    return tags.join('\n    ');
}

/**
 * Generate OpenGraph tags
 */
function generateOpenGraphTags(seoData, defaultSeo) {
    const tags = [];
    
    // Required OpenGraph tags
    tags.push(`<meta property="og:title" content="${sanitizeTitle(seoData.ogTitle || seoData.title)}">`);
    tags.push(`<meta property="og:description" content="${sanitizeDescription(seoData.ogDescription || seoData.description)}">`);
    tags.push(`<meta property="og:url" content="${seoData.ogUrl || seoData.canonical}">`);
    tags.push(`<meta property="og:type" content="${seoData.ogType || 'website'}">`);
    
    // Image
    if (seoData.ogImage) {
        tags.push(`<meta property="og:image" content="${seoData.ogImage}">`);
        tags.push(`<meta property="og:image:width" content="${seoData.ogImageWidth || defaultSeo.imageWidth}">`);
        tags.push(`<meta property="og:image:height" content="${seoData.ogImageHeight || defaultSeo.imageHeight}">`);
        tags.push(`<meta property="og:image:alt" content="${seoData.ogImageAlt || seoData.title}">`);
    }
    
    // Site info
    tags.push(`<meta property="og:site_name" content="${defaultSeo.siteName}">`);
    tags.push(`<meta property="og:locale" content="${seoData.ogLocale || defaultSeo.locale}">`);
    
    // Article-specific tags
    if (seoData.article) {
        tags.push(`<meta property="article:author" content="${seoData.article.author}">`);
        tags.push(`<meta property="article:published_time" content="${seoData.article.publishedTime}">`);
        
        if (seoData.article.modifiedTime) {
            tags.push(`<meta property="article:modified_time" content="${seoData.article.modifiedTime}">`);
        }
        
        if (seoData.article.section) {
            tags.push(`<meta property="article:section" content="${seoData.article.section}">`);
        }
        
        if (seoData.article.tags) {
            seoData.article.tags.forEach(tag => {
                tags.push(`<meta property="article:tag" content="${tag}">`);
            });
        }
    }
    
    return tags.join('\n    ');
}

/**
 * Generate Twitter Card tags
 */
function generateTwitterCardTags(seoData, defaultSeo) {
    const tags = [];
    
    // Card type
    tags.push(`<meta name="twitter:card" content="${seoData.twitterCard || 'summary'}">`);
    
    // Site handle
    if (defaultSeo.twitterHandle) {
        tags.push(`<meta name="twitter:site" content="${defaultSeo.twitterHandle}">`);
    }
    
    // Content
    tags.push(`<meta name="twitter:title" content="${sanitizeTitle(seoData.twitterTitle || seoData.title)}">`);
    tags.push(`<meta name="twitter:description" content="${sanitizeDescription(seoData.twitterDescription || seoData.description)}">`);
    
    // Image
    if (seoData.twitterImage) {
        tags.push(`<meta name="twitter:image" content="${seoData.twitterImage}">`);
        tags.push(`<meta name="twitter:image:alt" content="${seoData.twitterImageAlt || seoData.title}">`);
    }
    
    // Creator (for articles)
    if (seoData.twitterCreator) {
        tags.push(`<meta name="twitter:creator" content="${seoData.twitterCreator}">`);
    }
    
    return tags.join('\n    ');
}

/**
 * Generate structured data (JSON-LD)
 */
function generateStructuredData(seoData) {
    if (!seoData.structuredData) return '';
    
    return `<script type="application/ld+json">${JSON.stringify(seoData.structuredData, null, 2)}</script>`;
}

/**
 * Generate canonical tag
 */
function generateCanonicalTag(url) {
    return `<link rel="canonical" href="${url}">`;
}

/**
 * Generate alternate language links
 */
function generateAlternateLinks(alternates) {
    if (!alternates || alternates.length === 0) return '';
    
    return alternates.map(alt => 
        `<link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}">`
    ).join('\n    ');
}

/**
 * Generate pagination links for SEO
 */
function generatePaginationLinks(pagination, baseUrl) {
    const links = [];
    
    if (pagination.hasPrev) {
        links.push(`<link rel="prev" href="${baseUrl}?page=${pagination.prevPage}">`);
    }
    
    if (pagination.hasNext) {
        links.push(`<link rel="next" href="${baseUrl}?page=${pagination.nextPage}">`);
    }
    
    return links.join('\n    ');
}

/**
 * Sanitize title for HTML output
 */
function sanitizeTitle(title) {
    if (!title) return '';
    return title
        .replace(/[<>&"']/g, (char) => {
            switch (char) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                default: return char;
            }
        })
        .substring(0, 60); // Limit to 60 characters for SEO
}

/**
 * Sanitize description for HTML output
 */
function sanitizeDescription(description) {
    if (!description) return '';
    return description
        .replace(/[<>&"']/g, (char) => {
            switch (char) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                default: return char;
            }
        })
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Truncate description to optimal length
 */
function truncateDescription(description, maxLength = 160) {
    if (!description) return '';
    
    const sanitized = sanitizeDescription(description);
    if (sanitized.length <= maxLength) return sanitized;
    
    // Find the last complete word within the limit
    const truncated = sanitized.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) { // If last space is reasonably close to limit
        return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated.substring(0, maxLength - 3) + '...';
}

/**
 * Check if user agent is a bot
 */
function isBot(userAgent) {
    if (!userAgent) return false;
    
    const botPatterns = [
        /googlebot/i,
        /bingbot/i,
        /slurp/i,
        /duckduckbot/i,
        /baiduspider/i,
        /yandexbot/i,
        /facebookexternalhit/i,
        /twitterbot/i,
        /linkedinbot/i,
        /whatsapp/i,
        /telegrambot/i,
        /discordbot/i,
        /redditbot/i,
        /applebot/i,
        /crawler/i,
        /spider/i,
        /bot/i
    ];
    
    return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbStructuredData(breadcrumbs, baseUrl) {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;
    
    const breadcrumbList = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: crumb.url ? `${baseUrl}${crumb.url}` : undefined
        }))
    };
    
    return breadcrumbList;
}

/**
 * Generate FAQ structured data
 */
export function generateFAQStructuredData(faqs) {
    if (!faqs || faqs.length === 0) return null;
    
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
            }
        }))
    };
}

/**
 * Generate website structured data
 */
export function generateWebsiteStructuredData(siteData) {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteData.name,
        description: siteData.description,
        url: siteData.url,
        author: {
            '@type': 'Organization',
            name: siteData.author
        },
        potentialAction: {
            '@type': 'SearchAction',
            target: `${siteData.url}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
        }
    };
}

/**
 * Middleware to handle SEO for specific routes
 */
export function routeSEOMiddleware(defaultSeoData) {
    return (req, res, next) => {
        // Merge default SEO data with route-specific data
        res.locals.seo = {
            ...res.locals.seo,
            ...defaultSeoData
        };
        
        next();
    };
}

/**
 * Middleware to add cache headers for SEO
 */
export function seoCache(req, res, next) {
    // Set cache headers for better SEO
    const isBot = res.locals.requestData?.isBot;
    
    if (isBot) {
        // Longer cache for bots
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    } else {
        // Shorter cache for users
        res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    }
    
    // Add ETag for better caching
    res.set('ETag', `"${Date.now()}"`);
    
    next();
}

/**
 * Generate complete SEO head content
 */
export function generateCompleteHead(seoData, defaultSeo, requestData) {
    const sections = [];
    
    // Basic meta tags
    sections.push(generateMetaTags(seoData));
    
    // OpenGraph tags
    sections.push(generateOpenGraphTags(seoData, defaultSeo));
    
    // Twitter Card tags
    sections.push(generateTwitterCardTags(seoData, defaultSeo));
    
    // Structured data
    const structuredData = generateStructuredData(seoData);
    if (structuredData) {
        sections.push(structuredData);
    }
    
    // Pagination links
    if (seoData.pagination) {
        sections.push(generatePaginationLinks(seoData.pagination, requestData.fullUrl));
    }
    
    // Alternate links
    if (seoData.alternates) {
        sections.push(generateAlternateLinks(seoData.alternates));
    }
    
    return sections.filter(section => section).join('\n    ');
}

export default {
    seoMiddleware,
    routeSEOMiddleware,
    seoCache,
    generateCompleteHead,
    generateBreadcrumbStructuredData,
    generateFAQStructuredData,
    generateWebsiteStructuredData
};