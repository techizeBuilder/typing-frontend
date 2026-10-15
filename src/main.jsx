import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.css'
import './index.css'
// Legacy shared classes (btn-primary, input-group, btn-back-floating, divider…)
// used by admin pages and MyResults, not only the auth screens.
import './pages/AuthScreens.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
