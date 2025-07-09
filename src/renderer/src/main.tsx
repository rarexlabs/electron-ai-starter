import './assets/global.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import log from 'electron-log/renderer'

// Log renderer startup as early as possible
log.info('🎨 Renderer process started')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
