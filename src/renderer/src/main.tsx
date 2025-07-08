import './assets/global.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { logger } from '@/lib/logger'

// Log renderer startup as early as possible
logger.info('🎨 Renderer process started')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
