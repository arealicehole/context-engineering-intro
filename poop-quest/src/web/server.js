import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { indexRouter } from './routes/index.js';
import { postRouter } from './routes/post.js';
import { seoMiddleware } from './middleware/seo.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Express.js web server with EJS configuration
 * Following Express.js setup from documentation
 */
export class WebServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.baseUrl = process.env.BASE_URL || `http://localhost:${this.port}`;
        
        // Setup middleware and configuration
        this.setupMiddleware();
        this.setupTemplateEngine();
        this.setupStaticFiles();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * Setup middleware for security and functionality
     */
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"]
                }
            }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' 
                ? [this.baseUrl, 'https://poop.quest']
                : true,
            credentials: true
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per window
            message: {
                error: 'Too many requests from this IP, please try again later.'
            },
            standardHeaders: true,
            legacyHeaders: false,
            // Skip rate limiting for localhost in development
            skip: (req) => {
                return process.env.NODE_ENV === 'development' && 
                       (req.ip === '127.0.0.1' || req.ip === '::1');
            }
        });

        this.app.use(limiter);

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging in development
        if (process.env.NODE_ENV === 'development') {
            this.app.use((req, res, next) => {
                console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
                next();
            });
        }

        // SEO middleware (applied globally)
        this.app.use(seoMiddleware);
    }

    /**
     * Setup EJS template engine
     */
    setupTemplateEngine() {
        // Set views directory
        const viewsPath = path.join(__dirname, '..', '..', 'views');
        this.app.set('views', viewsPath);
        
        // Set view engine to EJS
        this.app.set('view engine', 'ejs');
        
        // EJS configuration
        this.app.set('view options', {
            layout: false // We'll handle layout manually
        });

        // Global template variables
        this.app.locals = {
            siteName: 'Poop Quest',
            siteDescription: 'Transform your HTML content into shareable web posts',
            baseUrl: this.baseUrl,
            currentYear: new Date().getFullYear(),
            version: '1.0.0'
        };
    }

    /**
     * Setup static file serving
     */
    setupStaticFiles() {
        const publicPath = path.join(__dirname, '..', '..', 'public');
        
        // Serve static files with caching
        this.app.use(express.static(publicPath, {
            maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
            etag: true,
            lastModified: true,
            setHeaders: (res, path) => {
                // Set proper MIME types
                if (path.endsWith('.css')) {
                    res.setHeader('Content-Type', 'text/css');
                } else if (path.endsWith('.js')) {
                    res.setHeader('Content-Type', 'application/javascript');
                } else if (path.endsWith('.png')) {
                    res.setHeader('Content-Type', 'image/png');
                } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
                    res.setHeader('Content-Type', 'image/jpeg');
                } else if (path.endsWith('.svg')) {
                    res.setHeader('Content-Type', 'image/svg+xml');
                }
            }
        }));

        // Serve favicon
        this.app.get('/favicon.ico', (req, res) => {
            res.sendFile(path.join(publicPath, 'images', 'favicon.ico'));
        });
    }

    /**
     * Setup application routes
     */
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: '1.0.0'
            });
        });

        // Robots.txt
        this.app.get('/robots.txt', (req, res) => {
            res.type('text/plain');
            res.send(`User-agent: *\nAllow: /\n\nSitemap: ${this.baseUrl}/sitemap.xml`);
        });

        // Sitemap.xml (basic implementation)
        this.app.get('/sitemap.xml', async (req, res) => {
            try {
                const { Post } = await import('../database/models/post.js');
                const posts = await Post.findAll({ limit: 1000 });
                
                let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${this.baseUrl}</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>`;

                posts.forEach(post => {
                    sitemap += `
    <url>
        <loc>${this.baseUrl}/${post.slug}</loc>
        <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>`;
                });

                sitemap += '\n</urlset>';
                
                res.type('application/xml');
                res.send(sitemap);
            } catch (error) {
                console.error('Error generating sitemap:', error);
                res.status(500).send('Error generating sitemap');
            }
        });

        // API routes
        this.app.use('/api', this.createApiRouter());

        // Main application routes
        this.app.use('/', indexRouter);
        this.app.use('/', postRouter);

        // Catch-all 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).render('404', {
                title: 'Page Not Found',
                description: 'The page you are looking for does not exist.',
                url: req.originalUrl
            });
        });
    }

    /**
     * Create API router for programmatic access
     */
    createApiRouter() {
        const apiRouter = express.Router();

        // API rate limiting (more restrictive)
        const apiLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 50, // 50 requests per window
            message: {
                error: 'API rate limit exceeded'
            }
        });

        apiRouter.use(apiLimiter);

        // API health check
        apiRouter.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // Get posts API
        apiRouter.get('/posts', async (req, res) => {
            try {
                const { Post } = await import('../database/models/post.js');
                const page = parseInt(req.query.page) || 1;
                const limit = Math.min(parseInt(req.query.limit) || 20, 100);
                const offset = (page - 1) * limit;

                const posts = await Post.findAll({
                    limit,
                    offset,
                    orderBy: 'created_at',
                    orderDirection: 'DESC'
                });

                const totalPosts = await Post.getCount();

                res.json({
                    posts: posts.map(post => post.toSafeJSON()),
                    pagination: {
                        page,
                        limit,
                        total: totalPosts,
                        totalPages: Math.ceil(totalPosts / limit)
                    }
                });
            } catch (error) {
                console.error('API posts error:', error);
                res.status(500).json({
                    error: 'Internal server error'
                });
            }
        });

        // Get single post API
        apiRouter.get('/posts/:slug', async (req, res) => {
            try {
                const { Post } = await import('../database/models/post.js');
                const post = await Post.findBySlug(req.params.slug);

                if (!post) {
                    return res.status(404).json({
                        error: 'Post not found'
                    });
                }

                res.json(post.toJSON());
            } catch (error) {
                console.error('API post error:', error);
                res.status(500).json({
                    error: 'Internal server error'
                });
            }
        });

        return apiRouter;
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // Global error handler
        this.app.use((err, req, res, next) => {
            console.error('Express error:', err);

            // Don't expose error details in production
            const isDevelopment = process.env.NODE_ENV === 'development';
            
            const errorResponse = {
                error: isDevelopment ? err.message : 'Internal server error',
                status: err.status || 500
            };

            if (isDevelopment) {
                errorResponse.stack = err.stack;
            }

            res.status(err.status || 500);

            // Send JSON for API routes
            if (req.path.startsWith('/api/')) {
                res.json(errorResponse);
            } else {
                // Render error page for web routes
                res.render('error', {
                    title: 'Error',
                    description: 'An error occurred',
                    error: errorResponse
                });
            }
        });
    }

    /**
     * Start the web server
     */
    async start() {
        try {
            console.log('🚀 Starting web server...');
            
            this.server = this.app.listen(this.port, () => {
                console.log(`✅ Web server running at ${this.baseUrl}`);
                console.log(`📁 Serving static files from public/`);
                console.log(`🎨 Using EJS templates from views/`);
            });

            // Handle server errors
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`❌ Port ${this.port} is already in use`);
                    process.exit(1);
                } else {
                    console.error('❌ Server error:', error);
                    throw error;
                }
            });

            return this.server;
        } catch (error) {
            console.error('❌ Failed to start web server:', error);
            throw error;
        }
    }

    /**
     * Stop the web server gracefully
     */
    async stop() {
        if (this.server) {
            console.log('🛑 Stopping web server...');
            
            return new Promise((resolve, reject) => {
                this.server.close((error) => {
                    if (error) {
                        console.error('❌ Error stopping web server:', error);
                        reject(error);
                    } else {
                        console.log('✅ Web server stopped successfully');
                        resolve();
                    }
                });
            });
        }
    }

    /**
     * Get Express app instance
     */
    getApp() {
        return this.app;
    }

    /**
     * Get server instance
     */
    getServer() {
        return this.server;
    }

    /**
     * Get server configuration
     */
    getConfig() {
        return {
            port: this.port,
            baseUrl: this.baseUrl,
            environment: process.env.NODE_ENV || 'development'
        };
    }
}

/**
 * Create singleton instance
 */
let webServerInstance = null;

export function getWebServer() {
    if (!webServerInstance) {
        webServerInstance = new WebServer();
    }
    return webServerInstance;
}

export default WebServer;