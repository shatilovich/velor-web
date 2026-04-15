import SwiftUI
import UserNotifications

@main
struct VelorApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil
    ) -> Bool {
        // ✅ ВАЖНО: Запросить разрешения при старте
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                print("✅ Уведомления разрешены")
            } else {
                print("❌ Уведомления запрещены: \(error?.localizedDescription ?? "нет ошибки")")
            }
        }
        
        // ✅ Установить делегат
        UNUserNotificationCenter.current().delegate = self
        
        return true
    }
}

// ✅ КРИТИЧНО: Реализовать делегат для показа уведомлений когда приложение на переднем плане
extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Показывать уведомления даже когда приложение открыто
        completionHandler([.banner, .sound, .badge])
    }
}
