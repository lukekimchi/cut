import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

document.addEventListener('pointerdown', (e) => {
  if ((e.target as Element).closest('button') && navigator.vibrate) {
    navigator.vibrate(6);
  }
}, { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
