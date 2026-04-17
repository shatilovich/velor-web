import {
  type AppSettings,
  type Zone,
  type ZoneStopwatch,
  ZONE_SECTIONS,
  getProgress,
  getStatus,
} from '../models/types'
import { ZoneCard } from './ZoneCard'

interface ZoneGridProps {
  settings: AppSettings
  items: Record<Zone, ZoneStopwatch>
  onTapZone: (zone: Zone) => void
  onLongPressZone: (zone: Zone) => void
}

function TwoCards({
  left, right, settings, items, onTapZone, onLongPressZone,
}: {
  left: Zone; right: Zone
  settings: AppSettings
  items: Record<Zone, ZoneStopwatch>
  onTapZone: (zone: Zone) => void
  onLongPressZone: (zone: Zone) => void
}) {
  return (
    <div className="two-cards-row">
      {[left, right].map(zone => {
        const sw = items[zone]
        const status = getStatus(zone, sw, settings)
        const limit = settings.limits[zone]
        const progress = getProgress(zone, sw, settings)
        return (
          <ZoneCard
            key={zone}
            zone={zone}
            elapsed={sw.elapsedSeconds}
            limit={limit}
            progress={progress}
            status={status}
            isRunning={sw.isRunning}
            onTap={() => onTapZone(zone)}
            onLongPress={() => onLongPressZone(zone)}
          />
        )
      })}
    </div>
  )
}

export function ZoneGrid({ settings, items, onTapZone, onLongPressZone }: ZoneGridProps) {
  return (
    <div className="zone-grid">
      {ZONE_SECTIONS.map(section => (
        <section key={section.title} className="section-block">
          <h2 className="section-title">{section.title}</h2>
          <TwoCards
            left={section.zones[0]}
            right={section.zones[1]}
            settings={settings}
            items={items}
            onTapZone={onTapZone}
            onLongPressZone={onLongPressZone}
          />
        </section>
      ))}
    </div>
  )
}
