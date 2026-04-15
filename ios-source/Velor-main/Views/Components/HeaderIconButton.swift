import SwiftUI

struct HeaderIconButton: View {
    let systemName: String
    let role: ButtonRole?
    let tint: Color?
    let action: () -> Void

    @State private var isPressing = false
    @Environment(\.colorScheme) private var scheme

    init(systemName: String, role: ButtonRole? = nil, tint: Color? = nil, action: @escaping () -> Void) {
        self.systemName = systemName
        self.role = role
        self.tint = tint
        self.action = action
    }

    var body: some View {
        Button(role: role) {
            isPressing = false
            action()
        } label: {
            ZStack {
                let shape = RoundedRectangle(cornerRadius: 12, style: .continuous)

                if #available(iOS 26.0, *) {
                    shape
                        .fill(AppColors.cardSurface(for: scheme).opacity(0.001)) // keep visually minimal, keep hit area
                        .overlay {
                            shape
                                .fill(.clear)
                                .glassEffect(.regular.interactive(), in: shape)
                                .opacity(0) // visually hidden by default for clean top bar
                        }
                } else {
                    shape
                        .fill(Color.clear)
                }

                Image(systemName: systemName)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(foregroundStyle)
                    .frame(width: 24, height: 24)
            }
            .frame(width: 44, height: 44)
        }
        .buttonStyle(.plain)
        .scaleEffect(isPressing ? 0.94 : 1.0)
        .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    guard !isPressing else { return }
                    isPressing = true
                }
                .onEnded { _ in
                    isPressing = false
                }
        )
        .accessibilityLabel(accessibilityLabel)
    }

    private var foregroundStyle: Color {
        if let tint { return tint }
        if role == .destructive { return .red }
        return .primary
    }

    private var accessibilityLabel: String {
        switch systemName {
        case "gearshape": return "Настройки"
        case "arrow.counterclockwise": return "Сбросить"
        default: return systemName
        }
    }
}

#Preview {
    HStack(spacing: 12) {
        HeaderIconButton(systemName: "arrow.counterclockwise", role: .destructive, tint: .primary) { }
        HeaderIconButton(systemName: "gearshape") { }
    }
    .padding()
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}
