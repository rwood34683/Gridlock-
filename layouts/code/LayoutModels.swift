import Foundation

/// Gridlock Coach — decode layouts/events/*.json from the 2026 Claude Code pack.
/// Images are ground truth. `bunkers` is empty until a digitize pass fills it.

struct LayoutField: Codable {
    var widthFt: Double
    var lengthFt: Double
    var gridFt: Double
    var surface: String?
    var origin: String?

    enum CodingKeys: String, CodingKey {
        case widthFt = "width_ft"
        case lengthFt = "length_ft"
        case gridFt = "grid_ft"
        case surface, origin
    }
}

struct LayoutView: Codable, Identifiable {
    var id: String
    var kind: String
    var file: String
    var notes: String?
}

struct LayoutSource: Codable {
    var type: String
    var url: String
}

struct LayoutVenue: Codable {
    var name: String?
    var city: String?
    var state: String?
    var country: String?
}

struct LayoutBunker: Codable, Identifiable {
    var id: String
    var code: String
    var name: String
    var xFt: Double?
    var yFt: Double?
}

struct LayoutEvent: Codable, Identifiable {
    var id: String
    var league: String
    var leagueCode: String?
    var event: String
    var season: Int?
    var dates: String?
    var venue: LayoutVenue?
    var status: String
    var coordinateStatus: String?
    var field: LayoutField
    var views: [LayoutView]
    var sources: [LayoutSource]
    var notes: [String]?
    var bunkers: [LayoutBunker]

    enum CodingKeys: String, CodingKey {
        case id, league, event, season, dates, venue, status, field, views, sources, notes, bunkers
        case leagueCode = "league_code"
        case coordinateStatus = "coordinate_status"
    }
}

struct LayoutIndex: Codable {
    var pack: String?
    var version: String?
    var events: [String]
}

enum LayoutPack {
    static func loadIndex(from url: URL) throws -> LayoutIndex {
        try JSONDecoder().decode(LayoutIndex.self, from: Data(contentsOf: url))
    }

    static func loadEvent(id: String, folder: URL) throws -> LayoutEvent {
        let url = folder.appendingPathComponent("events/\(id).json")
        return try JSONDecoder().decode(LayoutEvent.self, from: Data(contentsOf: url))
    }
}
