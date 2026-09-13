import Foundation

/// Runtime defenses for high-volume abuse classes.
/// Raises cost of automated abuse on-device. Not a claim of immunity.
enum AttackDefense {

    private static let lock = NSLock()
    private static var buckets: [String: [Date]] = [:]
    private static var blockedUntil: [String: Date] = [:]
    private static var strikeCount: [String: Int] = [:]

    // MARK: - Sliding window + progressive backoff

    /// Allow action or return false. Repeated violations extend a cool-down.
    static func allow(action: String, limit: Int, window: TimeInterval) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        let now = Date()

        if let until = blockedUntil[action], until > now {
            return false
        }

        var times = (buckets[action] ?? []).filter { now.timeIntervalSince($0) < window }
        if times.count >= limit {
            let strikes = (strikeCount[action] ?? 0) + 1
            strikeCount[action] = strikes
            // Progressive cool-down: 5s, 15s, 30s, 60s…
            let cool = min(60.0, 5.0 * Double(strikes))
            blockedUntil[action] = now.addingTimeInterval(cool)
            buckets[action] = times
            return false
        }

        times.append(now)
        buckets[action] = times
        // Decay strikes on success
        if let s = strikeCount[action], s > 0 {
            strikeCount[action] = max(0, s - 1)
        }
        return true
    }

    enum Action {
        static let tallySave = "save.tally"
        static let assessSave = "save.assess"
        static let scoutSave = "save.scout"
        static let messageSend = "save.message"
        static let teamCreate = "save.team"
        static let playerAdd = "save.player"
        static let eventAdd = "save.event"
        static let codeSave = "save.code"
        static let feedRefresh = "feed.refresh"
        static let pressure = "diag.pressure"
        static let layoutSwitch = "ui.layout"
    }

    static func allowSave(_ action: String) -> Bool {
        switch action {
        case Action.tallySave, Action.scoutSave, Action.assessSave:
            return allow(action: action, limit: 60, window: 60)
        case Action.messageSend:
            return allow(action: action, limit: 20, window: 60)
        case Action.eventAdd:
            return allow(action: action, limit: 5, window: 60)
        case Action.teamCreate:
            return allow(action: action, limit: 3, window: 300)
        case Action.playerAdd:
            return allow(action: action, limit: 30, window: 60)
        case Action.codeSave:
            return allow(action: action, limit: 30, window: 60)
        case Action.feedRefresh:
            return allow(action: action, limit: 4, window: 60)
        case Action.pressure:
            return allow(action: action, limit: 1, window: 120)
        case Action.layoutSwitch:
            return allow(action: action, limit: 30, window: 60)
        default:
            return allow(action: action, limit: 40, window: 60)
        }
    }

    static let rateLimitMessage = "Too many actions — wait a moment and try again."

    // MARK: - Storage ceilings

    enum Caps {
        static let tallyEntries = 3_000
        static let scoutEntries = 1_500
        static let assessEntries = 1_500
        static let messages = 800
        static let plays = 800
        static let playersPerTeam = 60
        static let codes = 150
        static let coachEvents = 75
    }

    // MARK: - Network feed safety

    static func isSafeFeedURL(_ url: URL) -> Bool {
        guard let scheme = url.scheme?.lowercased(), scheme == "https" else { return false }
        guard let host = url.host?.lowercased(), !host.isEmpty else { return false }
        let blocked: Set<String> = [
            "localhost", "127.0.0.1", "0.0.0.0", "::1",
            "metadata.google.internal", "169.254.169.254",
            "metadata", "internal",
        ]
        if blocked.contains(host) { return false }
        if host.hasSuffix(".local") || host.hasSuffix(".internal") { return false }
        if host.hasPrefix("10.") || host.hasPrefix("192.168.") || host.hasPrefix("172.") {
            // Block typical private LAN targets from a compromised feed constant
            return false
        }
        return true
    }

    static func sanitizedFeedRequest(url: URL, timeout: TimeInterval = 12) -> URLRequest? {
        guard isSafeFeedURL(url) else { return nil }
        var req = URLRequest(url: url, timeoutInterval: timeout)
        req.setValue("GRIDLOCK-Coach/1.0 (UPRA; event-catalog)", forHTTPHeaderField: "User-Agent")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.httpMethod = "GET"
        return req
    }

    static let maxRemotePayloadBytes = 256_000  // 256 KB hard cap

    static func acceptPayload(_ data: Data) -> Bool {
        data.count > 2 && data.count <= maxRemotePayloadBytes
    }

    /// Reject non-JSON-looking payloads early.
    static func looksLikeJSON(_ data: Data) -> Bool {
        guard let s = String(data: data.prefix(32), encoding: .utf8)?
            .trimmingCharacters(in: .whitespacesAndNewlines),
              let c = s.first else { return false }
        return c == "{" || c == "["
    }
}
