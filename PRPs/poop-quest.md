name: "Poop Quest: All-in-One Discord Bot + Web Platform"
description: |

## Purpose
Build a complete Node.js application that combines a Discord bot with a public web server, featuring AI-powered content analysis, branded templating, and persistent storage for user-generated HTML content.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Create a production-ready Node.js application that runs both a Discord bot and Express.js web server in a single process. The bot accepts HTML content via Discord commands, uses Grok AI to generate metadata, and serves the content through a branded web interface with dynamic SEO optimization.

## Why
- **Business value**: Streamlines content sharing and curation through Discord communities
- **Integration**: Combines social interaction (Discord) with web presence (branded site)
- **Problems this solves**: Eliminates need for separate content management systems, provides instant web publishing from Discord

## What
A monolithic Node.js application featuring:
- Discord bot with `!poop` command for HTML content submission
- Grok AI integration for automatic title, description, and slug generation
- Express.js web server with EJS templating
- SQLite database for content persistence
- Digital Art Deco/Neo-Roman branded theme
- Dynamic SEO metadata for social sharing

### Success Criteria
- [ ] Discord bot successfully processes HTML content (file uploads and code blocks)
- [ ] Grok AI generates consistent JSON metadata (slug, title, description)
- [ ] Web server renders content with branded template
- [ ] SQLite database stores and retrieves posts correctly
- [ ] Dynamic routes serve content with proper SEO metadata
- [ ] Application runs as single process supporting both bot and web server

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://nodejs.org/en/docs/
  why: Core Node.js patterns for HTTP servers and async operations
  
- url: https://expressjs.com/en/guide/routing.html
  why: Express.js routing, middleware, and template integration patterns
  
- url: https://discordjs.guide/
  why: Discord bot setup, command handling, and file upload processing
  
- url: https://docs.x.ai/docs/overview
  why: Grok API authentication, structured outputs, and OpenAI compatibility
  
- url: https://ejs.co/
  why: EJS templating syntax, security considerations, and Express integration
  
- url: https://www.npmjs.com/package/sqlite3
  why: SQLite database operations, prepared statements, and connection management
  
- url: https://docs.docker.com/language/nodejs/build-images/
  why: Docker containerization for Node.js applications
  
- url: https://docs.akash.network/
  why: Deployment platform for containerized applications
```

### Current Codebase tree
```bash
context-engineering-intro/
├── PRPs/
│   ├── templates/
│   │   └── prp_base.md
│   └── EXAMPLE_multi_agent_prp.md
├── examples/
├── use-cases/
│   └── mcp-server/          # TypeScript/Node.js patterns to reference
│       ├── package.json     # Dependency management patterns
│       ├── src/
│       │   ├── index.ts     # Application entry point patterns
│       │   ├── database/    # Database connection patterns
│       │   └── tools/       # Modular tool organization
│       └── wrangler.jsonc   # Deployment configuration example
├── CLAUDE.md                # Global development rules
├── INITIAL.md               # Feature requirements
└── README.md
```

### Desired Codebase tree with files to be added
```bash
poop-quest/
├── src/
│   ├── index.js             # Main application entry point
│   ├── bot/
│   │   ├── discord-bot.js   # Discord.js client setup and event handlers
│   │   ├── commands/
│   │   │   └── poop.js      # !poop command implementation
│   │   └── utils/
│   │       └── file-handler.js  # File upload and content extraction
│   ├── web/
│   │   ├── server.js        # Express.js server setup
│   │   ├── routes/
│   │   │   ├── index.js     # Home route
│   │   │   └── post.js      # Dynamic post routes (/:slug)
│   │   └── middleware/
│   │       └── seo.js       # SEO metadata injection middleware
│   ├── ai/
│   │   ├── grok-client.js   # Grok API client
│   │   ├── content-analyzer.js  # HTML content analysis
│   │   └── prompt-templates.js  # AI prompt engineering
│   ├── database/
│   │   ├── connection.js    # SQLite connection management
│   │   ├── models/
│   │   │   └── post.js      # Post data model and queries
│   │   └── migrations/
│   │       └── 001_init.sql # Database schema
│   └── utils/
│       ├── slug-sanitizer.js    # URL slug sanitization
│       └── security.js          # XSS prevention and validation
├── views/
│   ├── layout.ejs           # Master template with branded theme
│   ├── index.ejs            # Homepage template
│   ├── post.ejs             # Individual post template
│   └── partials/
│       ├── header.ejs       # Site header
│       ├── footer.ejs       # Site footer
│       └── sidebar.ejs      # Admin-controlled sidebar
├── public/
│   ├── css/
│   │   └── style.css        # Digital Art Deco/Neo-Roman theme
│   ├── js/
│   │   └── main.js          # Client-side JavaScript
│   └── images/
│       └── logo.png         # Site branding assets
├── tests/
│   ├── bot/
│   │   └── commands.test.js # Discord bot command tests
│   ├── web/
│   │   └── routes.test.js   # Express route tests
│   ├── ai/
│   │   └── grok-client.test.js  # AI integration tests
│   └── database/
│       └── models.test.js   # Database operation tests
├── docker/
│   ├── Dockerfile           # Container definition
│   └── docker-compose.yml   # Local development stack
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore patterns
├── package.json             # Dependencies and scripts
├── README.md                # Setup and deployment instructions
└── akash-deploy.yml         # Akash Network deployment configuration
```

### Known Gotchas & Library Quirks
```javascript
// CRITICAL: Discord.js v14+ requires Node.js 18+ and uses ES modules
// CRITICAL: Grok API is OpenAI-compatible but requires different base URL
// CRITICAL: SQLite requires synchronous initialization before async operations
// CRITICAL: EJS <%= %> escapes HTML, <%- %> outputs raw HTML (security risk)
// CRITICAL: Express.js middleware order matters - body parsing before route handlers
// CRITICAL: Discord bot and web server must share same process for monolithic deployment
// CRITICAL: File uploads in Discord have 25MB limit, handle gracefully
// CRITICAL: Grok API structured outputs require specific prompt engineering
// CRITICAL: Akash Network requires specific container configuration for persistent storage
```

## Implementation Blueprint

### Data models and structure

```javascript
// database/models/post.js - Core data structures
const POST_SCHEMA = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  slug: 'TEXT UNIQUE NOT NULL',
  title: 'TEXT NOT NULL',
  description: 'TEXT NOT NULL',
  html_content: 'TEXT NOT NULL',
  discord_user_id: 'TEXT NOT NULL',
  discord_username: 'TEXT NOT NULL',
  created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
};

// ai/content-analyzer.js - AI response structure
const GROK_RESPONSE_SCHEMA = {
  slug: 'string',    // URL-safe identifier
  title: 'string',   // SEO-friendly title
  description: 'string' // Meta description for social sharing
};

// bot/utils/file-handler.js - Discord content structure
const DISCORD_CONTENT = {
  type: 'file' | 'codeblock',
  content: 'string',        // Raw HTML content
  filename: 'string',       // Original filename (if file upload)
  user: {
    id: 'string',
    username: 'string'
  }
};
```

### List of tasks to be completed to fulfill the PRP in the order they should be completed

```yaml
Task 1: Project Setup and Configuration
CREATE package.json:
  - PATTERN: Use npm init with Node.js 18+ requirement
  - Add dependencies: discord.js, express, ejs, sqlite3, axios, dotenv
  - Add dev dependencies: nodemon, jest, supertest
  - Add scripts: start, dev, test, migrate

CREATE .env.example:
  - PATTERN: Follow examples from use-cases/mcp-server for env vars
  - Include: DISCORD_BOT_TOKEN, GROK_API_KEY, PORT, DATABASE_PATH
  - Add security keys: COOKIE_SECRET, ADMIN_USERS

CREATE .gitignore:
  - PATTERN: Standard Node.js gitignore
  - Include: .env, node_modules/, database.db, logs/

Task 2: Database Setup and Models
CREATE database/migrations/001_init.sql:
  - PATTERN: Follow database patterns from use-cases/mcp-server
  - Create posts table with all required fields
  - Add indexes for slug and created_at
  - Include foreign key constraints

CREATE database/connection.js:
  - PATTERN: Singleton pattern like use-cases/mcp-server/src/database/connection.ts
  - Handle SQLite connection with proper error handling
  - Include connection pooling and retry logic

CREATE database/models/post.js:
  - PATTERN: Follow model patterns from use-cases examples
  - Implement CRUD operations: create, findBySlug, findAll, update, delete
  - Add validation for slug uniqueness and required fields

Task 3: Grok AI Integration
CREATE ai/grok-client.js:
  - PATTERN: HTTP client similar to use-cases/mcp-server patterns
  - Implement OpenAI-compatible client with x.ai base URL
  - Add structured output support for JSON responses
  - Include error handling and rate limiting

CREATE ai/content-analyzer.js:
  - PATTERN: Service layer pattern
  - Implement HTML content analysis with Grok API
  - Generate slug, title, description from HTML content
  - Add prompt engineering for consistent outputs

CREATE ai/prompt-templates.js:
  - PATTERN: Template literal functions
  - Create prompts for different content types
  - Include instructions for JSON output format
  - Add fallback prompts for error cases

Task 4: Discord Bot Implementation
CREATE bot/discord-bot.js:
  - PATTERN: Event-driven architecture from Discord.js guide
  - Set up Discord client with proper intents
  - Add ready event handler and error handling
  - Include graceful shutdown handling

CREATE bot/commands/poop.js:
  - PATTERN: Command handler pattern
  - Handle both file uploads and code block content
  - Validate HTML content and file types
  - Integrate with AI analysis and database storage

CREATE bot/utils/file-handler.js:
  - PATTERN: Utility functions with error handling
  - Extract content from Discord attachments
  - Parse code blocks from message content
  - Validate file size and content type

Task 5: Express Web Server
CREATE web/server.js:
  - PATTERN: Express.js setup from documentation
  - Configure EJS as template engine
  - Set up static file serving for public assets
  - Add middleware for body parsing and security

CREATE web/routes/index.js:
  - PATTERN: Express router pattern
  - Implement homepage route with recent posts
  - Add pagination for post listings
  - Include error handling for database failures

CREATE web/routes/post.js:
  - PATTERN: Dynamic route handling
  - Implement /:slug route for individual posts
  - Add 404 handling for missing posts
  - Include SEO metadata injection

CREATE web/middleware/seo.js:
  - PATTERN: Express middleware pattern
  - Extract post metadata for SEO tags
  - Generate OpenGraph and Twitter Card tags
  - Add canonical URLs and structured data

Task 6: EJS Templates and Styling
CREATE views/layout.ejs:
  - PATTERN: Master template with includes
  - Implement Digital Art Deco/Neo-Roman theme structure
  - Add dynamic SEO metadata placeholders
  - Include responsive design framework

CREATE views/post.ejs:
  - PATTERN: Content template with security
  - Use <%- %> for HTML content rendering
  - Use <%= %> for escaped metadata
  - Add social sharing buttons and navigation

CREATE public/css/style.css:
  - PATTERN: Digital Art Deco/Neo-Roman theme
  - Use Google Fonts: Cinzel (headings), Roboto (body)
  - Implement flexbox layout for main content + sidebar
  - Add responsive breakpoints and accessibility

Task 7: Main Application Integration
CREATE src/index.js:
  - PATTERN: Single process with multiple services
  - Initialize database connection and migrations
  - Start Discord bot and Express server concurrently
  - Add graceful shutdown handling for both services

CREATE utils/slug-sanitizer.js:
  - PATTERN: Pure function utilities
  - Sanitize AI-generated slugs for URL safety
  - Handle Unicode characters and special cases
  - Add collision detection and resolution

CREATE utils/security.js:
  - PATTERN: Security utilities
  - Validate HTML content for XSS prevention
  - Sanitize user inputs and file uploads
  - Add rate limiting and abuse prevention

Task 8: Testing and Validation
CREATE tests/bot/commands.test.js:
  - PATTERN: Jest testing with mocks
  - Test !poop command with various inputs
  - Mock Discord API and database operations
  - Test error handling and edge cases

CREATE tests/web/routes.test.js:
  - PATTERN: Supertest for HTTP testing
  - Test all routes with valid and invalid data
  - Mock database operations and AI responses
  - Test SEO metadata generation

CREATE tests/ai/grok-client.test.js:
  - PATTERN: Mock external API calls
  - Test Grok API integration with various inputs
  - Test structured output parsing
  - Test error handling and fallbacks

Task 9: Deployment Configuration
CREATE docker/Dockerfile:
  - PATTERN: Multi-stage build for Node.js
  - Use Node.js 18+ base image
  - Copy and install dependencies efficiently
  - Add health checks and proper user permissions

CREATE akash-deploy.yml:
  - PATTERN: Akash Network deployment manifest
  - Configure persistent storage for SQLite
  - Set up port forwarding for web server
  - Add resource limits and health checks

Task 10: Documentation and Examples
CREATE README.md:
  - PATTERN: Comprehensive setup guide
  - Include prerequisites and installation steps
  - Add configuration examples and troubleshooting
  - Document deployment to Akash Network

UPDATE .env.example:
  - Add all discovered environment variables
  - Include example values and descriptions
  - Add security notes and best practices
```

### Per task pseudocode

```javascript
// Task 3: Grok AI Integration
// ai/grok-client.js
class GrokClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.x.ai/v1';
    this.model = 'grok-4';
  }

  async analyzeContent(htmlContent) {
    // PATTERN: OpenAI-compatible request format
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{
          role: 'system',
          content: 'Analyze HTML content and return JSON with slug, title, description'
        }, {
          role: 'user',
          content: htmlContent
        }],
        response_format: { type: 'json_object' }, // CRITICAL: Structured output
        temperature: 0.7
      })
    });

    // PATTERN: Error handling with fallbacks
    if (!response.ok) {
      throw new GrokAPIError(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }
}

// Task 4: Discord Bot Implementation
// bot/commands/poop.js
async function handlePoopCommand(message) {
  // PATTERN: Command validation first
  if (!message.content.startsWith('!poop')) return;

  try {
    // GOTCHA: Discord.js v14 uses message.attachments.first()
    const attachment = message.attachments.first();
    let htmlContent = '';

    if (attachment) {
      // PATTERN: File upload handling
      const response = await fetch(attachment.url);
      htmlContent = await response.text();
    } else {
      // PATTERN: Code block extraction
      const codeBlockMatch = message.content.match(/```html\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        htmlContent = codeBlockMatch[1];
      }
    }

    // PATTERN: Service integration
    const aiAnalysis = await grokClient.analyzeContent(htmlContent);
    const sanitizedSlug = sanitizeSlug(aiAnalysis.slug);
    
    // PATTERN: Database transaction
    const post = await db.posts.create({
      slug: sanitizedSlug,
      title: aiAnalysis.title,
      description: aiAnalysis.description,
      html_content: htmlContent,
      discord_user_id: message.author.id,
      discord_username: message.author.username
    });

    // PATTERN: Success response with URL
    await message.reply(`🎉 Post created! View at: https://poop.quest/${sanitizedSlug}`);

  } catch (error) {
    // PATTERN: Error handling with logging
    console.error('!poop command failed:', error);
    await message.reply('❌ Failed to process content. Please try again.');
  }
}

// Task 5: Express Web Server
// web/routes/post.js
app.get('/:slug', async (req, res) => {
  try {
    // PATTERN: Database query with validation
    const post = await db.posts.findBySlug(req.params.slug);
    
    if (!post) {
      return res.status(404).render('404', { 
        title: 'Post Not Found',
        description: 'The requested post could not be found.'
      });
    }

    // PATTERN: SEO metadata preparation
    const seoData = {
      title: post.title,
      description: post.description,
      canonical: `https://poop.quest/${post.slug}`,
      ogUrl: `https://poop.quest/${post.slug}`,
      ogTitle: post.title,
      ogDescription: post.description
    };

    // PATTERN: Template rendering with data
    res.render('post', {
      post: post,
      seo: seoData,
      user: { username: post.discord_username }
    });

  } catch (error) {
    // PATTERN: Error logging and user-friendly response
    console.error('Route error:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'An error occurred while loading the post.'
    });
  }
});
```

### Integration Points
```yaml
ENVIRONMENT:
  - add to: .env
  - vars: |
      # Discord Configuration
      DISCORD_BOT_TOKEN=your_bot_token_here
      
      # Grok AI Configuration
      GROK_API_KEY=your_grok_api_key_here
      GROK_MODEL=grok-4
      
      # Web Server Configuration
      PORT=3000
      BASE_URL=https://poop.quest
      
      # Database Configuration
      DATABASE_PATH=./database.db
      
      # Security
      COOKIE_SECRET=your_secret_key_here
      ADMIN_USERS=your_discord_user_id

DOCKER:
  - base: node:18-alpine
  - volumes: /app/database for SQLite persistence
  - ports: 3000 (web server), bot runs internally
  - health: GET /health endpoint

AKASH:
  - persistent storage: 1GB for SQLite database
  - compute: 0.5 CPU, 512MB RAM
  - network: HTTP/HTTPS ingress on port 3000
  - deployment: Single container with restart policy
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                    # ESLint for code quality
npm run type-check             # If using TypeScript
node -c src/index.js           # Syntax validation

# Expected: No errors. If errors, READ and fix.
```

### Level 2: Unit Tests
```javascript
// tests/bot/commands.test.js
describe('!poop command', () => {
  test('processes HTML file upload', async () => {
    const mockMessage = createMockMessage({
      attachments: [{ url: 'https://example.com/test.html' }]
    });
    
    await handlePoopCommand(mockMessage);
    
    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining('🎉 Post created!')
    );
  });

  test('handles code block content', async () => {
    const mockMessage = createMockMessage({
      content: '!poop\n```html\n<h1>Test</h1>\n```'
    });
    
    await handlePoopCommand(mockMessage);
    
    expect(db.posts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        html_content: '<h1>Test</h1>'
      })
    );
  });

  test('handles AI analysis failure gracefully', async () => {
    grokClient.analyzeContent.mockRejectedValue(new Error('API Error'));
    
    const mockMessage = createMockMessage({
      content: '!poop\n```html\n<h1>Test</h1>\n```'
    });
    
    await handlePoopCommand(mockMessage);
    
    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining('❌ Failed to process')
    );
  });
});

// tests/web/routes.test.js
describe('POST routes', () => {
  test('serves post by slug', async () => {
    const mockPost = {
      slug: 'test-post',
      title: 'Test Post',
      description: 'Test Description',
      html_content: '<h1>Test</h1>'
    };
    
    db.posts.findBySlug.mockResolvedValue(mockPost);
    
    const response = await request(app)
      .get('/test-post')
      .expect(200);
    
    expect(response.text).toContain('<h1>Test</h1>');
    expect(response.text).toContain('Test Post');
  });

  test('returns 404 for missing post', async () => {
    db.posts.findBySlug.mockResolvedValue(null);
    
    await request(app)
      .get('/nonexistent-post')
      .expect(404);
  });
});
```

```bash
# Run tests iteratively until passing:
npm test                       # Run all tests
npm run test:watch            # Watch mode for development
npm run test:coverage         # Coverage report

# If failing: Read error, fix code, re-run
```

### Level 3: Integration Test
```bash
# Start the complete application
npm start

# Test Discord bot (in Discord client)
# 1. Send: !poop with HTML file attachment
# Expected: Success message with URL

# 2. Send: !poop with code block
# Expected: Success message with URL

# Test web server
curl -I http://localhost:3000/
# Expected: 200 OK with HTML content

# Test dynamic route
curl -I http://localhost:3000/test-slug
# Expected: 200 OK or 404 Not Found

# Test SEO metadata
curl -s http://localhost:3000/test-slug | grep -i "og:title"
# Expected: OpenGraph tags present
```

## Final Validation Checklist
- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] Discord bot responds to !poop commands: Manual test in Discord
- [ ] Web server serves posts correctly: `curl http://localhost:3000/test-slug`
- [ ] SEO metadata present: Check page source for OpenGraph tags
- [ ] Database operations work: Posts created and retrieved
- [ ] Grok AI integration functional: Structured JSON responses
- [ ] Docker container builds: `docker build -t poop-quest .`
- [ ] Akash deployment manifest valid: `akash deployment validate`
- [ ] Error cases handled gracefully: Test with invalid inputs
- [ ] Documentation complete: README has setup instructions

---

## Anti-Patterns to Avoid
- ❌ Don't use different processes for bot and web server - monolithic deployment required
- ❌ Don't skip input validation - Discord content can be malicious
- ❌ Don't hardcode API keys - use environment variables
- ❌ Don't use sync operations in async context - causes blocking
- ❌ Don't trust AI-generated slugs - always sanitize for URL safety
- ❌ Don't skip error handling - both bot and web server need graceful failures
- ❌ Don't ignore EJS security - use proper escaping for user content
- ❌ Don't skip database migrations - schema changes need versioning

## Confidence Score: 9/10

High confidence due to:
- **Clear architecture**: Monolithic Node.js app with well-defined services
- **Proven technologies**: Discord.js, Express.js, EJS, SQLite all mature
- **OpenAI-compatible API**: Grok API provides familiar integration pattern
- **Comprehensive validation**: Multiple testing layers ensure reliability
- **Deployment ready**: Docker and Akash configuration included
- **Security conscious**: XSS prevention and input validation addressed

Minor uncertainty around:
- Grok API rate limits and specific error responses (new service)
- Akash Network deployment specifics for persistent storage
- Discord.js v14 breaking changes in file handling

The implementation path is clear with sufficient context and validation gates to ensure success.