import Foundation
import Combine
import UserNotifications

@MainActor
final class StopwatchesStore: ObservableObject {
    @Published private(set) var items: [Zone: ZoneStopwatch] = {
        var dict: [Zone: ZoneStopwatch] = [:]
        Zone.allCases.forEach { dict[$0] = ZoneStopwatch() }
        return dict
    }()

    private var ticker: AnyCancellable?

    // Settings provider injected from ContentView
    var settingsProvider: () -> AppSettings = { AppSettings() }

    // Cache last statuses to avoid repeated haptics
    private var lastStatus: [Zone: ZoneStatus] = [:]
    private let didRequestNotifKey = "didRequestNotificationPermission"

    init() {
        loadFromDisk()
        // Seed status cache without haptics on launch/restore
        primeStatusCache(settings: settingsProvider())
        // Catch up elapsed for running zones and start/stop ticker accordingly
        refreshRunningElapsed(now: Date())
        syncTicker()
        requestNotificationAuthorizationIfNeeded()
    }

    func toggle(_ zone: Zone) {
        guard var sw = items[zone] else { return }

        if sw.isRunning {
            if let startedAt = sw.startedAt {
                let delta = Int(Date().timeIntervalSince(startedAt))
                sw.elapsedSeconds = max(0, sw.baseElapsedSeconds + delta)
            }
            sw.isRunning = false
            sw.startedAt = nil
        } else {
            sw.isRunning = true
            sw.baseElapsedSeconds = sw.elapsedSeconds
            sw.startedAt = Date()
        }

        items[zone] = sw
        syncTicker()
        primeStatusCache(settings: settingsProvider())
        saveToDisk()
    }

    func reset(_ zone: Zone) {
        guard var sw = items[zone] else { return }
        sw.reset()
        items[zone] = sw
        syncTicker()
        handleStatusTransitions(settings: settingsProvider())
        SoundEffect.play(.warning)
        saveToDisk()
    }

    func resetAll() {
        Zone.allCases.forEach { z in
            var sw = items[z] ?? ZoneStopwatch()
            sw.reset()
            items[z] = sw
        }
        syncTicker()
        handleStatusTransitions(settings: settingsProvider())
        saveToDisk()
    }

    func pauseAll() {
        // Freeze current elapsed for all running timers first
        refreshRunningElapsed(now: Date())

        for z in Zone.allCases {
            guard var sw = items[z], sw.isRunning else { continue }
            sw.isRunning = false
            sw.startedAt = nil
            sw.baseElapsedSeconds = sw.elapsedSeconds
            items[z] = sw
        }

        syncTicker()
        primeStatusCache(settings: settingsProvider())
        saveToDisk()
    }

    func appDidBecomeActive() {
        refreshRunningElapsed(now: Date())
        primeStatusCache(settings: settingsProvider())
        syncTicker()
        handleStatusTransitions(settings: settingsProvider())
    }

    func appWillResignActive() {
        refreshRunningElapsed(now: Date())
        primeStatusCache(settings: settingsProvider())
        stop()
        saveToDisk()
    }

    // MARK: - Ticker

    private func syncTicker() {
        let hasRunning = items.values.contains(where: { $0.isRunning })
        if hasRunning {
            startIfNeeded()
        } else {
            stop()
        }
    }

    private func startIfNeeded() {
        guard ticker == nil else { return }

        ticker = Timer.publish(every: 1, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] now in
                guard let self else { return }

                for z in Zone.allCases {
                    guard var sw = self.items[z], sw.isRunning, let startedAt = sw.startedAt else { continue }
                    let delta = Int(now.timeIntervalSince(startedAt))
                    sw.elapsedSeconds = max(0, sw.baseElapsedSeconds + delta)
                    self.items[z] = sw
                }
                self.handleStatusTransitions(settings: self.settingsProvider())
            }
    }

    private func stop() {
        ticker?.cancel()
        ticker = nil
    }

    // MARK: - Status transitions

    private func handleStatusTransitions(settings: AppSettings) {
        for z in Zone.allCases {
            let sw = items[z] ?? ZoneStopwatch()

            // Compute new status and store it after checks
            let newStatus = settings.status(for: z, sw: sw)
            defer { lastStatus[z] = newStatus }

            // Do not spam haptics while a zone is not running
            guard sw.isRunning else { continue }

            let oldStatus = lastStatus[z]
            guard oldStatus != newStatus else { continue }

            if newStatus == .warn {
                Haptics.warning()
                sendNotification(
                    title: "Внимание",
                    body: "\(z.title.replacingOccurrences(of: "\n", with: " ")) — приближается лимит"
                )
            } else if newStatus == .danger {
                Haptics.error()
                sendNotification(
                    title: "Лимит превышен",
                    body: "\(z.title.replacingOccurrences(of: "\n", with: " ")) — время вышло!"
                )
            }
        }
    }

    // MARK: - Persistence

    private func loadFromDisk() {
        guard let data = UserDefaults.standard.data(forKey: PersistKeys.stopwatchesState) else { return }
        do {
            let decoded = try JSONDecoder().decode(PersistedState.self, from: data)
            var dict: [Zone: ZoneStopwatch] = [:]
            for z in Zone.allCases {
                if let p = decoded.items[z.rawValue] {
                    dict[z] = ZoneStopwatch(
                        elapsedSeconds: max(0, p.elapsedSeconds),
                        isRunning: p.isRunning,
                        startedAt: p.startedAt,
                        baseElapsedSeconds: max(0, p.baseElapsedSeconds)
                    )
                } else {
                    dict[z] = ZoneStopwatch()
                }
            }
            items = dict
        } catch {
            // Ignore broken cache
        }
    }

    private func saveToDisk() {
        var payload: [String: PersistedStopwatch] = [:]
        for z in Zone.allCases {
            let sw = items[z] ?? ZoneStopwatch()
            payload[z.rawValue] = PersistedStopwatch(
                elapsedSeconds: sw.elapsedSeconds,
                isRunning: sw.isRunning,
                startedAt: sw.startedAt,
                baseElapsedSeconds: sw.baseElapsedSeconds
            )
        }
        do {
            let data = try JSONEncoder().encode(PersistedState(items: payload))
            UserDefaults.standard.set(data, forKey: PersistKeys.stopwatchesState)
        } catch {
            // Ignore encoding errors
        }
    }

    // MARK: - Helpers

    private func refreshRunningElapsed(now: Date = Date()) {
        for z in Zone.allCases {
            guard var sw = items[z], sw.isRunning, let startedAt = sw.startedAt else { continue }
            let delta = Int(now.timeIntervalSince(startedAt))
            sw.elapsedSeconds = max(0, sw.baseElapsedSeconds + delta)
            items[z] = sw
        }
    }

    private func primeStatusCache(settings: AppSettings) {
        for z in Zone.allCases {
            let sw = items[z] ?? ZoneStopwatch()
            lastStatus[z] = settings.status(for: z, sw: sw)
        }
    }

    private func requestNotificationAuthorizationIfNeeded() {
        // Ask once; if user changes it later, they can enable in Settings
        if UserDefaults.standard.bool(forKey: didRequestNotifKey) { return }
        UserDefaults.standard.set(true, forKey: didRequestNotifKey)

        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in
            // Intentionally ignore result; app will behave gracefully without notifications.
        }
    }

    private func sendNotification(title: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil // immediate
        )

        UNUserNotificationCenter.current().add(request)
    }
}
