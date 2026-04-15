import SwiftUI

struct ContentView: View {
    @Environment(\.scenePhase) private var scenePhase
    
    @StateObject private var store = StopwatchesStore()
    @State private var settings = AppSettings()
    
    @State private var showMenu = false
    @State private var appTheme: String = UserDefaults.standard.string(forKey: "appTheme") ?? "system"
    @State private var warnPercent: Double = {
        let v = UserDefaults.standard.double(forKey: "warnPercent")
        return v == 0 ? 0.8 : v
    }()
    @State private var confirmResetAll = false
    
    private var effectiveColorScheme: ColorScheme? {
        switch appTheme {
        case "light": return .light
        case "dark":  return .dark
        default:      return nil
        }
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                AppColors.backgroundPrimary(for: (effectiveColorScheme ?? .light))
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        ZoneGrid(
                            settings: settings,
                            items: store.items,
                            onTapZone: { zone in
                                Haptics.tap()
                                store.toggle(zone)
                            },
                            onLongPressZone: { zone in
                                guard (store.items[zone] ?? ZoneStopwatch()).isRunning else { return }
                                Haptics.resetTap()
                                store.reset(zone)
                            }
                        )
                        
                        pauseButton
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Velor")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    HeaderIconButton(systemName: "arrow.counterclockwise", role: .destructive, tint: .primary) {
                        Haptics.resetTap()
                        confirmResetAll = true
                    }
                    .labelStyle(.iconOnly)
                }
                ToolbarSpacer(placement: .topBarTrailing)
                ToolbarItem(placement: .topBarTrailing) {
                    HeaderIconButton(systemName: "gearshape") {
                        Haptics.tap()
                        showMenu = true
                    }
                    .labelStyle(.iconOnly)
                }
            }
        }
        .sheet(isPresented: $showMenu) {
            MenuView(
                warnPercent: Binding(
                    get: { warnPercent },
                    set: { newValue in
                        warnPercent = newValue
                        UserDefaults.standard.set(newValue, forKey: "warnPercent")
                        settings.warnPercent = newValue
                        store.settingsProvider = { settings }
                    }
                ),
                appTheme: Binding(
                    get: { appTheme },
                    set: { newValue in
                        appTheme = newValue
                        UserDefaults.standard.set(newValue, forKey: "appTheme")
                    }
                ),
                getLimitSeconds: { zone in
                    settings.limitSeconds(for: zone)
                },
                setLimitMinutes: { zone, minutes in
                    let seconds = max(60, minutes * 60)
                    settings.setLimitSeconds(seconds, for: zone)
                    store.settingsProvider = { settings }
                }
            )
        }
        .alert("Сбросить все таймеры?", isPresented: $confirmResetAll) {
            Button("Отменить", role: .cancel) {}
            Button("Сбросить", role: .destructive) {
                Haptics.error()
                store.resetAll()
            }
        } message: {
            Text("Все 4 зоны будут обнулены. Это действие нельзя отменить.")
        }
        .preferredColorScheme(effectiveColorScheme)
        .onAppear {
            settings.warnPercent = warnPercent
            store.settingsProvider = { settings }
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .inactive, .background:
                store.appWillResignActive()
            case .active:
                store.appDidBecomeActive()
            @unknown default:
                break
            }
        }
    }
}

private extension ContentView {
    @ViewBuilder
    var pauseButton: some View {
        let hasRunning = store.items.values.contains(where: { $0.isRunning })
        if hasRunning {
            if #available(iOS 26.0, *) {
                let glassStyle: Glass = .regular
                Button("Пауза", systemImage: "pause.fill") {
                    Haptics.pause()
                    store.pauseAll()
                }
                .frame(maxWidth: .infinity)
                .buttonStyle(.glass(glassStyle))
                .controlSize(.extraLarge)
                .buttonBorderShape(.automatic)
            } else {
                Button {
                    Haptics.pause()
                    store.pauseAll()
                } label: {
                    Label("Пауза", systemImage: "pause.fill")
                        .font(.system(size: 17, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.primary)
                .background(pauseButtonBackground)
                .overlay(pauseButtonStroke)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .padding(.horizontal, 2)
            }
        }
    }

    @ViewBuilder
    var pauseButtonBackground: some View {
        let shape = RoundedRectangle(cornerRadius: 16, style: .continuous)
        if #available(iOS 26.0, *) {
            shape
                .fill(AppColors.cardSurface(for: effectiveColorScheme ?? .light))
                .overlay {
                    shape
                        .fill(.clear)
                        .glassEffect(.regular.interactive(), in: shape)
                }
        } else {
            shape.fill(.ultraThinMaterial)
        }
    }

    var pauseButtonStroke: some View {
        RoundedRectangle(cornerRadius: 16, style: .continuous)
            .stroke(AppColors.strokeSeparatorSubtle(), lineWidth: AppColors.strokeWidthHairline)
    }
}

#Preview {
    ContentView()
        .preferredColorScheme(.dark)
}
