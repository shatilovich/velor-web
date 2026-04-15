//
//  ZoneCard.swift
//  Velor
//
//  Created by Shatilovich.R on 12.12.2025.
//

import SwiftUI

struct ZoneCard: View {
    let zone: Zone
    let elapsed: Int
    let limit: Int
    let progress: Double
    let status: ZoneStatus
    let isRunning: Bool
    let onTap: () -> Void
    let onLongPress: () -> Void

    @State private var isPressing = false
    @State private var didTriggerLongPress = false
    @State private var shouldPulse = false
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        Button {
            if didTriggerLongPress {
                didTriggerLongPress = false
            } else {
                isPressing = false
                onTap()
            }
        } label: {
            ZStack {
                let shape = RoundedRectangle(cornerRadius: 18, style: .continuous)
                
                if #available(iOS 26.0, *) {
                    shape
                        .fill(AppColors.cardSurface(for: scheme))
                        .overlay {
                            shape
                                .fill(.clear)
                                .glassEffect(.regular.interactive(), in: shape)
                        }
                        .overlay(
                            shape.stroke(status.stroke(for: scheme), lineWidth: AppColors.strokeWidthAccent)
                        )
                } else {
                    shape
                        .fill(AppColors.cardSurface(for: scheme))
                        .overlay(
                            shape.stroke(AppColors.strokeSeparatorSubtle(), lineWidth: AppColors.strokeWidthHairline)
                        )
                        .overlay(
                            shape.stroke(status.stroke(for: scheme), lineWidth: AppColors.strokeWidthAccent)
                        )
                }
                
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(zone.title)
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(.primary)
                                .multilineTextAlignment(.leading)
                        }
                        Spacer()
                        Ring(progress: progress, stroke: status.stroke(for: scheme))
                            .frame(width: 40, height: 40)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(timeString(elapsed))
                            .font(.system(size: 22, weight: .semibold, design: .monospaced))
                            .foregroundStyle(.primary)
                        
                        Text(statusLine(elapsed: elapsed, limit: limit, status: status))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(status.label(for: scheme))
                    }
                }
                .padding(14)
            }
            .frame(height: 148)
        }
        .buttonStyle(.plain)
        .scaleEffect(isPressing ? 0.97 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressing)
        .scaleEffect(shouldPulse ? 1.05 : 1.0)
        .animation(
            shouldPulse
                ? .easeInOut(duration: 0.5).repeatForever(autoreverses: true)
                : .default,
            value: shouldPulse
        )
        .onChange(of: status) { _, newStatus in
            withAnimation {
                shouldPulse = newStatus == .danger
            }
        }
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressing = true }
                .onEnded { _ in isPressing = false }
        )
        .simultaneousGesture(
            LongPressGesture(minimumDuration: 0.6)
                .onEnded { _ in
                    didTriggerLongPress = true
                    isPressing = false
                    onLongPress()
                }
        )
    }
    
    private func timeString(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        return String(format: "%d:%02d", m, s)
    }
    
    private func statusLine(elapsed: Int, limit: Int, status: ZoneStatus) -> String {
        let limitText = timeString(limit)
        switch status {
        case .idle:
            return "Лимит \(limitText)"
        case .paused:
            return "Пауза · лимит \(limitText)"
        case .ok:
            return "Идёт · лимит \(limitText)"
        case .warn:
            return "Почти лимит · \(limitText)"
        case .danger:
            return "Время вышло · \(limitText)"
        }
    }
}
