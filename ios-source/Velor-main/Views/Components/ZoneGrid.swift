//
//  ZoneGrid.swift
//  Velor
//
//  Created by Shatilovich.R on 12.12.2025.
//

import SwiftUI

struct ZoneGrid: View {
    let settings: AppSettings
    let items: [Zone: ZoneStopwatch]
    let onTapZone: (Zone) -> Void
    let onLongPressZone: (Zone) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            SectionBlock(title: "Ресницы") {
                TwoCardsRow(
                    left: .lashLeft,
                    right: .lashRight,
                    settings: settings,
                    items: items,
                    onTapZone: onTapZone
                )
            }
            
            SectionBlock(title: "Брови") {
                TwoCardsRow(
                    left: .browLeft,
                    right: .browRight,
                    settings: settings,
                    items: items,
                    onTapZone: onTapZone
                )
            }
        }
        .padding(.top, 4)
    }
}

struct SectionBlock<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(.primary)
                .padding(.horizontal, 2)
                .padding(.bottom, 2)
            
            content
        }
    }
}

struct TwoCardsRow: View {
    let left: Zone
    let right: Zone
    let settings: AppSettings
    let items: [Zone: ZoneStopwatch]
    let onTapZone: (Zone) -> Void
    
    var body: some View {
        HStack(spacing: 14) {
            card(left)
            card(right)
        }
    }
    
    @ViewBuilder
    private func card(_ zone: Zone) -> some View {
        let sw = items[zone] ?? ZoneStopwatch()
        let status = settings.status(for: zone, sw: sw)
        let limit = settings.limitSeconds(for: zone)
        let progress = settings.progress(for: zone, sw: sw)
        
        ZoneCard(
            zone: zone,
            elapsed: sw.elapsedSeconds,
            limit: limit,
            progress: progress,
            status: status,
            isRunning: sw.isRunning,
            onTap: { onTapZone(zone) },
            onLongPress: { onLongPressZone(zone) }
        )
    }
}
