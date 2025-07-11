# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application with TypeScript checks
- `npm run start` - Run the built application (preview mode)

### Code Quality

- `npm run lint` - Run ESLint on the codebase
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript checks for both node and web configurations
- `npm run typecheck:node` - Check main process TypeScript
- `npm run typecheck:web` - Check renderer process TypeScript

### Testing

- `npm run test:main` - Run main process tests with Vitest

### Database Operations

- `npm run drizzle-kit` - Run Drizzle Kit CLI operations (generate, migrate, push, studio)
- `npm run db:reset` - Reset development database by removing the database file

### Building Distributables

- `npm run build:win` - Build Windows executable
- `npm run build:mac` - Build macOS executable  
- `npm run build:linux` - Build Linux executable
- `npm run build:unpack` - Build without packaging

## Architecture

This is an Electron application with AI chat integration using the following modern stack:

- **Electron 37** with **electron-vite** for bundling and development
- **React 19** with TypeScript for the renderer process
- **Tailwind CSS 4** with Vite plugin for styling
- **Shadcn/ui** component library (New York style)
- **Lucide React** for icons
- **SQLite database** with **Drizzle ORM** and **better-sqlite3**
- **AI SDK** with support for Anthropic, OpenAI, and Google providers
- **Assistant UI** for chat interface components

### Project Structure

```
src/
├── main/           # Electron main process (Node.js)
│   ├── ai/         # AI provider factory and streaming
│   ├── db/         # Database schema and migrations
│   ├── index.ts    # Main entry point
│   ├── logger.ts   # Logging configuration
│   └── ...
├── preload/        # Preload scripts for secure IPC
├── renderer/       # React frontend application
│   └── src/
│       ├── components/ # React components
│       │   ├── ui/     # Shadcn/ui components
│       │   └── assistant-ui/ # AI chat components
│       ├── lib/        # Utility functions and AI chat logic
│       └── assets/     # Global styles
├── types/          # Shared TypeScript types
└── ...
```

### Key Configuration Files

- `electron.vite.config.ts` - Main build configuration with path aliases and Tailwind
- `components.json` - Shadcn/ui configuration (New York style)
- `tsconfig.json` - Composite TypeScript configuration
- `tsconfig.node.json` - Node.js (main/preload) TypeScript config
- `tsconfig.web.json` - Web (renderer) TypeScript config
- `drizzle.config.ts` - Database configuration and migration setup
- `vitest.config.main.ts` - Testing configuration for main process

### Path Aliases

The following aliases are configured in `electron.vite.config.ts`:

- `@renderer` → `src/renderer/src`
- `@` → `src/renderer/src`
- `@/components` → `src/renderer/src/components`
- `@/lib` → `src/renderer/src/lib`
- `@/utils` → `src/renderer/src/lib/utils`

### Adding Shadcn Components

Use the following command to add new Shadcn components:

```bash
npm run shadcn [component-name]
```

The configuration uses New York style with Lucide icons and neutral base color.

### Database Configuration

- **SQLite database** with environment-based path configuration
- **Development database**: `./tmp/db/app.db`
- **Production database**: Electron's userData directory `/db/app.db`
- **Schema**: Simple settings table for key-value configuration storage
- **Migrations**: Located in `src/main/db/migrations/`
- **Database commands**:
  - `npm run drizzle-kit` - Drizzle Kit operations (generate, migrate, push, studio)
  - `npm run db:reset` - Reset development database

### AI Integration

- **AI SDK** with multi-provider support (Anthropic, OpenAI, Google)
- **Assistant UI** components for chat interface
- **Streaming**: Real-time AI response streaming with electron-vite bridge
- **Configuration**: AI settings stored in database and configurable via UI

### Logging Configuration

- **electron-log** for unified logging across main and renderer processes
- **Development logs**: `MAIN_VITE_USER_DATA_PATH/logs/` (typically `./tmp/logs/`)
- **Production logs**: Electron's userData directory `/logs/`
- **Log files**:
  - `main.log` - Main process logs (database, IPC, app lifecycle, AI)
  - `renderer.log` - Renderer process logs (UI, React components)
- **Features**: 
  - Automatic error catching with optional dialog in development
  - Event logging for app lifecycle events
  - File rotation (5MB limit)
  - Separate console and file log levels
- **Usage**:
  - Main process: `import { mainLogger } from './logger'`
  - Renderer process: `import { logger } from '@/lib/logger'`

## Development Notes

- The application uses Electron's secure two-process architecture with IPC communication
- TypeScript is configured with separate configs for Node.js and web environments
- Tailwind CSS 4 is used with CSS variables for theming support
- The build process includes comprehensive TypeScript checking before bundling
- Database migrations are handled through Drizzle Kit CLI
- AI chat functionality is built with streaming support and multiple provider options
- Testing is set up for the main process using Vitest with Electron runtime

## Key Dependencies

### Core Framework
- `electron` - Desktop application framework
- `electron-vite` - Build tooling and development server
- `react` - UI framework
- `typescript` - Type safety

### UI & Styling
- `tailwindcss` - Utility-first CSS framework
- `@tailwindcss/vite` - Tailwind CSS Vite plugin
- `@radix-ui/*` - Unstyled, accessible UI primitives
- `lucide-react` - Icon library

### Database
- `drizzle-orm` - TypeScript ORM
- `drizzle-kit` - Database toolkit
- `better-sqlite3` - SQLite driver

### AI Integration
- `ai` - AI SDK for streaming and chat
- `@ai-sdk/anthropic` - Anthropic provider
- `@ai-sdk/openai` - OpenAI provider  
- `@ai-sdk/google` - Google provider
- `@assistant-ui/react` - Chat UI components

### Development Tools
- `vitest` - Testing framework
- `eslint` - Code linting
- `prettier` - Code formatting
- `electron-builder` - Application packaging

## Commit Guidelines

- Keep commit messages concise and descriptive
- Use `git add .` when committing changes
- Do not include Claude-related messages in commits