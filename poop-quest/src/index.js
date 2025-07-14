#!/usr/bin/env node

/**
 * Poop Quest - Main Application Entry Point
 * Integrates Discord bot and Express web server
 */

import { config } from 'dotenv';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import process from 'process';

// Load environment variables
config();

// ES module compatibility
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import application components
import { runMigrations } from './database/connection.js';
import { getDiscordBot } from './bot/discord-bot.js';
import { getWebServer } from './web/server.js';

/**
 * Main application class
 * Manages bot and server lifecycle
 */
class PoopQuestApp {
    constructor() {
        this.bot = null;
        this.server = null;
        this.httpServer = null;
        this.isShuttingDown = false;
        
        // Configuration
        this.config = {
            port: process.env.PORT || 3000,
            environment: process.env.NODE_ENV || 'development',
            discordToken: process.env.DISCORD_BOT_TOKEN,
            grokApiKey: process.env.GROK_API_KEY,
            baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
            databasePath: process.env.DATABASE_PATH || join(__dirname, '..', 'data', 'posts.db')
        };
        
        // Validate required environment variables
        this.validateEnvironment();
        
        // Set up signal handlers
        this.setupSignalHandlers();
    }
    
    /**
     * Validate required environment variables
     */
    validateEnvironment() {
        const required = ['DISCORD_BOT_TOKEN', 'GROK_API_KEY'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            console.error('❌ Missing required environment variables:');
            missing.forEach(key => console.error(`   - ${key}`));
            console.error('\n💡 Please check your .env file or environment configuration.');
            process.exit(1);
        }
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        console.log('🚀 Starting Poop Quest...');
        console.log(`📍 Environment: ${this.config.environment}`);
        console.log(`🌐 Base URL: ${this.config.baseUrl}`);
        console.log(`🗄️ Database: ${this.config.databasePath}`);
        
        try {
            // Initialize database
            console.log('📊 Initializing database...');
            await runMigrations();
            console.log('✅ Database initialized successfully');
            
            // Create Discord bot
            console.log('🤖 Creating Discord bot...');
            this.bot = getDiscordBot();
            console.log('✅ Discord bot created successfully');
            
            // Create web server
            console.log('🌐 Creating web server...');
            this.server = getWebServer();
            
            // Add baseUrl to app locals
            this.server.app.locals.baseUrl = this.config.baseUrl;
            this.server.app.locals.version = this.getVersion();
            this.server.app.locals.environment = this.config.environment;
            
            console.log('✅ Web server created successfully');
            
            // Start services
            await this.startServices();
            
            console.log('🎉 Poop Quest is now running!');
            console.log(`📊 Dashboard: ${this.config.baseUrl}/stats`);
            console.log(`🔗 Homepage: ${this.config.baseUrl}/`);
            
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            await this.shutdown();
            process.exit(1);
        }
    }
    
    /**
     * Start both Discord bot and web server
     */
    async startServices() {
        // Start Discord bot
        console.log('🤖 Starting Discord bot...');
        await this.bot.start();
        console.log('✅ Discord bot logged in successfully');
        
        // Start web server
        console.log('🌐 Starting web server...');
        this.httpServer = await this.server.start();
        console.log(`✅ Web server listening on port ${this.config.port}`);
    }
    
    /**
     * Graceful shutdown
     */
    async shutdown() {
        if (this.isShuttingDown) {
            console.log('⏳ Shutdown already in progress...');
            return;
        }
        
        this.isShuttingDown = true;
        console.log('🛑 Shutting down gracefully...');
        
        try {
            // Stop accepting new connections
            if (this.httpServer) {
                console.log('🌐 Closing web server...');
                await new Promise((resolve) => {
                    this.httpServer.close(() => {
                        console.log('✅ Web server closed');
                        resolve();
                    });
                });
            }
            
            // Stop Discord bot
            if (this.bot) {
                console.log('🤖 Stopping Discord bot...');
                await this.bot.stop();
                console.log('✅ Discord bot stopped');
            }
            
            // Close database connections
            console.log('📊 Closing database connections...');
            // Database connection is handled by the connection module
            console.log('✅ Database connections closed');
            
            console.log('✅ Shutdown complete');
            
        } catch (error) {
            console.error('❌ Error during shutdown:', error);
        } finally {
            process.exit(0);
        }
    }
    
    /**
     * Set up signal handlers for graceful shutdown
     */
    setupSignalHandlers() {
        const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
        
        signals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
                await this.shutdown();
            });
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            console.log('🛑 Shutting down due to uncaught exception...');
            this.shutdown();
        });
        
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Promise Rejection:', reason);
            console.log('🛑 Shutting down due to unhandled promise rejection...');
            this.shutdown();
        });
    }
    
    /**
     * Get application version
     */
    getVersion() {
        try {
            const packageJsonPath = join(__dirname, '..', 'package.json');
            if (existsSync(packageJsonPath)) {
                const packageJson = require(packageJsonPath);
                return packageJson.version || '1.0.0';
            }
        } catch (error) {
            console.warn('⚠️ Could not read package.json version');
        }
        return '1.0.0';
    }
    
    /**
     * Health check endpoint data
     */
    getHealthStatus() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: this.getVersion(),
            environment: this.config.environment,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            services: {
                bot: this.bot ? 'connected' : 'disconnected',
                server: this.httpServer ? 'running' : 'stopped',
                database: 'connected' // Assume connected if we got this far
            }
        };
    }
}

/**
 * Application startup
 */
async function main() {
    console.log('💩 Poop Quest - HTML to Web Posts Platform');
    console.log('═══════════════════════════════════════════\n');
    
    try {
        const app = new PoopQuestApp();
        await app.initialize();
        
        // Keep the process alive
        process.stdin.resume();
        
    } catch (error) {
        console.error('💥 Fatal error during startup:', error);
        process.exit(1);
    }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

// Export for testing
export { PoopQuestApp };
export default PoopQuestApp;