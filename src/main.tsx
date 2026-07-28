import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

export const Page = window.location.pathname.startsWith('/game')
  ? lazy(() => import('./game/GameApp.tsx'))
  : lazy(() => import('./App.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={
      <div style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: '#0d0f0e',
        color: '#a0aaa2',
        font: '13px ui-monospace, SFMono-Regular, Menlo, monospace',
      }}>
        Loading...
      </div>
    }>
      <Page />
    </Suspense>
  </StrictMode>,
)
