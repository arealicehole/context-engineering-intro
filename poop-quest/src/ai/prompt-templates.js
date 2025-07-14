/**
 * Prompt templates for consistent AI responses
 * Template literal functions for different content types
 */

/**
 * Base prompt template with common instructions
 */
const basePrompt = `You are a content analyzer for poop.quest, a platform for sharing HTML content via Discord.

Your task is to analyze the provided HTML content and return a JSON object with exactly these fields:
- slug: A URL-safe identifier (lowercase, hyphens only, no spaces, max 50 characters)
- title: A compelling, SEO-friendly title (max 60 characters)
- description: A concise meta description for social sharing (max 160 characters)

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON, no additional text or explanation
2. All fields are required and must be strings
3. The slug must match pattern: ^[a-z0-9-]+$
4. Keep titles engaging but informative
5. Make descriptions compelling for social media
6. If content is unclear, make reasonable assumptions
7. Avoid clickbait or misleading information`;

/**
 * General content prompt template
 */
const generalTemplate = `${basePrompt}

CONTENT TYPE: General/Mixed Content

Additional instructions:
- Focus on the main topic or theme
- Create a balanced title that works for all audiences
- Write a description that summarizes the key points
- Use neutral, informative tone`;

/**
 * Technical content prompt template
 */
const technicalTemplate = `${basePrompt}

CONTENT TYPE: Technical/Programming Content

Additional instructions:
- Focus on the technical topic, tools, or concepts discussed
- Use technical terminology appropriately in the title
- Highlight the technical value or learning outcome in the description
- Consider the target audience (developers, engineers, etc.)
- Include relevant technical keywords for discoverability`;

/**
 * Creative content prompt template
 */
const creativeTemplate = `${basePrompt}

CONTENT TYPE: Creative/Artistic Content

Additional instructions:
- Capture the creative essence and mood
- Use evocative language that reflects the content's tone
- Highlight the creative medium or style in the description
- Appeal to creative communities and art enthusiasts
- Consider emotional impact and artistic merit`;

/**
 * Tutorial content prompt template
 */
const tutorialTemplate = `${basePrompt}

CONTENT TYPE: Tutorial/How-to Content

Additional instructions:
- Start title with action words like "How to", "Guide to", "Tutorial:", etc.
- Clearly indicate what skill or knowledge will be gained
- Mention the difficulty level or target audience if apparent
- Focus on the practical outcome or result
- Use instructional language that appeals to learners`;

/**
 * News content prompt template
 */
const newsTemplate = `${basePrompt}

CONTENT TYPE: News/Current Events

Additional instructions:
- Focus on the main news event or announcement
- Use present tense and active voice
- Highlight the significance or impact in the description
- Include relevant context or background if necessary
- Maintain objectivity and factual tone`;

/**
 * Discussion/Opinion content prompt template
 */
const discussionTemplate = `${basePrompt}

CONTENT TYPE: Discussion/Opinion Content

Additional instructions:
- Identify the main topic or debate
- Capture the author's perspective or stance
- Use engaging language that invites discussion
- Highlight controversial or thought-provoking aspects
- Appeal to community discussion and engagement`;

/**
 * Error/Fallback prompt template
 */
const fallbackTemplate = `${basePrompt}

CONTENT TYPE: Unclear/Mixed Content

Additional instructions:
- Extract the most prominent or meaningful elements
- Create a generic but accurate title
- Write a safe, descriptive summary
- Avoid making assumptions about unclear content
- Use neutral, informative language`;

/**
 * Prompt template for short content
 */
const shortContentTemplate = `${basePrompt}

CONTENT TYPE: Short/Brief Content

Additional instructions:
- Work with limited information effectively
- Create a concise but meaningful title
- Expand appropriately in the description without speculation
- Focus on the core message or purpose
- Consider it might be a snippet or excerpt`;

/**
 * Prompt template for rich media content
 */
const richMediaTemplate = `${basePrompt}

CONTENT TYPE: Rich Media Content (Images, Videos, Interactive)

Additional instructions:
- Focus on the media content and its purpose
- Describe the visual or interactive elements
- Highlight the media format in the title if relevant
- Consider the engagement value and shareability
- Appeal to visual content consumers`;

/**
 * Generate content-specific prompt
 */
export function generatePrompt(contentType, additionalContext = '') {
    const templates = {
        general: generalTemplate,
        technical: technicalTemplate,
        creative: creativeTemplate,
        tutorial: tutorialTemplate,
        news: newsTemplate,
        discussion: discussionTemplate,
        short: shortContentTemplate,
        media: richMediaTemplate,
        fallback: fallbackTemplate
    };

    const template = templates[contentType] || templates.general;
    
    if (additionalContext) {
        return `${template}\n\nADDITIONAL CONTEXT:\n${additionalContext}`;
    }
    
    return template;
}

/**
 * Generate prompts for different scenarios
 */
export function generateContextualPrompt(options = {}) {
    const {
        contentType = 'general',
        userContext = null,
        retryAttempt = 0,
        previousAnalysis = null,
        customInstructions = ''
    } = options;

    let prompt = generatePrompt(contentType);

    // Add user context
    if (userContext) {
        prompt += `\n\nUSER CONTEXT:\n- Discord User: ${userContext.username}\n- Previous posts: ${userContext.postCount || 0}`;
    }

    // Add retry instructions
    if (retryAttempt > 0) {
        prompt += `\n\nRETRY INSTRUCTIONS:\n- This is attempt ${retryAttempt + 1}\n- Previous analysis may have failed validation\n- Ensure strict adherence to JSON format and field requirements`;
        
        if (previousAnalysis) {
            prompt += `\n- Previous attempt generated: ${JSON.stringify(previousAnalysis)}`;
        }
    }

    // Add custom instructions
    if (customInstructions) {
        prompt += `\n\nCUSTOM INSTRUCTIONS:\n${customInstructions}`;
    }

    return prompt;
}

/**
 * Generate validation prompt for checking analysis results
 */
export function generateValidationPrompt(analysis, originalContent) {
    return `Validate this content analysis for accuracy and quality:

ORIGINAL CONTENT (first 500 characters):
${originalContent.substring(0, 500)}...

ANALYSIS RESULT:
${JSON.stringify(analysis, null, 2)}

Check for:
1. Does the slug accurately represent the content?
2. Is the title compelling and accurate?
3. Does the description summarize the content well?
4. Are all fields properly formatted?
5. Is the analysis appropriate for the content type?

Return a JSON object with:
- valid: boolean (true if analysis is good)
- issues: array of strings (any problems found)
- suggestions: array of strings (improvement recommendations)`;
}

/**
 * Generate alternative analysis prompt
 */
export function generateAlternativePrompt(originalAnalysis, variation = 'different_tone') {
    const variations = {
        different_tone: 'Create an alternative with a different tone (more formal/casual/playful)',
        shorter: 'Create an alternative with shorter, more concise text',
        longer: 'Create an alternative with more detailed descriptions',
        technical: 'Create an alternative with more technical language',
        casual: 'Create an alternative with more casual, conversational language'
    };

    const instruction = variations[variation] || variations.different_tone;

    return `${basePrompt}

ALTERNATIVE ANALYSIS REQUEST:
Original analysis: ${JSON.stringify(originalAnalysis)}

Create an alternative analysis with this variation:
${instruction}

Maintain the same core accuracy and relevance while applying the requested variation.`;
}

/**
 * Generate batch analysis prompt
 */
export function generateBatchPrompt(contentList) {
    return `${basePrompt}

BATCH ANALYSIS REQUEST:
You will receive ${contentList.length} pieces of content to analyze.

For each piece of content, return a JSON object in this format:
{
  "index": number,
  "slug": "url-safe-slug",
  "title": "Compelling title",
  "description": "Meta description"
}

Return an array of these objects, one for each content piece.

CONTENT TO ANALYZE:
${contentList.map((content, index) => `Content ${index + 1}:\n${content}\n---`).join('\n')}`;
}

/**
 * Export all prompt templates
 */
export function getPromptTemplates() {
    return {
        general: generalTemplate,
        technical: technicalTemplate,
        creative: creativeTemplate,
        tutorial: tutorialTemplate,
        news: newsTemplate,
        discussion: discussionTemplate,
        short: shortContentTemplate,
        media: richMediaTemplate,
        fallback: fallbackTemplate
    };
}

/**
 * Get prompt template by content type
 */
export function getPromptTemplate(contentType) {
    const templates = getPromptTemplates();
    return templates[contentType] || templates.general;
}

/**
 * Example usage for different content types
 */
export const examples = {
    technical: {
        input: '<h1>React Hooks Tutorial</h1><p>Learn how to use useState and useEffect...</p>',
        expectedOutput: {
            slug: 'react-hooks-tutorial',
            title: 'React Hooks Tutorial: useState and useEffect Guide',
            description: 'Learn how to use React Hooks including useState and useEffect with practical examples and best practices.'
        }
    },
    creative: {
        input: '<h1>Sunset Dreams</h1><p>A poem about the beauty of evening light...</p>',
        expectedOutput: {
            slug: 'sunset-dreams-poem',
            title: 'Sunset Dreams: A Poem About Evening Light',
            description: 'A beautiful poem capturing the ethereal beauty of sunset and the peaceful transition from day to night.'
        }
    },
    tutorial: {
        input: '<h1>How to Bake Bread</h1><p>Step-by-step guide to making homemade bread...</p>',
        expectedOutput: {
            slug: 'how-to-bake-bread-guide',
            title: 'How to Bake Bread: Complete Beginner\'s Guide',
            description: 'Step-by-step tutorial for making delicious homemade bread from scratch with tips and techniques.'
        }
    }
};

export default {
    generatePrompt,
    generateContextualPrompt,
    generateValidationPrompt,
    generateAlternativePrompt,
    generateBatchPrompt,
    getPromptTemplates,
    getPromptTemplate,
    examples
};