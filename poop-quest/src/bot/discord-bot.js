import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import { handlePoopCommand } from './commands/poop.js';

/**
 * Discord Bot Client with proper intents and event handling
 * Following event-driven architecture from Discord.js guide
 */
export class DiscordBot {
    constructor() {
        // Initialize Discord client with necessary intents
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageReactions
            ]
        });

        // Command collection for future extensibility
        this.commands = new Collection();
        
        // Bot configuration
        this.config = {
            prefix: '!',
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '26214400'), // 25MB default
            allowedChannels: process.env.ALLOWED_CHANNELS?.split(',') || [], // Empty = all channels
            adminUsers: process.env.ADMIN_USERS?.split(',') || []
        };

        // Setup event handlers
        this.setupEventHandlers();
    }

    /**
     * Setup all Discord event handlers
     */
    setupEventHandlers() {
        // Ready event - bot is online and ready
        this.client.once(Events.ClientReady, (readyClient) => {
            console.log(`✅ Discord bot ready! Logged in as ${readyClient.user.tag}`);
            console.log(`📊 Bot is in ${readyClient.guilds.cache.size} guilds`);
            
            // Set bot status
            readyClient.user.setActivity('!poop for HTML sharing', { type: 'LISTENING' });
        });

        // Message create event - handle incoming messages
        this.client.on(Events.MessageCreate, async (message) => {
            await this.handleMessage(message);
        });

        // Error handling
        this.client.on(Events.Error, (error) => {
            console.error('Discord client error:', error);
        });

        // Warning handling
        this.client.on(Events.Warn, (warning) => {
            console.warn('Discord client warning:', warning);
        });

        // Disconnect handling
        this.client.on(Events.ClientDestroy, () => {
            console.log('🔌 Discord client disconnected');
        });

        // Shard disconnect handling
        this.client.on(Events.ShardDisconnect, (event, shardId) => {
            console.log(`🔌 Shard ${shardId} disconnected with code ${event.code}`);
        });

        // Guild join event
        this.client.on(Events.GuildCreate, (guild) => {
            console.log(`📥 Bot joined guild: ${guild.name} (${guild.id})`);
        });

        // Guild leave event
        this.client.on(Events.GuildDelete, (guild) => {
            console.log(`📤 Bot left guild: ${guild.name} (${guild.id})`);
        });

        // Rate limit handling
        this.client.on(Events.RateLimited, (info) => {
            console.warn('Rate limited:', info);
        });
    }

    /**
     * Handle incoming messages
     */
    async handleMessage(message) {
        try {
            // Ignore bot messages
            if (message.author.bot) return;

            // Check if message is in allowed channels (if configured)
            if (this.config.allowedChannels.length > 0 && 
                !this.config.allowedChannels.includes(message.channel.id)) {
                return;
            }

            // Log message for debugging (only in development)
            if (process.env.NODE_ENV === 'development') {
                console.log(`💬 Message from ${message.author.tag}: ${message.content.substring(0, 100)}...`);
            }

            // Handle !poop command
            if (message.content.startsWith('!poop')) {
                await handlePoopCommand(message);
                return;
            }

            // Handle !help command
            if (message.content.startsWith('!help')) {
                await this.handleHelpCommand(message);
                return;
            }

            // Handle !stats command (admin only)
            if (message.content.startsWith('!stats')) {
                await this.handleStatsCommand(message);
                return;
            }

        } catch (error) {
            console.error('Error handling message:', error);
            
            // Send error message to user
            try {
                await message.reply('❌ An error occurred while processing your message. Please try again.');
            } catch (replyError) {
                console.error('Error sending error message:', replyError);
            }
        }
    }

    /**
     * Handle help command
     */
    async handleHelpCommand(message) {
        const helpEmbed = {
            color: 0x0099ff,
            title: '🚽 Poop Quest Help',
            description: 'Transform your HTML content into shareable web posts!',
            fields: [
                {
                    name: '📝 !poop',
                    value: 'Upload an HTML file or paste HTML in a code block to create a post',
                    inline: false
                },
                {
                    name: '📤 File Upload',
                    value: 'Attach an HTML file with your `!poop` command',
                    inline: true
                },
                {
                    name: '💻 Code Block',
                    value: 'Use ```html\\n<your-html>\\n``` format',
                    inline: true
                },
                {
                    name: '📊 !stats',
                    value: 'View bot statistics (admin only)',
                    inline: true
                }
            ],
            footer: {
                text: 'Powered by Grok AI • Visit your posts at poop.quest'
            },
            timestamp: new Date().toISOString()
        };

        try {
            await message.reply({ embeds: [helpEmbed] });
        } catch (error) {
            console.error('Error sending help message:', error);
            await message.reply('📋 **Poop Quest Commands:**\\n• `!poop` - Upload HTML file or paste HTML code\\n• `!help` - Show this help message\\n• `!stats` - Bot statistics (admin only)');
        }
    }

    /**
     * Handle stats command (admin only)
     */
    async handleStatsCommand(message) {
        // Check if user is admin
        if (!this.config.adminUsers.includes(message.author.id)) {
            await message.reply('❌ This command is only available to administrators.');
            return;
        }

        try {
            // Get bot statistics
            const stats = {
                guilds: this.client.guilds.cache.size,
                users: this.client.users.cache.size,
                channels: this.client.channels.cache.size,
                uptime: this.formatUptime(process.uptime()),
                memoryUsage: this.formatMemoryUsage(process.memoryUsage()),
                nodeVersion: process.version,
                discordJsVersion: '^14.14.1'
            };

            const statsEmbed = {
                color: 0x00ff00,
                title: '📊 Bot Statistics',
                fields: [
                    {
                        name: '🏠 Guilds',
                        value: stats.guilds.toString(),
                        inline: true
                    },
                    {
                        name: '👥 Users',
                        value: stats.users.toString(),
                        inline: true
                    },
                    {
                        name: '📺 Channels',
                        value: stats.channels.toString(),
                        inline: true
                    },
                    {
                        name: '⏱️ Uptime',
                        value: stats.uptime,
                        inline: true
                    },
                    {
                        name: '💾 Memory Usage',
                        value: stats.memoryUsage,
                        inline: true
                    },
                    {
                        name: '🔧 Node.js Version',
                        value: stats.nodeVersion,
                        inline: true
                    }
                ],
                footer: {
                    text: 'Bot Status • Poop Quest'
                },
                timestamp: new Date().toISOString()
            };

            await message.reply({ embeds: [statsEmbed] });
        } catch (error) {
            console.error('Error getting bot stats:', error);
            await message.reply('❌ Failed to retrieve bot statistics.');
        }
    }

    /**
     * Format uptime in human-readable format
     */
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        let uptime = '';
        if (days > 0) uptime += `${days}d `;
        if (hours > 0) uptime += `${hours}h `;
        if (minutes > 0) uptime += `${minutes}m `;
        uptime += `${secs}s`;

        return uptime;
    }

    /**
     * Format memory usage in human-readable format
     */
    formatMemoryUsage(memoryUsage) {
        const rss = Math.round(memoryUsage.rss / 1024 / 1024);
        const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
        const heapTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);
        
        return `${rss}MB RSS, ${heapUsed}/${heapTotal}MB Heap`;
    }

    /**
     * Start the Discord bot
     */
    async start() {
        const token = process.env.DISCORD_BOT_TOKEN;
        
        if (!token) {
            throw new Error('DISCORD_BOT_TOKEN environment variable is required');
        }

        try {
            console.log('🚀 Starting Discord bot...');
            await this.client.login(token);
            console.log('✅ Discord bot started successfully!');
        } catch (error) {
            console.error('❌ Failed to start Discord bot:', error);
            throw error;
        }
    }

    /**
     * Stop the Discord bot gracefully
     */
    async stop() {
        try {
            console.log('🛑 Stopping Discord bot...');
            await this.client.destroy();
            console.log('✅ Discord bot stopped successfully!');
        } catch (error) {
            console.error('❌ Error stopping Discord bot:', error);
            throw error;
        }
    }

    /**
     * Get bot client instance
     */
    getClient() {
        return this.client;
    }

    /**
     * Get bot configuration
     */
    getConfig() {
        return this.config;
    }

    /**
     * Check if bot is ready
     */
    isReady() {
        return this.client.isReady();
    }

    /**
     * Get bot user information
     */
    getBotUser() {
        return this.client.user;
    }

    /**
     * Get guild count
     */
    getGuildCount() {
        return this.client.guilds.cache.size;
    }

    /**
     * Register shutdown handlers
     */
    setupShutdownHandlers() {
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\\n🔄 Received SIGINT, shutting down Discord bot gracefully...');
            await this.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\\n🔄 Received SIGTERM, shutting down Discord bot gracefully...');
            await this.stop();
            process.exit(0);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught exception:', error);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled promise rejection:', reason);
            console.error('Promise:', promise);
            process.exit(1);
        });
    }
}

/**
 * Create singleton instance
 */
let discordBotInstance = null;

export function getDiscordBot() {
    if (!discordBotInstance) {
        discordBotInstance = new DiscordBot();
    }
    return discordBotInstance;
}

export default DiscordBot;