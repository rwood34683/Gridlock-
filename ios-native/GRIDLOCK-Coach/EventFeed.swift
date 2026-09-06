import Foundation
import SwiftUI

// MARK: - Public event catalog (metadata — not bunker geometry)

struct GridEvent: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var league: String
    var startDate: String          // YYYY-MM-DD
    var endDate: String
    var city: String
    var region: String
    var country: String
    var layoutKey: String?
    var sourceURL: String?
    var source: String             // upra-feed | seed | coach

    var locationLine: String {
        [city, region, country].filter { !$0.isEmpty }.joined(separator: ", ")
    }
}

struct EventFeedPayload: Codable {
    var updatedAt: String
    var events: [GridEvent]
}

// MARK: - Feed + local coach submissions

/// Catalog = remote feed (optional) ∪ seed ∪ coach-added events.
/// Phones never scrape third-party sites; they only read your JSON + local storage.
@MainActor
@Observable
final class EventFeedService {
    static let shared = EventFeedService()

    /// Point at your CDN when ready. Until then refresh fails open to seed + coach list.
    static let feedURL = URL(string: "https://upra.example.com/gridlock/events.json")
        ?? URL(fileURLWithPath: "/dev/null")

    private(set) var remoteOrSeed: [GridEvent] = EventFeedService.seedEvents
    private(set) var coachEvents: [GridEvent] = []
    var lastRefresh: Date? = nil
    var lastError: String? = nil
    var isLoading = false

    /// Merged, de-duplicated by id (coach overrides seed/remote on same id).
    var events: [GridEvent] {
        var map: [String: GridEvent] = [:]
        for e in remoteOrSeed { map[e.id] = e }
        for e in coachEvents { map[e.id] = e }
        return Array(map.values)
    }

    var upcoming: [GridEvent] {
        let today = Self.dayString(from: Date())
        return events
            .filter { $0.endDate >= today }
            .sorted { $0.startDate < $1.startDate }
    }

    init() {
        coachEvents = loadCoachEvents()
    }

    // MARK: Refresh remote catalog

    func refresh() async {
        isLoading = true
        lastError = nil
        defer { isLoading = false }

        do {
            guard AttackDefense.allowSave(AttackDefense.Action.feedRefresh) else {
                lastError = AttackDefense.rateLimitMessage
                return
            }
            guard let req = AttackDefense.sanitizedFeedRequest(url: Self.feedURL) else {
                lastError = "Feed URL blocked (HTTPS only)."
                return
            }
            let (data, response) = try await URLSession.shared.data(for: req)
            guard AttackDefense.acceptPayload(data) else {
                lastError = "Feed payload rejected (size)."
                return
            }
            guard AttackDefense.looksLikeJSON(data) else {
                lastError = "Feed payload rejected (format)."
                return
            }
            if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
                throw URLError(.badServerResponse)
            }
            let payload = try JSONDecoder().decode(EventFeedPayload.self, from: data)
            remoteOrSeed = payload.events.isEmpty ? Self.seedEvents : payload.events
            lastRefresh = Date()
            persistRemoteCache(data)
            print("[GRIDLOCK] Event feed refreshed: \(payload.events.count) remote events")
        } catch {
            if let cached = loadRemoteCache() {
                remoteOrSeed = cached.events
                lastError = "Offline — using cached catalog."
            } else {
                remoteOrSeed = Self.seedEvents
                lastError = "Feed not live yet — showing built-in events. Add your own below."
            }
            print("[GRIDLOCK] Event feed: \(error)")
        }
    }

    // MARK: Coach-submitted events

    @discardableResult
    func addCoachEvent(
        name: String,
        league: String,
        startDate: String,
        endDate: String,
        city: String,
        region: String,
        country: String,
        layoutKey: String?
    ) -> GridEvent? {
        guard AttackDefense.allowSave(AttackDefense.Action.eventAdd) else { return nil }
        let trimmed = GridSecurity.sanitize(name, max: GridSecurity.Limits.name)
        guard !trimmed.isEmpty, !startDate.isEmpty, !endDate.isEmpty else { return nil }
        if coachEvents.count >= AttackDefense.Caps.coachEvents {
            // Drop oldest coach events to cap disk growth / abuse
            coachEvents = Array(coachEvents.prefix(AttackDefense.Caps.coachEvents - 1))
        }

        let event = GridEvent(
            id: "coach-\(UUID().uuidString.prefix(8))",
            name: trimmed,
            league: GridSecurity.sanitize(league.isEmpty ? "Local" : league, max: GridSecurity.Limits.shortText),
            startDate: startDate,
            endDate: endDate.isEmpty ? startDate : endDate,
            city: GridSecurity.sanitize(city, max: GridSecurity.Limits.shortText),
            region: GridSecurity.sanitize(region, max: GridSecurity.Limits.shortText),
            country: GridSecurity.sanitize(country.isEmpty ? "USA" : country, max: 32),
            layoutKey: layoutKey,
            sourceURL: nil,
            source: "coach"
        )
        coachEvents.insert(event, at: 0)
        persistCoachEvents()
        return event
    }

    func removeCoachEvent(id: String) {
        coachEvents.removeAll { $0.id == id && $0.source == "coach" }
        persistCoachEvents()
    }

    // MARK: Persistence

    private var coachURL: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("gridlock_coach_events.json")
    }

    private var remoteCacheURL: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("gridlock_events_remote.json")
    }

    private func persistCoachEvents() {
        guard let data = try? JSONEncoder().encode(coachEvents) else { return }
        try? GridProtection.writeProtected(data, to: coachURL)
    }

    private func loadCoachEvents() -> [GridEvent] {
        guard let data = try? Data(contentsOf: coachURL),
              let list = try? JSONDecoder().decode([GridEvent].self, from: data) else { return [] }
        return list
    }

    private func persistRemoteCache(_ data: Data) {
        try? GridProtection.writeProtected(data, to: remoteCacheURL)
    }

    private func loadRemoteCache() -> EventFeedPayload? {
        guard let data = try? Data(contentsOf: remoteCacheURL) else { return nil }
        return try? JSONDecoder().decode(EventFeedPayload.self, from: data)
    }

    static func dayString(from date: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    // MARK: Seed — major public events (editorial; update each season)

    static let seedEvents: [GridEvent] = [
        GridEvent(id: "nxl-2026-midwest", name: "NXL Midwest Open", league: "NXL",
                  startDate: "2026-06-25", endDate: "2026-06-28",
                  city: "Fairfield", region: "Ohio", country: "USA",
                  layoutKey: "cin", sourceURL: nil, source: "seed"),
        GridEvent(id: "nxl-2026-lonestar", name: "NXL Lone Star", league: "NXL",
                  startDate: "2026-09-17", endDate: "2026-09-20",
                  city: "Garland", region: "Texas", country: "USA",
                  layoutKey: nil, sourceURL: nil, source: "seed"),
        GridEvent(id: "nxl-2026-wc", name: "NXL World Cup 2026", league: "NXL",
                  startDate: "2026-11-11", endDate: "2026-11-15",
                  city: "Kissimmee", region: "Florida", country: "USA",
                  layoutKey: nil, sourceURL: nil, source: "seed"),
        GridEvent(id: "nxl-eu-2026", name: "NXL European Championships", league: "NXL Europe",
                  startDate: "2026-09-02", endDate: "2026-09-06",
                  city: "Dreux", region: "France", country: "FRA",
                  layoutKey: "eur", sourceURL: nil, source: "seed"),
        GridEvent(id: "icpl-2026-classic", name: "ICPL Classic Cup", league: "ICPL",
                  startDate: "2026-10-02", endDate: "2026-10-04",
                  city: "Chesapeake City", region: "Maryland", country: "USA",
                  layoutKey: nil, sourceURL: nil, source: "seed"),
        GridEvent(id: "icpl-2026-pitt", name: "ICPL Pittsburgh Open Classic", league: "ICPL",
                  startDate: "2026-07-31", endDate: "2026-08-02",
                  city: "McDonald", region: "Pennsylvania", country: "USA",
                  layoutKey: nil, sourceURL: nil, source: "seed"),
        GridEvent(id: "axl-2026-defy", name: "AXL Defy Invitational", league: "AXL",
                  startDate: "2026-08-15", endDate: "2026-08-16",
                  city: "Conway", region: "South Carolina", country: "USA",
                  layoutKey: nil, sourceURL: nil, source: "seed"),
        GridEvent(id: "sef-2026-rumble", name: "Summer Rumble E3", league: "Regional",
                  startDate: "2026-07-24", endDate: "2026-07-26",
                  city: "Seffner", region: "Florida", country: "USA",
                  layoutKey: "sef", sourceURL: nil, source: "seed"),
    ]
}
