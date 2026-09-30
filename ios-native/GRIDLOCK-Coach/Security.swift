import Foundation

/// Input limits, sanitization, and validation for public release.
enum GridSecurity {
    enum Limits {
        static let shortText = 64
        static let name = 48
        static let code = 24
        static let message = 500
        static let notes = 400
        static let teamCode = 16
        static let eventsCoachMax = 100
        static let pressureTestCooldown: TimeInterval = 60
        static let scoreMin = 1
        static let scoreMax = 5
        static let pointMin = 1
        static let pointMax = 99
    }

    // MARK: - Sanitize

    static func clip(_ raw: String, max: Int) -> String {
        let t = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard t.count > max else { return t }
        return String(t.prefix(max))
    }

    /// Strip control characters that can break UI / logs.
    static func sanitize(_ raw: String, max: Int) -> String {
        let cleaned = raw.unicodeScalars
            .filter { scalar in
                if scalar == "\n" || scalar == "\t" { return true }
                return !CharacterSet.controlCharacters.contains(scalar)
            }
            .map(String.init)
            .joined()
        return clip(cleaned, max: max)
    }

    static func isNonEmpty(_ raw: String, max: Int) -> Bool {
        !sanitize(raw, max: max).isEmpty
    }

    /// Team join codes: uppercase alphanumeric + hyphen only.
    static func teamCode(_ raw: String) -> String {
        let up = raw.uppercased()
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-"))
        let filtered = String(up.unicodeScalars.filter { allowed.contains($0) })
        return clip(filtered, max: Limits.teamCode)
    }

    // MARK: - Validation (user-facing errors)

    enum Field: String {
        case name, playerName, teamName, message, notes, code
        case score, point, dates, eventName
    }

    struct Issue: Identifiable, Equatable {
        let id = UUID()
        let field: Field
        let message: String
    }

    enum Result {
        case ok
        case fail([Issue])

        var isOK: Bool {
            if case .ok = self { return true }
            return false
        }

        var messages: [String] {
            if case .fail(let issues) = self { return issues.map(\.message) }
            return []
        }

        var firstMessage: String? { messages.first }
    }

    static func hasLetterOrNumber(_ s: String) -> Bool {
        s.unicodeScalars.contains { CharacterSet.alphanumerics.contains($0) }
    }

    static func requireName(_ raw: String, label: String = "Name") -> Result {
        let v = sanitize(raw, max: Limits.name)
        if v.isEmpty { return .fail([Issue(field: .name, message: "\(label) is required.")]) }
        if v.count < 2 { return .fail([Issue(field: .name, message: "\(label) is too short.")]) }
        if !hasLetterOrNumber(v) {
            return .fail([Issue(field: .name, message: "\(label) needs letters or numbers.")])
        }
        return .ok
    }

    static func requireMessage(_ raw: String) -> Result {
        let v = sanitize(raw, max: Limits.message)
        if v.isEmpty { return .fail([Issue(field: .message, message: "Message can’t be empty.")]) }
        return .ok
    }

    static func requireCode(_ raw: String) -> Result {
        let v = sanitize(raw, max: Limits.code)
        if v.isEmpty { return .fail([Issue(field: .code, message: "Code word is required.")]) }
        return .ok
    }

    static func score(_ value: Int) -> Result {
        if value < Limits.scoreMin || value > Limits.scoreMax {
            return .fail([Issue(field: .score, message: "Score must be \(Limits.scoreMin)–\(Limits.scoreMax).")])
        }
        return .ok
    }

    static func pointNumber(_ value: Int) -> Result {
        if value < Limits.pointMin || value > Limits.pointMax {
            return .fail([Issue(field: .point, message: "Point must be \(Limits.pointMin)–\(Limits.pointMax).")])
        }
        return .ok
    }

    /// ISO dates YYYY-MM-DD; end must be >= start.
    static func dateRange(start: String, end: String) -> Result {
        let s = sanitize(start, max: 10)
        let e = sanitize(end, max: 10)
        let fmt = DateFormatter()
        fmt.calendar = Calendar(identifier: .gregorian)
        fmt.locale = Locale(identifier: "en_US_POSIX")
        fmt.timeZone = TimeZone(secondsFromGMT: 0)
        fmt.dateFormat = "yyyy-MM-dd"
        guard let sd = fmt.date(from: s) else {
            return .fail([Issue(field: .dates, message: "Start date is invalid.")])
        }
        guard let ed = fmt.date(from: e) else {
            return .fail([Issue(field: .dates, message: "End date is invalid.")])
        }
        if ed < sd {
            return .fail([Issue(field: .dates, message: "End date can’t be before start date.")])
        }
        return .ok
    }

    static func combine(_ parts: Result...) -> Result {
        var issues: [Issue] = []
        for p in parts {
            if case .fail(let list) = p { issues.append(contentsOf: list) }
        }
        return issues.isEmpty ? .ok : .fail(issues)
    }

    // MARK: - Rate limit

    private static var lastPressureAt: Date?
    static func allowPressureTest() -> Bool {
        let now = Date()
        if let last = lastPressureAt, now.timeIntervalSince(last) < Limits.pressureTestCooldown {
            return false
        }
        lastPressureAt = now
        return true
    }
}
