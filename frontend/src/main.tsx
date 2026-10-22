import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerPwa } from './pwa/registration'

// El service worker se registra antes de montar la app para que el shell
// quede cacheado lo antes posible.
registerPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
