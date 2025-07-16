import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin, swcPlugin, loadEnv } from 'electron-vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  console.log(mode)
  const env = loadEnv(mode)
  console.log(env)
  const processEnv = Object.keys(env).reduce((acc, key) => {
    acc[`process.env.${key}`] = JSON.stringify(env[key])
    return acc
  }, {})

  return {
    main: {
      define: processEnv,
      build: {
        sourcemap: true,
        minify: true
      },
      resolve: {
        alias: {
          '@main': resolve('src/main'),
          '@common': resolve('src/common'),
          '@resources': resolve('resources')
        }
      },
      plugins: [externalizeDepsPlugin(), swcPlugin()]
    },
    preload: {
      plugins: [externalizeDepsPlugin(), swcPlugin()]
    },
    renderer: {
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@common': resolve('src/common')
        }
      },
      plugins: [react(), tailwindcss()]
    }
  }
})
