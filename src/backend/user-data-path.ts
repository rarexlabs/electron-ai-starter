/**
 * Resolves the user data path from command line arguments or environment variables
 * Supports both Electron main process (CLI args) and test environment (env vars)
 */
export function getUserDataPath(): string {
  // First try command line arguments (Electron main process)
  const args = process.argv
  const userDataPathIndex = args.indexOf('--user-data-path')

  if (userDataPathIndex !== -1 && userDataPathIndex + 1 < args.length) {
    return args[userDataPathIndex + 1]
  }

  // Fallback to environment variable (test environment)
  const envPath = process.env.MAIN_VITE_USER_DATA_PATH
  if (envPath) {
    return envPath
  }

  // Neither CLI args nor env var available
  throw new Error(
    'user-data-path is required but not provided. ' +
    'Expected either --user-data-path CLI argument or MAIN_VITE_USER_DATA_PATH environment variable.'
  )
}

export default getUserDataPath