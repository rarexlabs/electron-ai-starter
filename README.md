# Electron AI Starter Template

A modern, full-featured Electron application template with TypeScript, React, Drizzle ORM and Vercel AI SDK. This template provides everything you need to build desktop applications with AI capabilities. Stop scaffolding, start building!

## Features

### 🔧 Build Tooling
- **[Electron](https://github.com/electron/electron) + [Vite](https://github.com/vitejs/vite)** - Lightning-fast development with hot reload and optimized production builds
- **[SWC](https://github.com/swc-project/swc)** - Ultra-fast TypeScript/JavaScript compilation for maximum speed

### 🛠️ Development Tooling
- **[TypeScript](https://github.com/microsoft/TypeScript)** - Full type safety across main and renderer processes
- **[ESLint](https://github.com/eslint/eslint)** - Code linting with TypeScript and React configurations
- **[Prettier](https://github.com/prettier/prettier)** - Automated code formatting for consistent style
- **[Electron Log](https://github.com/megahertz/electron-log)** - Unified logging across main and renderer processes
- **[Vitest](https://github.com/vitest-dev/vitest)** - Fast unit testing with TypeScript support

### 🗄️ Database
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm)** - Type-safe database operations with auto-migrations
- **Environment-based paths** - Development and production database separation

### 🎨 UI & Design
- **[React](https://github.com/facebook/react) 19** - Latest React with full TypeScript support
- **[Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) 4** - Modern styling with CSS variables and theming
- **[Shadcn/ui](https://github.com/shadcn-ui/ui)** - Beautiful, accessible component library (New York style)

### 🤖 AI Integration
- **[Vercel AI SDK](https://github.com/vercel/ai)** - Unified interface for OpenAI, Anthropic, and Google AI providers
- **[Assistant UI](https://github.com/Yonom/assistant-ui)** - Production-ready chat interface with streaming support

## Get Started

```bash
$ git clone git@github.com:rarexlabs/electron-ai-starter.git
$ cd electron-ai-starter
$ cp .env.example .env
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

# Reset development database
$ npm run db:reset
```

### Code Quality

```bash
# Type check
$ npm run typecheck

# Format code
$ npm run format

# Lint code
$ npm run lint
```

## Future Roadmap

### 🔄 Backend Process
- **Utility Process for Backend Tasks** - Implement Electron utility processes to prevent CPU-bound operations from [blocking the main process] (https://www.electronjs.org/docs/latest/tutorial/performance#3-blocking-the-main-process)

### 🤖 Advanced AI Capabilities  
- **Mastra Integration for Agentic Workflows** - Integrate Mastra framework to add production-ready agentic capabilities including workflows, agent memory, RAG pipelines, and evaluation systems while maintaining compatibility with existing AI SDK setup
