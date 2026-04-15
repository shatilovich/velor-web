import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#a855f7',
          colorBgBase: '#0a0a0f',
          colorBgContainer: '#13131a',
          colorBgElevated: '#1a1a24',
          borderRadius: 16,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
        },
        components: {
          Button: {
            borderRadius: 14,
          },
          Card: {
            borderRadius: 20,
          },
          Drawer: {
            borderRadius: 20,
          },
          Slider: {
            trackBg: '#a855f7',
            trackHoverBg: '#c084fc',
            handleColor: '#a855f7',
            handleActiveColor: '#c084fc',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)
