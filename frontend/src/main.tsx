import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SecretChatProvider } from './context/SecretChatContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SecretChatProvider>
      <App />
    </SecretChatProvider>
  </StrictMode>,
)
