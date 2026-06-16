import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './theme.css'
import App from './App.jsx'
import { ThemeProvider } from './hooks/useTheme'

// 새 서비스워커(PWA)가 페이지 제어를 가져가면 자동으로 한 번 새로고침합니다.
// → 배포 후 캐시된 옛 번들이 남아 발생하던 문제(예: 옛 API 키로 401)를 방지.
// 최초 방문(이전 컨트롤러 없음)에는 새로고침하지 않습니다.
if ("serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  let refreshing = false
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing || !hadController) return
    refreshing = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
