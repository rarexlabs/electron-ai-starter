# Electron Starter Template

A modern, full-featured Electron application template with React, TypeScript, and a complete development stack. This template provides everything you need to build cross-platform desktop applications with a professional foundation.

## Features

- **Modern Electron Architecture** - Two-process architecture with secure IPC communication
- **React 19** - Latest React with TypeScript for the renderer process
- **Tailwind CSS 4** - Modern styling with CSS variables and theming
- **Shadcn/ui Components** - Beautiful, accessible UI components (New York style)
- **Database Ready** - SQLite with Drizzle ORM and better-sqlite3
- **Development Tools** - Hot reload, TypeScript checking, and code formatting
- **Cross-Platform Building** - Build for Windows, macOS, and Linux

## Tech Stack

### Frontend

- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **Shadcn/ui** component library
- **Lucide React** for icons

### Backend

- **Electron** with electron-vite bundler
- **SQLite** database with Drizzle ORM
- **better-sqlite3** for database operations

### Development Tools

- **TypeScript** with separate configs for Node.js and web
- **ESLint** for code linting
- **Prettier** for code formatting
- **Drizzle Kit** for database migrations

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Add Shadcn Components

```bash
$ npm run shadcn add [component-name]
```

### Database Operations

```bash
# Generate database migrations
$ npm run drizzle-kit generate

# Run database migrations
$ npm run drizzle-kit migrate

# Reset development database
$ npm run db:reset
```

### Code Quality

```bash
# Lint code
$ npm run lint

# Format code
$ npm run format

# Type check
$ npm run typecheck
```

### Build

```bash
# Development build
$ npm run build

# Platform-specific builds
$ npm run build:win    # Windows
$ npm run build:mac    # macOS
$ npm run build:linux  # Linux
```

## Architecture

This template uses Electron's two-process architecture:

- **Main Process** (`src/main/`) - Node.js backend with system access
- **Renderer Process** (`src/renderer/`) - React frontend application
- **Preload Scripts** (`src/preload/`) - Secure IPC bridge between processes

### Path Aliases

Pre-configured path aliases for cleaner imports:

- `@renderer` → `src/renderer/src`
- `@` → `src/renderer/src`
- `@/components` → `src/renderer/src/components`
- `@/lib` → `src/renderer/src/lib`
- `@/utils` → `src/renderer/src/lib/utils`

### Database Configuration

- **Development**: `./tmp/app.db`
- **Production**: Electron's userData directory
- **WAL mode** enabled for performance
- **Auto-migration** on application startup

## Getting Started

1. Clone this template
2. Run `npm install`
3. Start development with `npm run dev`
4. Begin building your Electron app!

