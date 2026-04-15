import { useState, useEffect, useRef } from 'react'
import { Drawer, Slider, Button, Typography, Segmented, InputNumber, Divider, Modal } from 'antd'
import { CloseOutlined, RestFilled } from '@ant-design/icons'
import { type Zone, type AppSettings, ALL_ZONES, ZONE_INFO } from '../models/types'
import { tapVibrate, resetVibrate } from '../utils/haptics'

const { Text, Title } = Typography

interface MenuViewProps {
  settings: AppSettings
  onUpdateSettings: (partial: Partial<AppSettings>) => void
  onResetSettings: () => void
  onClose: () => void
}

export function MenuView({ settings, onUpdateSettings, onResetSettings, onClose }: MenuViewProps) {
  const [confirmReset, setConfirmReset] = useState(false)
  const [localLimits, setLocalLimits] = useState<Record<Zone, number>>(() => {
    const l = {} as Record<Zone, number>
    ALL_ZONES.forEach(z => { l[z] = Math.max(1, Math.round(settings.limits[z] / 60)) })
    return l
  })
  const ready = useRef(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => { ready.current = true })
    return () => cancelAnimationFrame(id)
  }, [])

  const handleLimitChange = (zone: Zone, minutes: number | null) => {
    if (minutes == null) return
    tapVibrate()
    const clamped = Math.max(1, Math.min(30, minutes))
    setLocalLimits(prev => ({ ...prev, [zone]: clamped }))
    onUpdateSettings({ limits: { ...settings.limits, [zone]: clamped * 60 } })
  }

  const handleResetDefaults = () => {
    resetVibrate()
    onResetSettings()
    setConfirmReset(false)
    onClose()
  }

  return (
    <>
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="menu-title-dot" />
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>Настройки</span>
          </div>
        }
        placement="bottom"
        height="88dvh"
        onClose={() => { if (ready.current) onClose() }}
        open
        closeIcon={
          <div className="menu-close-btn">
            <CloseOutlined style={{ fontSize: 12 }} />
          </div>
        }
        styles={{
          header: {
            background: '#0f0f18',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '16px 20px',
          },
          body: {
            background: '#0f0f18',
            padding: '0 20px 40px',
            overflowY: 'auto',
          },
          mask: {
            backdropFilter: 'blur(8px)',
            background: 'rgba(0,0,0,0.6)',
          },
          wrapper: {
            borderRadius: '24px 24px 0 0',
            overflow: 'hidden',
          },
        }}
      >
        {/* Zone limits */}
        <div className="menu-section">
          <Text className="menu-section-label">Лимиты зон</Text>
          <div className="menu-card">
            {ALL_ZONES.map((zone, idx) => {
              const info = ZONE_INFO[zone]
              return (
                <div key={zone}>
                  <div className="menu-limit-row">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
                        {info.title.replace('\n', ' ')}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                        {info.subtitle}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Button
                        size="small"
                        className="stepper-btn"
                        disabled={localLimits[zone] <= 1}
                        onClick={() => handleLimitChange(zone, localLimits[zone] - 1)}
                      >−</Button>
                      <InputNumber
                        min={1} max={30}
                        value={localLimits[zone]}
                        onChange={v => handleLimitChange(zone, v)}
                        size="small"
                        suffix="мин"
                        style={{ width: 90 }}
                        styles={{ input: { textAlign: 'center', fontWeight: 600 } }}
                      />
                      <Button
                        size="small"
                        className="stepper-btn"
                        disabled={localLimits[zone] >= 30}
                        onClick={() => handleLimitChange(zone, localLimits[zone] + 1)}
                      >+</Button>
                    </div>
                  </div>
                  {idx < ALL_ZONES.length - 1 && (
                    <Divider style={{ margin: '0', borderColor: 'rgba(255,255,255,0.05)' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Warn threshold */}
        <div className="menu-section">
          <Text className="menu-section-label">Порог предупреждения</Text>
          <div className="menu-card menu-card--pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>Оранжевый при</span>
              <span style={{ color: '#f97316', fontWeight: 700, fontSize: 18 }}>
                {Math.round(settings.warnPercent * 100)}%
              </span>
            </div>
            <Slider
              min={60} max={90} step={5}
              value={Math.round(settings.warnPercent * 100)}
              onChange={v => onUpdateSettings({ warnPercent: v / 100 })}
              tooltip={{ formatter: v => `${v}%` }}
              styles={{
                track: { background: 'linear-gradient(90deg, #f97316, #ef4444)' },
                rail: { background: 'rgba(255,255,255,0.08)' },
              }}
            />
          </div>
        </div>

        {/* Theme */}
        <div className="menu-section">
          <Text className="menu-section-label">Тема оформления</Text>
          <Segmented
            block
            value={settings.theme}
            onChange={v => { tapVibrate(); onUpdateSettings({ theme: v as AppSettings['theme'] }) }}
            options={[
              { label: 'Системная', value: 'system' },
              { label: 'Светлая', value: 'light' },
              { label: 'Тёмная', value: 'dark' },
            ]}
            style={{ width: '100%' }}
          />
        </div>

        {/* Reset */}
        <div className="menu-section">
          <Button
            danger
            block
            size="large"
            icon={<RestFilled />}
            onClick={() => { resetVibrate(); setConfirmReset(true) }}
            style={{
              borderRadius: 14,
              height: 52,
              fontWeight: 600,
              background: 'rgba(239,68,68,0.08)',
              borderColor: 'rgba(239,68,68,0.3)',
            }}
          >
            Сбросить настройки
          </Button>
        </div>
      </Drawer>

      <Modal
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onOk={handleResetDefaults}
        okText="Сбросить"
        cancelText="Отменить"
        okButtonProps={{ danger: true }}
        title="Сбросить настройки?"
        centered
        styles={{
          content: { background: '#1a1a24', borderRadius: 20 },
          header: { background: '#1a1a24' },
          footer: { background: '#1a1a24' },
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>
          Все лимиты и пороги вернутся к значениям по умолчанию.
        </p>
      </Modal>
    </>
  )
}
