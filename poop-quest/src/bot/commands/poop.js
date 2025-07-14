import { getContentAnalyzer } from '../../ai/content-analyzer.js';
import { Post } from '../../database/models/post.js';
import { extractContent } from '../utils/file-handler.js';
import { cleanUserSlug as sanitizeSlug } from '../../utils/slug-sanitizer.js';

/**
 * Handle !poop command
 * Command handler pattern for processing HTML content submissions
 */
export async function handlePoopCommand(message) {
    // Command validation
    if (!message.content.startsWith('!poop')) {
        return;
    }

    // Show typing indicator
    await message.channel.sendTyping();

    try {
        // Extract HTML content from message
        const contentResult = await extractContent(message);
        
        if (!contentResult.success) {
            await message.reply(`❌ ${contentResult.error}`);
            return;
        }

        const { content: htmlContent, type: contentType, filename } = contentResult.data;

        // Validate content
        if (!htmlContent || htmlContent.trim() === '') {
            await message.reply('❌ No HTML content found. Please upload an HTML file or use a code block with HTML content.');
            return;
        }

        // Log the submission
        console.log(`📝 Processing !poop command from ${message.author.tag} (${message.author.id})`);
        console.log(`📄 Content type: ${contentType}, Length: ${htmlContent.length} characters`);

        // Create processing message
        const processingMessage = await message.reply('🔄 Processing your HTML content...');

        // Analyze content with AI
        const contentAnalyzer = getContentAnalyzer();
        const analysis = await contentAnalyzer.analyzeContent(htmlContent, {
            discordUser: {
                id: message.author.id,
                username: message.author.username
            },
            contentType: detectContentType(htmlContent),
            fallbackTitle: filename ? `${filename.replace(/\\.html?$/i, '')}` : 'Discord Post'
        });

        // Update processing message
        await processingMessage.edit('🧠 AI analysis complete, sanitizing slug...');

        // Sanitize slug to ensure URL safety
        const sanitizedSlug = await sanitizeSlug(analysis.slug);

        // Update processing message
        await processingMessage.edit('💾 Saving to database...');

        // Create post in database
        const post = await Post.create({
            slug: sanitizedSlug,
            title: analysis.title,
            description: analysis.description,
            html_content: htmlContent,
            discord_user_id: message.author.id,
            discord_username: message.author.username
        });

        // Create success embed
        const baseUrl = process.env.BASE_URL || 'https://poop.quest';
        const postUrl = `${baseUrl}/${post.slug}`;
        
        const successEmbed = {
            color: 0x00ff00,
            title: '🎉 Post Created Successfully!',
            description: `Your HTML content has been processed and published.`,
            fields: [
                {
                    name: '📝 Title',
                    value: post.title,
                    inline: false
                },
                {
                    name: '📊 Description',
                    value: post.description,
                    inline: false
                },
                {
                    name: '🔗 URL',
                    value: `[${postUrl}](${postUrl})`,
                    inline: false
                },
                {
                    name: '📈 Stats',
                    value: `${analysis.wordCount} words • ${analysis.readingTime} min read`,
                    inline: true
                },
                {
                    name: '🏷️ Content Type',
                    value: analysis.contentType,
                    inline: true
                },
                {
                    name: '🆔 Slug',
                    value: `\`${post.slug}\``,
                    inline: true
                }
            ],
            footer: {
                text: `Created by ${message.author.username} • ID: ${post.id}`
            },
            timestamp: new Date().toISOString()
        };

        // Add features if present
        if (analysis.features) {
            const features = [];
            if (analysis.features.hasImages) features.push('🖼️ Images');
            if (analysis.features.hasLinks) features.push('🔗 Links');
            if (analysis.features.hasCode) features.push('💻 Code');
            if (analysis.features.hasLists) features.push('📋 Lists');
            
            if (features.length > 0) {
                successEmbed.fields.push({
                    name: '✨ Features',
                    value: features.join(' • '),
                    inline: false
                });
            }
        }

        // Delete processing message and send success message
        await processingMessage.delete();
        await message.reply({ embeds: [successEmbed] });

        // Log success
        console.log(`✅ Post created successfully: ${post.slug} by ${message.author.username}`);

    } catch (error) {
        console.error('!poop command failed:', error);

        // Determine error type for user-friendly messages
        let errorMessage = '❌ Failed to process your content. Please try again.';
        
        if (error.message.includes('Validation failed')) {
            errorMessage = '❌ Invalid content format. Please check your HTML and try again.';
        } else if (error.message.includes('slug') && error.message.includes('exists')) {
            errorMessage = '❌ A post with this title already exists. Please modify your content or title.';
        } else if (error.message.includes('API')) {
            errorMessage = '❌ AI analysis service is temporarily unavailable. Please try again later.';
        } else if (error.message.includes('Database')) {
            errorMessage = '❌ Database error occurred. Please contact an administrator.';
        }

        // Try to reply with error message
        try {
            await message.reply(errorMessage);
        } catch (replyError) {
            console.error('Failed to send error message:', replyError);
        }
    }
}

/**
 * Detect content type from HTML content
 */
function detectContentType(htmlContent) {
    const lowerContent = htmlContent.toLowerCase();
    
    // Look for common patterns
    if (lowerContent.includes('<code>') || lowerContent.includes('<pre>') || 
        lowerContent.includes('function') || lowerContent.includes('algorithm')) {
        return 'technical';
    }
    
    if (lowerContent.includes('tutorial') || lowerContent.includes('how to') || 
        lowerContent.includes('step') || lowerContent.includes('guide')) {
        return 'tutorial';
    }
    
    if (lowerContent.includes('breaking') || lowerContent.includes('news') || 
        lowerContent.includes('announced') || lowerContent.includes('report')) {
        return 'news';
    }
    
    if (lowerContent.includes('story') || lowerContent.includes('poem') || 
        lowerContent.includes('creative') || lowerContent.includes('art')) {
        return 'creative';
    }
    
    return 'general';
}

/**
 * Validate HTML content
 */
export function validateHtmlContent(htmlContent) {
    const errors = [];
    
    // Check minimum length
    if (htmlContent.length < 10) {
        errors.push('Content is too short (minimum 10 characters)');
    }
    
    // Check maximum length
    const maxLength = parseInt(process.env.MAX_CONTENT_LENGTH || '1000000'); // 1MB default
    if (htmlContent.length > maxLength) {
        errors.push(`Content is too long (maximum ${maxLength} characters)`);
    }
    
    // Check for basic HTML structure
    if (!htmlContent.includes('<') || !htmlContent.includes('>')) {
        errors.push('Content does not appear to be HTML');
    }
    
    // Check for potentially dangerous content
    const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /onload=/gi,
        /onerror=/gi,
        /onclick=/gi
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(htmlContent)) {
            errors.push('Content contains potentially dangerous HTML elements');
            break;
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Handle !poop command with error recovery
 */
export async function handlePoopCommandWithRetry(message, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            await handlePoopCommand(message);
            return; // Success, exit retry loop
        } catch (error) {
            console.error(`!poop command attempt ${attempt + 1} failed:`, error);
            
            if (attempt === maxRetries) {
                // Final attempt failed, send error message
                try {
                    await message.reply('❌ Failed to process your content after multiple attempts. Please try again later or contact support.');
                } catch (replyError) {
                    console.error('Failed to send final error message:', replyError);
                }
            } else {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }
}

/**
 * Get command usage statistics
 */
export function getCommandStats() {
    // This would typically be stored in a database or cache
    // For now, return placeholder data
    return {
        totalCommands: 0,
        successfulCommands: 0,
        failedCommands: 0,
        averageProcessingTime: 0,
        mostCommonContentType: 'general'
    };
}

export default { handlePoopCommand, handlePoopCommandWithRetry, validateHtmlContent, getCommandStats };