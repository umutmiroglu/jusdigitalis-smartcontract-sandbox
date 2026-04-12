import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './v2_5.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
