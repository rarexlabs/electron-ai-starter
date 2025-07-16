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

- `npm run test:backend` - Run backend process tests with Vitest

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
├── main/           # Electron main process entry point
├── backend/        # Backend business logic (separate from main)
│   ├── ai/         # AI provider factory, streaming, session management
│   ├── db/         # Database schema, migrations, connection
│   ├── settings/   # Application settings management
│   ├── paths/      # Path configuration utilities
│   ├── logger.ts   # Backend logging configuration
│   └── server.ts   # AI streaming server setup
├── preload/        # Secure IPC bridge scripts
├── renderer/       # React frontend application
│   └── src/
│       ├── components/     # React components
│       │   ├── ui/         # Shadcn/ui components
│       │   └── assistant-ui/ # AI chat components
│       ├── lib/            # Utilities and AI streaming logic
│       └── assets/         # Global CSS with Tailwind + Assistant UI styles
├── common/         # Shared TypeScript types and utilities
└── resources/      # Build resources (migrations, icons, etc.)
```

This project uses a custom three-process architecture with a separate backend process for business logic, which differs from Electron's standard two-process model.

### Key Configuration Files

- `electron.vite.config.ts` - Main build configuration with path aliases and Tailwind
- `components.json` - Shadcn/ui configuration (New York style, neutral base color)
- `tsconfig.json` - Composite TypeScript configuration
- `tsconfig.node.json` - Node.js (main/preload/backend) TypeScript config
- `tsconfig.web.json` - Web (renderer) TypeScript config
- `drizzle.config.ts` - Database configuration and migration setup
- `vitest.config.backend.ts` - Testing configuration for backend process
- `electron-builder.yml` - Multi-platform packaging configuration

### Path Aliases

The following aliases are configured in `electron.vite.config.ts`:

- `@renderer` → `src/renderer/src`
- `@common` → `src/common`
- `@main` → `src/main`
- `@backend` → `src/backend`
- `@resources` → `resources`

### Adding Shadcn Components

Use the following command to add new Shadcn components:

```bash
npm run shadcn add [component-name]
```

The configuration uses New York style with Lucide icons and neutral base color.

### Database Configuration

- **SQLite database** with environment-based path configuration
- **Development database**: `./tmp/db/app.db`
- **Production database**: Electron's userData directory `/db/app.db`
- **Schema**: Simple settings table for key-value configuration storage
- **Migrations**: Located in `resources/db/migrations/` (included in build)
- **Type-safe**: Full Drizzle ORM integration with TypeScript types
- **Database commands**:
  - `npm run drizzle-kit` - Drizzle Kit operations (generate, migrate, push, studio)
  - `npm run db:reset` - Reset development database

### AI Integration

- **Multi-provider factory**: Support for OpenAI, Anthropic (Claude), and Google (Gemini)
- **Streaming architecture**: Real-time text streaming with session management
- **Provider configurations**: Model lists, API key management, connection testing
- **Assistant UI components**: Pre-built chat interface with streaming support
- **Configuration**: AI settings stored in database and configurable via UI
- **Session management**: Persistent chat sessions with proper state handling

### Logging Configuration

- **electron-log** for unified logging across all processes
- **Environment-aware paths**: Development (`./tmp/logs/`) vs Production (userData/logs/)
- **Separate log files**:
  - `main.log` - Main process logs (app lifecycle, IPC)
  - `backend.log` - Backend process logs (AI, database, settings)
  - `preload.log` - Preload script logs
  - `renderer.log` - Renderer process logs (UI, React components)
- **Features**: 
  - File rotation (5MB limit)
  - Automatic error catching with optional dialogs in development
  - Structured logging with different levels for console vs file output
  - Process-specific loggers for better debugging
- **Usage**:
  - Backend process: `import logger from './logger'` (within backend folder)
  - Renderer process: `import { logger } from '@/lib/logger'`

### UI & Styling Architecture

- **Tailwind CSS 4** with CSS variables for theming support
- **Assistant UI styles** integrated via CSS layers for chat components
- **Dark/light theme support** with CSS custom properties
- **Component system**: Shadcn/ui + custom Assistant UI components
- **Accessibility**: Built-in WCAG compliance patterns

## Development Notes

- The application uses a custom three-process architecture (main, backend, renderer) with IPC communication, extending Electron's standard two-process model
- TypeScript is configured with separate configs for Node.js and web environments
- Tailwind CSS 4 is used with CSS variables for theming support
- The build process includes comprehensive TypeScript checking before bundling
- Database migrations are handled through Drizzle Kit CLI and included in build resources
- AI chat functionality is built with streaming support and multiple provider options
- Testing is set up for the backend process using Vitest with Electron runtime
- The backend process is separated from main for better organization and testing
- Assistant UI provides pre-built components for chat interfaces with streaming support

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