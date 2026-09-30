import Foundation
import SwiftUI

@Observable
final class AppState {
    // MARK: - Navigation
    var selectedTab: AppTab = .playbook

    // MARK: - Sheets / UI
    var showSettings = false
    var showLayoutPicker = false
    var showCallPlay = false
    var showJoinTeam = false

    // MARK: - Field / session
    var selectedLayoutKey: String = "cin"
    var selectedPlayId: String? = nil
    var calledPlayId: String? = nil

    // MARK: - Team session (mirrors web localStorage team)
    var activeTeamCode: String? = nil
    var isCoach: Bool = true
    var coachName: String = "Coach"

    // MARK: - Theme
    var themeMode: ThemeMode = {
        if let raw = UserDefaults.standard.string(forKey: "gl.themeMode"),
           let mode = ThemeMode(rawValue: raw) {
            return mode
        }
        return .night
    }() {
        didSet {
            UserDefaults.standard.set(themeMode.rawValue, forKey: "gl.themeMode")
            Task { @MainActor in GLTheme.mode = themeMode }
        }
    }

    // MARK: - Feature flags (Coach edition is unlocked for MVP)
    var isPaying: Bool = true
    var edition: String = "coach"

    // MARK: - Helpers
    var hasTeam: Bool { activeTeamCode != nil && !(activeTeamCode?.isEmpty ?? true) }
}

enum AppTab: String, CaseIterable, Identifiable, Hashable {
    case playbook
    case tally
    case scout
    case sightlines
    case walk
    case lineups
    case movement
    case assess
    case codes
    case team
    case messages
    case nexus

    var id: String { rawValue }

    /// Main bottom tabs (coach flow)
    static var primaryTabs: [AppTab] {
        [.playbook, .tally, .scout, .sightlines]
    }

    /// Everything else under More
    static var moreTabs: [AppTab] {
        [.walk, .lineups, .movement, .assess, .codes, .team, .messages, .nexus]
    }

    var label: String {
        switch self {
        case .playbook:   return "Playbook"
        case .tally:      return "Tally"
        case .scout:      return "Scout"
        case .sightlines: return "Sightlines"
        case .walk:       return "Walk"
        case .lineups:    return "Lineups"
        case .movement:   return "Movement"
        case .assess:     return "Assess"
        case .codes:      return "Codes"
        case .team:       return "Team"
        case .messages:   return "Messages"
        case .nexus:      return "Nexus"
        }
    }

    /// One-line coach meaning
    var coachHint: String {
        switch self {
        case .playbook:   return "Call the break for this point"
        case .tally:      return "Log who went out"
        case .scout:      return "What the other team ran"
        case .sightlines: return "See clear shots from a bunker"
        case .walk:       return "Field walk notes"
        case .lineups:    return "Who’s on the point"
        case .movement:   return "Bunker-to-bunker moves"
        case .assess:     return "Grade a player"
        case .codes:      return "Team code words"
        case .team:       return "Roster and join code"
        case .messages:   return "Notes to the squad"
        case .nexus:      return "App health and events"
        }
    }

    var systemImage: String {
        switch self {
        case .playbook:   return "map"
        case .tally:      return "list.number"
        case .scout:      return "binoculars"
        case .sightlines: return "eye"
        case .walk:       return "figure.walk"
        case .lineups:    return "person.3"
        case .movement:   return "arrow.triangle.swap"
        case .assess:     return "chart.bar"
        case .codes:      return "textformat"
        case .team:       return "person.2.badge.gearshape"
        case .messages:   return "bubble.left.and.bubble.right"
        case .nexus:      return "externaldrive"
        }
    }

    /// iPad sidebar sections
    static let primaryTabs: [AppTab] = [.playbook, .tally, .scout, .sightlines, .walk, .lineups, .movement, .assess, .codes]
    static let rosterTabs: [AppTab]  = [.team, .messages]
    static let systemTabs: [AppTab]  = [.nexus]
}

// Seed layout metadata (bunker coordinates come from HTML RAW_* in a later phase)
struct LayoutInfo: Identifiable, Hashable {
    let id: String
    let key: String
    let name: String
    let subtitle: String

    static let builtIn: [LayoutInfo] = [
        .init(id: "cin", key: "cin", name: "Cincinnati 2026", subtitle: "Cincinnati, OH · Jun 25–28"),
        .init(id: "sef", key: "sef", name: "Seffner 2026 · Summer Rumble E3", subtitle: "Thunder Valley, Seffner FL · Jul 24–26"),
        .init(id: "tex", key: "tex", name: "Paintball Texas Classic", subtitle: "GunzUp · verify on field walk"),
        .init(id: "eur", key: "eur", name: "NXL Europe 2026 · Dreux", subtitle: "Dreux, France · Sep 3–6"),
    ]
}
