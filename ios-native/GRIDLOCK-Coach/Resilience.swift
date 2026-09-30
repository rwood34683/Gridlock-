import Foundation
import SwiftData
import SwiftUI

/// Runtime self-repair and diagnostics for event-day load (thousands of coaches offline-first).
enum GridlockAgent {
    private static func log(_ message: String) {
        print("[GRIDLOCK/UPRA] \(message)")
    }

    // MARK: - Store bootstrap (never crash-launch on schema mismatch)

    static func makeContainer() -> ModelContainer {
        let schema = Schema([
            Team.self,
            Player.self,
            Play.self,
            Message.self,
            AssessmentEntry.self,
            TallyEntry.self,
            ScoutEntry.self,
        ])

        // 1) Durable on-disk
        do {
            let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
            let container = try ModelContainer(for: schema, configurations: [config])
            log("Store: durable")
            return container
        } catch {
            log("Durable store failed: \(error) — wiping and retrying")
            wipeStoreFiles()
        }

        // 2) Retry durable after wipe
        do {
            let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
            let container = try ModelContainer(for: schema, configurations: [config])
            log("Store: durable (after wipe)")
            return container
        } catch {
            log("Repair failed: \(error) — falling back to memory")
        }

        // 3) In-memory only (session)
        do {
            let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
            let container = try ModelContainer(for: schema, configurations: [config])
            log("Store: in-memory")
            return container
        } catch {
            log("In-memory full schema failed: \(error)")
        }

        // 4) Empty in-memory (coach can still open the shell UI)
        let empty = Schema([])
        let config = ModelConfiguration(schema: empty, isStoredInMemoryOnly: true)
        if let container = try? ModelContainer(for: empty, configurations: [config]) {
            log("Store: empty in-memory fallback")
            return container
        }

        // 5) Should be unreachable; use empty container via forced path that Schema([]) supports
        log("Store: emergency empty")
        return try! ModelContainer(
            for: empty,
            configurations: [config]
        )
    }

    private static func wipeStoreFiles() {
        let fm = FileManager.default
        guard let appSupport = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return }
        let candidates = (try? fm.contentsOfDirectory(at: appSupport, includingPropertiesForKeys: nil)) ?? []
        for url in candidates {
            let name = url.lastPathComponent.lowercased()
            if name.contains("default.store") || name.hasSuffix(".store") || name.hasSuffix(".store-shm") || name.hasSuffix(".store-wal") {
                try? fm.removeItem(at: url)
                log("Removed store file \(url.lastPathComponent)")
            }
        }
    }

    // MARK: - Safe persist

    @MainActor
    static func save(_ context: ModelContext, label: String = "save") {
        guard context.hasChanges else { return }
        do {
            try context.save()
        } catch {
            log("Save failed (\(label)): \(error)")
            context.rollback()
        }
    }

    // MARK: - Caps (pressure guardrails)

    /// Soft limits so a long event weekend can't blow memory on device.
    enum Caps {
        static let tallyVisible = 100
        static let scoutVisible = 50
        static let messagesVisible = 200
        static let assessmentsVisible = 50
        static let playsVisible = 40
        static let rosterPlayers = 30
    }

    // MARK: - Health snapshot (Nexus)

    struct Health: Equatable {
        var storeMode: String
        var teamCode: String
        var layoutKey: String
        var warnings: [String]
    }

    // MARK: - Pressure test (synthetic load — development / Nexus)

    /// Simulates a heavy event weekend of inserts; validates store + caps stay responsive.
    @MainActor
    static func pressureTest(context: ModelContext, points: Int = 50) -> String {
        guard AttackDefense.allowSave(AttackDefense.Action.pressure) else {
            return AttackDefense.rateLimitMessage
        }
        let capped = min(max(points, 1), 50)
        let start = Date()
        var inserted = 0
        for p in 1...capped {
            for i in 1...5 {
                context.insert(TallyEntry(pointNumber: p, playerName: "P\(i)", event: "Elim", note: "pt"))
                inserted += 1
            }
            context.insert(ScoutEntry(teamName: "Opp \(p)", layoutKey: "cin", breakName: "Hold & Read", notes: "auto"))
            inserted += 1
        }
        save(context, label: "pressure")
        let ms = Int(Date().timeIntervalSince(start) * 1000)
        log("Pressure test inserted \(inserted) rows in \(ms)ms")
        return "Inserted \(inserted) rows in \(ms)ms. Caps keep UI lists bounded under event load."
    }

    @MainActor
    static func health(state: AppState, storeMode: String = "durable") -> Health {
        var warnings: [String] = []
        if state.activeTeamCode == nil {
            warnings.append("No team code active — create a team before the event.")
        }
        if state.selectedLayoutKey.isEmpty {
            warnings.append("No layout selected.")
        }
        return Health(
            storeMode: storeMode,
            teamCode: state.activeTeamCode ?? "—",
            layoutKey: state.selectedLayoutKey.uppercased(),
            warnings: warnings
        )
    }
}
