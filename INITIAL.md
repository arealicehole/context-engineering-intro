Of course. Here is the feature development document for the `poop.quest` project, formatted according to your provided template and inspired by the best practices in your example.

***

## FEATURE:

-   **All-in-One Application:** A single Node.js application that runs both a Discord bot and a public-facing Express.js web server.
-   **Discord Bot Interface:** A bot that accepts HTML content via a `!poop` command, either as a file upload or within a code block.
-   **AI Content Engine:** Uses the OpenAI API to analyze the submitted HTML and generate a JSON object containing a witty, SEO-friendly `slug`, a `title`, and a `description`.
-   **Branded Web Platform:** Renders the user's HTML inside a master EJS template. This template provides a consistent, sophisticated "Digital Art Deco / Neo-Roman" themed header, footer, and sidebar on every page.
-   **Dynamic Metadata:** The master template is dynamically populated with the AI-generated title and description for each specific page, ensuring optimal SEO and social media sharing.
-   **Admin-Controlled Modules:** The page layout includes a dedicated sidebar/aside section for admin-controlled content (e.g., ads, announcements, featured posts).
-   **Database Persistence:** Uses SQLite for simple, file-based storage of all posts (`slug`, `title`, `description`, `html_content`).

## EXAMPLES:

The following files will serve as the primary reference examples for the project's architecture. They demonstrate the separation of concerns between the server logic, the view template, and the styling.

-   `index.js` - This will be the main application entry point. It will contain the setup for the Express server, the EJS view engine, the `discord.js` client and its event listeners, all web routes (`app.get('/:slug')`), and the database logic. It serves as the central orchestrator for the entire application.
-   `views/layout.ejs` - This file is the core of the web platform's "Template Shell" model. It will contain the complete HTML structure for the branded page, including the header, footer, and sidebar. It will use EJS tags (`<%= %>`, `<%- %>`, `<% %>`) as placeholders to be filled with dynamic data (like the post title and content) and global data (like navigation links) by the Express server.
-   `public/css/style.css` - This is the reference implementation of the "Digital Art Deco / Neo-Roman" theme. It will define the site's color palette, typography (using Google Fonts like 'Cinzel' and 'Roboto'), and layout, including the flexbox structure for the main content and sidebar.

## DOCUMENTATION:

Development will require referencing the official documentation for all core technologies.

-   **Runtime/Framework:**
    -   Node.js: [https://nodejs.org/en/docs/](https://nodejs.org/en/docs/)
    -   Express.js: [https://expressjs.com/en/guide/routing.html](https://expressjs.com/en/guide/routing.html)
-   **Key Libraries:**
    -   Discord.js: [https://discordjs.guide/](https://discordjs.guide/)
    -   OpenAI API (Node.js): [https://platform.openai.com/docs/api-reference](https://platform.openai.com/docs/api-reference)
    -   SQLite (node-sqlite3): [https://www.npmjs.com/package/sqlite3](https://www.npmjs.com/package/sqlite3)
    -   EJS (Templating): [https://ejs.co/](https://ejs.co/)
-   **Deployment:**
    -   Docker for Node.js: [https://docs.docker.com/language/nodejs/build-images/](https://docs.docker.com/language/nodejs/build-images/)
    -   Akash Network: [https://docs.akash.network/](https://docs.akash.network/)

## OTHER CONSIDERATIONS:

-   **Environment Variables:** A `.env.example` file must be included to list all necessary environment variables (`DISCORD_BOT_TOKEN`, `OPENAI_API_KEY`, `PORT`). The application must use `python_dotenv` (or `dotenv` for Node.js) to load these variables.
-   **README Instructions:** The root `README.md` must contain a clear project structure overview and detailed setup instructions, including how to install dependencies (`npm install`), configure the `.env` file, and run the application (`npm start` or `node index.js`).
-   **EJS Escaping Gotcha:** This is a critical security and rendering detail. When injecting data into the `layout.ejs` template, `_<%= variable %>_` must be used for simple text (like titles and descriptions) to escape HTML and prevent XSS. In contrast, `_<%- variable %>_` must be used to render the user's submitted HTML content, as this tag outputs raw, unescaped HTML.
-   **AI Prompt Engineering:** The prompt sent to the OpenAI API must explicitly instruct the model to return a well-formed JSON object with the exact keys: `slug`, `title`, and `description`. Use of the `response_format: { type: "json_object" }` parameter is highly recommended.
-   **Slug Sanitization:** The `slug` returned by the AI must be programmatically sanitized to ensure it is a valid URL component (convert to lowercase, remove special characters, replace spaces with dashes).
-   **Monolithic Deployment:** Remember that the bot and the web server are a single process. The deployment host (Akash) must be configured to both keep this process running 24/7 (for the bot) and route incoming HTTP traffic on port 80/443 to the application's port (for the website).