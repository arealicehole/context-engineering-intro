import axios from 'axios';

/**
 * Custom error class for Grok API errors
 */
export class GrokAPIError extends Error {
    constructor(message, status = null, response = null) {
        super(message);
        this.name = 'GrokAPIError';
        this.status = status;
        this.response = response;
    }
}

/**
 * Grok API client with OpenAI compatibility
 * Following the pattern from use-cases/mcp-server with HTTP client
 */
export class GrokClient {
    constructor(apiKey = process.env.GROK_API_KEY, model = process.env.GROK_MODEL || 'grok-4') {
        if (!apiKey) {
            throw new Error('Grok API key is required');
        }

        this.apiKey = apiKey;
        this.baseURL = 'https://api.x.ai/v1';
        this.model = model;
        this.timeout = 30000; // 30 seconds timeout
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second base delay

        // Create axios instance with default config
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'poop-quest/1.0.0'
            }
        });

        // Add request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`Grok API Request: ${config.method?.toUpperCase()} ${config.url}`);
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response) {
                    // Server responded with error status
                    const { status, data } = error.response;
                    throw new GrokAPIError(
                        `API request failed: ${status} - ${data?.error?.message || 'Unknown error'}`,
                        status,
                        data
                    );
                } else if (error.request) {
                    // Network error
                    throw new GrokAPIError('Network error: No response received from API');
                } else {
                    // Other error
                    throw new GrokAPIError(`Request setup error: ${error.message}`);
                }
            }
        );
    }

    /**
     * Sleep function for retry delays
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Make API request with retry logic
     */
    async makeRequest(endpoint, data, retries = 0) {
        try {
            const response = await this.client.post(endpoint, data);
            return response.data;
        } catch (error) {
            if (retries < this.maxRetries && this.shouldRetry(error)) {
                const delay = this.retryDelay * Math.pow(2, retries); // Exponential backoff
                console.log(`Retrying request in ${delay}ms (attempt ${retries + 1}/${this.maxRetries})`);
                await this.sleep(delay);
                return this.makeRequest(endpoint, data, retries + 1);
            }
            throw error;
        }
    }

    /**
     * Determine if request should be retried
     */
    shouldRetry(error) {
        if (error instanceof GrokAPIError) {
            // Retry on specific HTTP status codes
            return error.status === 429 || // Rate limit
                   error.status === 502 || // Bad Gateway
                   error.status === 503 || // Service Unavailable
                   error.status === 504;   // Gateway Timeout
        }
        return false;
    }

    /**
     * Analyze HTML content and generate metadata
     * Returns structured JSON with slug, title, and description
     */
    async analyzeContent(htmlContent, options = {}) {
        if (!htmlContent || htmlContent.trim() === '') {
            throw new Error('HTML content is required');
        }

        const {
            temperature = 0.7,
            maxTokens = 1000,
            customInstructions = ''
        } = options;

        const systemPrompt = `You are a content analyzer that extracts metadata from HTML content.
        
        Analyze the provided HTML content and return a JSON object with exactly these fields:
        - slug: A URL-safe identifier (lowercase, hyphens only, no spaces)
        - title: A compelling, SEO-friendly title (under 60 characters)
        - description: A concise meta description for social sharing (under 160 characters)
        
        Rules:
        1. The slug should be derived from the main topic/heading
        2. The title should be engaging and descriptive
        3. The description should summarize the content clearly
        4. All fields are required and must be strings
        5. Return only valid JSON, no additional text
        
        ${customInstructions}`;

        const payload = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: htmlContent
                }
            ],
            response_format: { type: 'json_object' }, // CRITICAL: Structured output
            temperature: temperature,
            max_tokens: maxTokens
        };

        try {
            const response = await this.makeRequest('/chat/completions', payload);
            
            if (!response.choices || response.choices.length === 0) {
                throw new GrokAPIError('No response choices received from API');
            }

            const content = response.choices[0].message.content;
            
            if (!content) {
                throw new GrokAPIError('Empty response content from API');
            }

            // Parse the JSON response
            let metadata;
            try {
                metadata = JSON.parse(content);
            } catch (parseError) {
                throw new GrokAPIError(`Failed to parse JSON response: ${parseError.message}`);
            }

            // Validate required fields
            const requiredFields = ['slug', 'title', 'description'];
            const missingFields = requiredFields.filter(field => !metadata[field]);
            
            if (missingFields.length > 0) {
                throw new GrokAPIError(`Missing required fields in response: ${missingFields.join(', ')}`);
            }

            // Validate field types
            if (typeof metadata.slug !== 'string' || 
                typeof metadata.title !== 'string' || 
                typeof metadata.description !== 'string') {
                throw new GrokAPIError('All metadata fields must be strings');
            }

            // Basic slug validation
            if (!/^[a-z0-9-]+$/.test(metadata.slug)) {
                // If slug is invalid, generate a fallback
                console.warn('Invalid slug generated, creating fallback');
                metadata.slug = this.generateFallbackSlug(metadata.title);
            }

            return {
                slug: metadata.slug,
                title: metadata.title,
                description: metadata.description,
                usage: response.usage || null,
                model: this.model,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            if (error instanceof GrokAPIError) {
                throw error;
            }
            throw new GrokAPIError(`Content analysis failed: ${error.message}`);
        }
    }

    /**
     * Generate fallback slug from title
     */
    generateFallbackSlug(title) {
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
     * Test API connection
     * Verifies API key and model availability
     */
    async testConnection() {
        try {
            const response = await this.makeRequest('/chat/completions', {
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: 'Test connection - respond with "OK"'
                    }
                ],
                max_tokens: 10
            });

            return {
                success: true,
                model: this.model,
                response: response.choices[0].message.content,
                usage: response.usage
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.status
            };
        }
    }

    /**
     * Get current API usage/limits (if supported)
     */
    async getUsage() {
        try {
            // Note: This endpoint might not be available in all API versions
            const response = await this.client.get('/usage');
            return response.data;
        } catch (error) {
            console.warn('Usage endpoint not available:', error.message);
            return null;
        }
    }

    /**
     * Generate alternative content suggestions
     * Provides multiple metadata variations
     */
    async generateAlternatives(htmlContent, count = 3) {
        const alternatives = [];
        
        for (let i = 0; i < count; i++) {
            try {
                const result = await this.analyzeContent(htmlContent, {
                    temperature: 0.8 + (i * 0.1), // Vary temperature for diversity
                    customInstructions: `Generate alternative ${i + 1} with different tone/style.`
                });
                alternatives.push(result);
            } catch (error) {
                console.warn(`Failed to generate alternative ${i + 1}:`, error.message);
            }
        }

        return alternatives;
    }
}

/**
 * Create a singleton instance for the application
 */
let grokClientInstance = null;

export function getGrokClient() {
    if (!grokClientInstance) {
        grokClientInstance = new GrokClient();
    }
    return grokClientInstance;
}

export default GrokClient;