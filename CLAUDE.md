# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application with TypeScript checks
- `npm run start` - Run the built application

### Code Quality

- `npm run lint` - Run ESLint on the codebase
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript checks for both node and web configurations
- `npm run typecheck:node` - Check main process TypeScript
- `npm run typecheck:web` - Check renderer process TypeScript

### Testing

- `npm run test:main` - Run main process tests

### Building Distributables

- `npm run build:win` - Build Windows executable
- `npm run build:mac` - Build macOS executable
- `npm run build:linux` - Build Linux executable
- `npm run build:unpack` - Build without packaging

## Architecture

This is an Electron application with a React frontend using the following stack:

- **Electron** with electron-vite for bundling
- **React 19** with TypeScript for the renderer process
- **Tailwind CSS 4** for styling
- **Shadcn/ui** component library (New York style)
- **Lucide React** for icons
- **SQLite database** with **Drizzle ORM** and **better-sqlite3**

### Project Structure

- `src/main/` - Electron main process (Node.js)
- `src/preload/` - Preload scripts for IPC security
- `src/renderer/` - React frontend application
- `src/renderer/src/components/ui/` - Shadcn/ui components
- `src/renderer/src/lib/` - Utility functions
- `src/renderer/src/assets/` - Global styles and assets

### Key Configuration Files

- `electron.vite.config.ts` - Main build configuration with path aliases
- `components.json` - Shadcn/ui configuration
- `tsconfig.json` - Composite TypeScript configuration
- `tsconfig.node.json` - Node.js (main/preload) TypeScript config
- `tsconfig.web.json` - Web (renderer) TypeScript config
- `drizzle.config.ts` - Database configuration and migration setup

### Path Aliases

The following aliases are configured:

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

### Database Configuration

- **SQLite database** with environment-based path configuration (`DB_PATH`)
- **Development database**: `./tmp/electron-starter.db`
- **Production database**: Electron's userData directory
- **Database commands**:
  - `npm run dk` - Drizzle Kit operations (generate, migrate, etc.)
  - `npm run db:reset` - Reset development database with fresh schema

### Logging Configuration

- **electron-log** for unified logging across main and renderer processes
- **Development logs**: `LOG_FOLDER` environment variable (default: `./tmp/logs`)
- **Production logs**: Electron's userData directory `/logs`
- **Log files**:
  - `main.log` - Main process logs (database, IPC, app lifecycle)
  - `renderer.log` - Renderer process logs (UI, React components)
- **Features**: Automatic error catching, event logging, file rotation (5MB limit)
- **Usage**:
  - Main process: `import { mainLogger } from './logger'`
  - Renderer process: `import { logger } from '@/lib/logger'`

## Development Notes

- The application uses a two-process architecture: main (Node.js) and renderer (React), with preload scripts providing secure IPC communication
- TypeScript is configured with separate configs for Node.js and web environments
- Tailwind CSS 4 is used with CSS variables for theming
- The build process includes TypeScript checking before bundling
- Database migrations are automatically applied on application startup
- WAL mode is enabled for SQLite performance optimization

## Commit Guidelines

- When adding commit messages, keep the message very concise and do not add any claude related message.
- Prefer to use `git add .` when committing changes

## Project Management

### Epic and Feature Planning Structure

- **Epic Organization**: Each epic has its own subfolder under `plans/` (e.g., `plans/smart-file-renamer/`)
- **Epic Definition**: The `epic.md` file in each epic folder contains the overall epic scope, user value, and high-level feature breakdown
- **Feature Implementation Plans**: Individual feature implementation plans are stored as separate `.md` files in the same epic folder (e.g., `foundation.md`, `folder-selection.md`)
- **Planning Workflow**: Start with the epic overview, then create detailed implementation plans for each feature as needed
