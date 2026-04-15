import Foundation

struct ZoneStopwatch {
    var elapsedSeconds: Int = 0
    var isRunning: Bool = false

    /// When the timer started (running state). Nil when paused/idle.
    var startedAt: Date? = nil
    /// Snapshot of elapsedSeconds at the moment of start/resume.
    var baseElapsedSeconds: Int = 0

    mutating func reset() {
        elapsedSeconds = 0
        isRunning = false
        startedAt = nil
        baseElapsedSeconds = 0
    }
}
