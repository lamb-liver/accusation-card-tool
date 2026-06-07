/// <reference types="vite-plugin-pwa/client" />
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css';
import App from './App.jsx'
import { reportWebVitals } from './utils/reportWebVitals.js'
import { preloadLcpCardImage } from './utils/lcpPreload.js'

preloadLcpCardImage()

/** 舊 chunk / 動態 import 失敗時強制重載（避免一般視窗卡在快取、無痕卻正常） */
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

window.addEventListener(
  'load',
  () => {
    registerSW({ immediate: true })
  },
  { once: true },
)

reportWebVitals()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
