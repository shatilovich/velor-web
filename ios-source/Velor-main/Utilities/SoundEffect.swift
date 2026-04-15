import AVFoundation

enum SoundEffect {
    case warning
    case danger

    var filename: String {
        switch self {
        case .warning: return "warning"
        case .danger: return "danger"
        }
    }

    static func play(_ effect: SoundEffect) {
        guard let url = Bundle.main.url(forResource: effect.filename, withExtension: "wav") else { return }
        var soundID: SystemSoundID = 0
        AudioServicesCreateSystemSoundID(url as CFURL, &soundID)
        AudioServicesPlaySystemSound(soundID)
    }
}
