import Foundation
import SwiftData

// MARK: - Team / Roster

@Model
final class Team {
    @Attribute(.unique) var code: String   // e.g. "IMPACT-7QX2"
    var name: String
    var createdAt: Date
    @Relationship(deleteRule: .cascade, inverse: \Player.team)
    var players: [Player]
    @Relationship(deleteRule: .cascade, inverse: \Message.team)
    var messages: [Message]
    
    init(code: String, name: String, createdAt: Date = .now) {
        self.code = code
        self.name = name
        self.createdAt = createdAt
        self.players = []
        self.messages = []
    }
}

@Model
final class Player {
    @Attribute(.unique) var id: String
    var name: String
    var number: Int?
    var position: String?   // snake, dorito, back, etc.
    var notes: String
    var team: Team?
    
    init(id: String = UUID().uuidString, name: String, number: Int? = nil, position: String? = nil, notes: String = "") {
        self.id = id
        self.name = name
        self.number = number
        self.position = position
        self.notes = notes
    }
}

// MARK: - Messaging

@Model
final class Message {
    @Attribute(.unique) var id: String
    var fromCoach: Bool
    var body: String
    var timestamp: Date
    var team: Team?
    
    init(id: String = UUID().uuidString, fromCoach: Bool, body: String, timestamp: Date = .now) {
        self.id = id
        self.fromCoach = fromCoach
        self.body = body
        self.timestamp = timestamp
    }
}

// MARK: - Field / Layout (static data + optional custom)

struct Bunker: Identifiable, Codable, Hashable {
    var id: String          // e.g. "MD#1"
    var name: String        // callout: MD, GW, etc.
    var x: Double           // field units ~0-150
    var y: Double           // field units ~0-120
    var type: String        // dorito, tower, can, wing, cake, beam, mw, temple, plus, ballR, ballB...
    var angle: Double? = nil      // degrees
    var width: Double? = nil      // for beams
    var side: String? = nil       // optional flag from source data
}

struct FieldLayout: Identifiable, Codable, Hashable {
    var id: String          // key: cin, sef, tex, eur, cust_...
    var name: String
    var subtitle: String
    var bunkers: [Bunker]
    var isFull: Bool        // true if both sides provided; false = mirror left half
}

// MARK: - Plays / Breakouts

@Model
final class Play {
    @Attribute(.unique) var id: String
    var name: String
    var layoutKey: String
    var notes: String
    var createdAt: Date
    // Roles stored as JSON for simplicity in MVP
    var rolesJSON: Data?
    
    init(id: String = UUID().uuidString, name: String, layoutKey: String, notes: String = "", rolesJSON: Data? = nil) {
        self.id = id
        self.name = name
        self.layoutKey = layoutKey
        self.notes = notes
        self.createdAt = .now
        self.rolesJSON = rolesJSON
    }
}

struct PlayRole: Codable, Hashable, Identifiable {
    var id: String
    var label: String       // "Snake 1", "D-side back", etc.
    var bunkerSequence: [String]  // bunker ids or names in order
    var pathPoints: [[Double]]?   // optional [[x,y], ...]
}

// MARK: - Assessment / Tally (simplified)

@Model
final class AssessmentEntry {
    @Attribute(.unique) var id: String
    var playerId: String
    var playerName: String
    var pointNumber: Int
    var category: String    // e.g. "break", "lane", "bunker"
    var score: Int          // 1-5 or similar
    var note: String
    var timestamp: Date
    
    init(id: String = UUID().uuidString, playerId: String, playerName: String, pointNumber: Int = 0, category: String, score: Int, note: String = "") {
        self.id = id
        self.playerId = playerId
        self.playerName = playerName
        self.pointNumber = pointNumber
        self.category = category
        self.score = score
        self.note = note
        self.timestamp = .now
    }
}

// MARK: - Built-in layout seeds (Cincinnati 2026 sample — left half; mirror in app)

enum BuiltInLayouts {
    // Exact RAW_* from gridlock_coach.html

    static let cincinnatiRaw: [Bunker] = [
        Bunker(id: "MW#1", name: "MW", x: 75, y: 112, type: "mw", side: "S"),
        Bunker(id: "SB#2", name: "SB", x: 75, y: 103, type: "beam", width: 22, side: "S"),
        Bunker(id: "GW#3", name: "GW", x: 75, y: 65, type: "tower", side: "S"),
        Bunker(id: "GB#4", name: "GB", x: 75, y: 55, type: "towerbig", side: "P"),
        Bunker(id: "GW#5", name: "GW", x: 75, y: 45, type: "tower", side: "S"),
        Bunker(id: "GB#6", name: "GB", x: 75, y: 6, type: "towerbig", side: "P"),
        Bunker(id: "C#7", name: "C", x: 15, y: 76, type: "ballB"),
        Bunker(id: "MT#8", name: "MT", x: 15, y: 35, type: "temple"),
        Bunker(id: "H#9", name: "H", x: 6, y: 62, type: "can"),
        Bunker(id: "T#10", name: "T", x: 25, y: 105, type: "temple", side: "S"),
        Bunker(id: "T#11", name: "T", x: 25, y: 58, type: "temple", side: "S"),
        Bunker(id: "SD#12", name: "SD", x: 25, y: 16, type: "dorito", side: "S"),
        Bunker(id: "MD#13", name: "MD", x: 35, y: 108, type: "dorito", side: "P"),
        Bunker(id: "Br#14", name: "Br", x: 35, y: 88, type: "can", side: "S"),
        Bunker(id: "Br#15", name: "Br", x: 35, y: 9, type: "can", side: "S"),
        Bunker(id: "C#16", name: "C", x: 45, y: 74, type: "ballB", side: "S"),
        Bunker(id: "Ck#17", name: "Ck", x: 45, y: 31, type: "cake", side: "P"),
        Bunker(id: "MD#18", name: "MD", x: 55, y: 112, type: "dorito", side: "S"),
        Bunker(id: "Wg#19", name: "Wg", x: 52, y: 9, type: "wing", side: "S"),
        Bunker(id: "Tr#20", name: "Tr", x: 57, y: 74, type: "ballR", side: "S"),
        Bunker(id: "MW#21", name: "MW", x: 58, y: 30, type: "mw", side: "P"),
        Bunker(id: "GP#22", name: "GP", x: 64, y: 17, type: "plus", side: "P"),
        Bunker(id: "MT#23", name: "MT", x: 63, y: 47, type: "temple", side: "P"),
        Bunker(id: "MD#24", name: "MD", x: 68, y: 112, type: "dorito", side: "P"),
        Bunker(id: "Tr#25", name: "Tr", x: 68, y: 74, type: "ballR", side: "P"),
        Bunker(id: "MW#26", name: "MW", x: 72, y: 30, type: "mw", side: "S"),
    ]

    static let europeRaw: [Bunker] = [
        Bunker(id: "GP#1", name: "GP", x: 75, y: 105, type: "plus", side: "P"),
        Bunker(id: "SB#2", name: "SB", x: 75, y: 88, type: "beam", width: 48, side: "S"),
        Bunker(id: "Tr#3", name: "Tr", x: 75, y: 80, type: "ballR", side: "S"),
        Bunker(id: "GW#4", name: "GW", x: 75, y: 72, type: "tower", side: "S"),
        Bunker(id: "Br#5", name: "Br", x: 75, y: 60, type: "can", side: "P"),
        Bunker(id: "GW#6", name: "GW", x: 75, y: 48, type: "tower", side: "S"),
        Bunker(id: "Tr#7", name: "Tr", x: 75, y: 40, type: "ballR", side: "S"),
        Bunker(id: "Br#8", name: "Br", x: 75, y: 29, type: "beam", width: 12, side: "P"),
        Bunker(id: "GP#9", name: "GP", x: 75, y: 16, type: "plus", side: "P"),
        Bunker(id: "SD#10", name: "SD", x: 29, y: 103, type: "dorito", side: "S"),
        Bunker(id: "MD#11", name: "MD", x: 42, y: 107, type: "dorito", side: "P"),
        Bunker(id: "MD#12", name: "MD", x: 56, y: 107, type: "dorito", side: "S"),
        Bunker(id: "Wg#13", name: "Wg", x: 69, y: 92, type: "wing", side: "S"),
        Bunker(id: "MT#14", name: "MT", x: 51, y: 88, type: "temple", side: "P"),
        Bunker(id: "C#15", name: "C", x: 12, y: 82, type: "ballB"),
        Bunker(id: "C#16", name: "C", x: 42, y: 70, type: "ballB", side: "S"),
        Bunker(id: "TCK#17", name: "TCK", x: 2, y: 60, type: "can"),
        Bunker(id: "T#18", name: "T", x: 12, y: 60, type: "temple", side: "S"),
        Bunker(id: "GB#19", name: "GB", x: 62, y: 60, type: "towerbig", side: "P"),
        Bunker(id: "Br#20", name: "Br", x: 42, y: 50, type: "can", side: "S"),
        Bunker(id: "T#21", name: "T", x: 18, y: 41, type: "temple", side: "S"),
        Bunker(id: "Tr#22", name: "Tr", x: 60, y: 32, type: "ballR", side: "S"),
        Bunker(id: "MT#23", name: "MT", x: 12, y: 20, type: "temple", side: "P"),
        Bunker(id: "SB#24", name: "SB", x: 48, y: 20, type: "beam", width: 20, side: "S"),
        Bunker(id: "SB#25", name: "SB", x: 65, y: 24, type: "beam", angle: -35, width: 16, side: "S"),
        Bunker(id: "Ck#26", name: "Ck", x: 41, y: 15, type: "cake", side: "P"),
        Bunker(id: "MW#27", name: "MW", x: 51, y: 13, type: "mw", side: "P"),
        Bunker(id: "MW#28", name: "MW", x: 63, y: 16, type: "mw", side: "S"),
    ]

    static let seffnerRaw: [Bunker] = [
        Bunker(id: "C#1", name: "C", x: 12, y: 108, type: "can"),
        Bunker(id: "C#2", name: "C", x: 138, y: 108, type: "can"),
        Bunker(id: "C#3", name: "C", x: 12, y: 22, type: "can"),
        Bunker(id: "C#4", name: "C", x: 138, y: 22, type: "can"),
        Bunker(id: "BD#5", name: "BD", x: 30, y: 103, type: "dorito", side: "P"),
        Bunker(id: "BD#6", name: "BD", x: 50, y: 103, type: "dorito"),
        Bunker(id: "BD#7", name: "BD", x: 66, y: 104.5, type: "dorito"),
        Bunker(id: "BD#8", name: "BD", x: 84, y: 104.5, type: "dorito"),
        Bunker(id: "BD#9", name: "BD", x: 100, y: 103, type: "dorito"),
        Bunker(id: "BD#10", name: "BD", x: 120, y: 103, type: "dorito", side: "P"),
        Bunker(id: "SW#11", name: "SW", x: 75, y: 97, type: "wingS", angle: 90),
        Bunker(id: "SD#12", name: "SD", x: 60, y: 92.5, type: "sd"),
        Bunker(id: "SD#13", name: "SD", x: 90, y: 92.5, type: "sd"),
        Bunker(id: "MB#14", name: "MB", x: 22, y: 93.5, type: "mb"),
        Bunker(id: "MB#15", name: "MB", x: 128, y: 93.5, type: "mb"),
        Bunker(id: "MB#16", name: "MB", x: 28.5, y: 30, type: "mb"),
        Bunker(id: "MB#17", name: "MB", x: 121.5, y: 30, type: "mb"),
        Bunker(id: "T#18", name: "T", x: 47.5, y: 82.5, type: "tower"),
        Bunker(id: "T#19", name: "T", x: 102.5, y: 82.5, type: "tower"),
        Bunker(id: "T#20", name: "T", x: 22.5, y: 77.5, type: "tower"),
        Bunker(id: "T#21", name: "T", x: 127.5, y: 77.5, type: "tower"),
        Bunker(id: "GP#22", name: "GP", x: 75, y: 86, type: "plus", side: "P"),
        Bunker(id: "GP#23", name: "GP", x: 75, y: 25, type: "plus", side: "P"),
        Bunker(id: "P#24", name: "P", x: 75, y: 71.5, type: "pin"),
        Bunker(id: "P#25", name: "P", x: 61.5, y: 48.5, type: "pin"),
        Bunker(id: "P#26", name: "P", x: 88.5, y: 48.5, type: "pin"),
        Bunker(id: "P#27", name: "P", x: 75, y: 38.5, type: "pin"),
        Bunker(id: "A#28", name: "A", x: 12.5, y: 62.5, type: "aztec", side: "P"),
        Bunker(id: "A#29", name: "A", x: 137.5, y: 62.5, type: "aztec", side: "P"),
        Bunker(id: "A#30", name: "A", x: 12.5, y: 42.5, type: "aztec", side: "P"),
        Bunker(id: "A#31", name: "A", x: 137.5, y: 42.5, type: "aztec", side: "P"),
        Bunker(id: "GB#32", name: "GB", x: 47.5, y: 60, type: "gb", side: "P"),
        Bunker(id: "GB#33", name: "GB", x: 102.5, y: 60, type: "gb", side: "P"),
        Bunker(id: "SB#34", name: "SB", x: 67, y: 77.5, type: "beam", angle: 135, width: 10.9),
        Bunker(id: "SB#35", name: "SB", x: 60, y: 70, type: "beam", angle: 135, width: 10.9),
        Bunker(id: "SB#36", name: "SB", x: 83, y: 77.5, type: "beam", angle: 45, width: 10.9),
        Bunker(id: "SB#37", name: "SB", x: 90, y: 70, type: "beam", angle: 45, width: 10.9),
        Bunker(id: "SB#38", name: "SB", x: 67, y: 33, type: "beam", angle: 45, width: 10.9),
        Bunker(id: "SB#39", name: "SB", x: 60, y: 40, type: "beam", angle: 45, width: 10.9),
        Bunker(id: "SB#40", name: "SB", x: 83, y: 33, type: "beam", angle: 135, width: 10.9),
        Bunker(id: "SB#41", name: "SB", x: 90, y: 40, type: "beam", angle: 135, width: 10.9),
        Bunker(id: "SB#42", name: "SB", x: 65, y: 14, type: "beam", width: 10),
        Bunker(id: "SB#43", name: "SB", x: 75, y: 14, type: "beam", width: 10, side: "P"),
        Bunker(id: "SB#44", name: "SB", x: 85, y: 14, type: "beam", width: 10),
        Bunker(id: "WM#45", name: "WM", x: 59, y: 13.5, type: "wm"),
        Bunker(id: "WM#46", name: "WM", x: 91, y: 13.5, type: "wm"),
        Bunker(id: "CK#47", name: "CK", x: 75, y: 10.5, type: "cake"),
        Bunker(id: "WM#48", name: "WM", x: 49, y: 40, type: "wm"),
        Bunker(id: "WM#49", name: "WM", x: 101, y: 40, type: "wm"),
        Bunker(id: "GWS#50", name: "GWS", x: 42.5, y: 20, type: "wing", side: "P"),
        Bunker(id: "GWS#51", name: "GWS", x: 107.5, y: 20, type: "wing", side: "P"),
    ]

    static let texasRaw: [Bunker] = [
        Bunker(id: "SB#1", name: "SB", x: 75, y: 108, type: "beam", width: 12, side: "S"),
        Bunker(id: "P#2", name: "P", x: 75, y: 71, type: "pin"),
        Bunker(id: "P#3", name: "P", x: 75, y: 40, type: "pin"),
        Bunker(id: "SB#4", name: "SB", x: 75, y: 14, type: "beam", width: 12, side: "P"),
        Bunker(id: "C#5", name: "C", x: 65, y: 110, type: "can"),
        Bunker(id: "SB#6", name: "SB", x: 51, y: 98, type: "beam", angle: 135, width: 14, side: "S"),
        Bunker(id: "X#7", name: "X", x: 38, y: 87, type: "aztec", side: "P"),
        Bunker(id: "MD#8", name: "MD", x: 48, y: 97, type: "dorito", side: "S"),
        Bunker(id: "MD#9", name: "MD", x: 31, y: 100, type: "dorito", side: "S"),
        Bunker(id: "MD#10", name: "MD", x: 18, y: 106, type: "dorito", side: "S"),
        Bunker(id: "SD#11", name: "SD", x: 68, y: 93, type: "sd"),
        Bunker(id: "A#12", name: "A", x: 11, y: 72, type: "aztec"),
        Bunker(id: "A#13", name: "A", x: 11, y: 50, type: "aztec"),
        Bunker(id: "C#14", name: "C", x: 7, y: 61, type: "can"),
        Bunker(id: "P#15", name: "P", x: 49, y: 70, type: "pin"),
        Bunker(id: "TC#16", name: "TC", x: 68, y: 58, type: "cake", side: "P"),
        Bunker(id: "MB#17", name: "MB", x: 50, y: 60, type: "mb"),
        Bunker(id: "SD#18", name: "SD", x: 58, y: 46, type: "sd"),
        Bunker(id: "MB#19", name: "MB", x: 49, y: 42, type: "mb"),
        Bunker(id: "MB#20", name: "MB", x: 55, y: 32, type: "mb"),
        Bunker(id: "MD#21", name: "MD", x: 38, y: 37, type: "dorito", side: "S"),
        Bunker(id: "MD#22", name: "MD", x: 22, y: 30, type: "dorito", side: "S"),
        Bunker(id: "MD#23", name: "MD", x: 31, y: 21, type: "dorito", side: "S"),
        Bunker(id: "MD#24", name: "MD", x: 45, y: 19, type: "dorito", side: "S"),
        Bunker(id: "MD#25", name: "MD", x: 15, y: 11, type: "dorito", side: "S"),
        Bunker(id: "C#26", name: "C", x: 63, y: 15, type: "can"),
    ]

    static func mirror(_ bunkers: [Bunker]) -> [Bunker] {
        var out = bunkers
        for b in bunkers where b.x < 75 {
            var m = b
            m.id = b.name + "#R" + String(b.id.split(separator: "#").last ?? "1")
            m.x = 150 - b.x
            if let a = b.angle { m.angle = -a }
            out.append(m)
        }
        return out
    }

    static var cincinnati: FieldLayout {
        FieldLayout(
            id: "cin",
            name: "Cincinnati 2026",
            subtitle: "Cincinnati, OH · Jun 25–28",
            bunkers: mirror(cincinnatiRaw),
            isFull: false
        )
    }

    static var europe: FieldLayout {
        FieldLayout(
            id: "eur",
            name: "NXL Europe 2026 · Dreux",
            subtitle: "Dreux, France · Sep 3–6 · image-trace, verify on field walk",
            bunkers: mirror(europeRaw),
            isFull: false
        )
    }

    static var seffner: FieldLayout {
        FieldLayout(
            id: "sef",
            name: "Seffner 2026 · Summer Rumble E3",
            subtitle: "Thunder Valley, Seffner FL · Jul 24–26 · ±1 ft, official map",
            bunkers: seffnerRaw,  // full:true in HTML — both sides provided
            isFull: true
        )
    }

    static var texas: FieldLayout {
        FieldLayout(
            id: "tex",
            name: "Paintball Texas Classic",
            subtitle: "GunzUp · image-trace, verify on field walk",
            bunkers: mirror(texasRaw),
            isFull: false
        )
    }

    static var all: [FieldLayout] { [cincinnati, seffner, texas, europe] }

    static func layout(for key: String) -> FieldLayout {
        switch key {
        case "sef": return seffner
        case "tex": return texas
        case "eur": return europe
        default: return cincinnati
        }
    }
}


// MARK: - Tally (point eliminations)

@Model
final class TallyEntry {
    @Attribute(.unique) var id: String
    var pointNumber: Int
    var playerName: String
    var event: String          // elim, penalty, bunker, alive
    var note: String
    var timestamp: Date

    init(id: String = UUID().uuidString, pointNumber: Int, playerName: String, event: String, note: String = "") {
        self.id = id
        self.pointNumber = pointNumber
        self.playerName = playerName
        self.event = event
        self.note = note
        self.timestamp = .now
    }
}

// MARK: - Scout log

@Model
final class ScoutEntry {
    @Attribute(.unique) var id: String
    var teamName: String
    var layoutKey: String
    var breakName: String
    var notes: String
    var timestamp: Date

    init(id: String = UUID().uuidString, teamName: String, layoutKey: String, breakName: String, notes: String = "") {
        self.id = id
        self.teamName = teamName
        self.layoutKey = layoutKey
        self.breakName = breakName
        self.notes = notes
        self.timestamp = .now
    }
}
