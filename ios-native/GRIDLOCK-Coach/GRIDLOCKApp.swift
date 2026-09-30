import SwiftUI
import SwiftData

// GRIDLOCK Coach by UPRA — © UPRA. All rights reserved.
// Unauthorized copying, redistribution, or rebranding is prohibited.
// Build seal: UPRA-GRIDLOCK-COACH-v1

@main
struct GRIDLOCKApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [
            Team.self,
            Player.self,
            Play.self,
            Message.self,
            AssessmentEntry.self,
            TallyEntry.self,
            ScoutEntry.self,
        ])
    }
}
