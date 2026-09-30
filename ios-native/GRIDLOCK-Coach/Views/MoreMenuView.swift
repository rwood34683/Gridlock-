import SwiftUI

/// Secondary coach tools — keeps the bottom bar simple.
struct MoreMenuView: View {
    @Bindable var state: AppState

    private let rows: [(AppTab, String)] = [
        (.lineups, "Set who’s on the next point"),
        (.team, "Roster and join code"),
        (.codes, "Your team’s call words"),
        (.assess, "Grade a player after the point"),
        (.movement, "Log a bunker-to-bunker move"),
        (.walk, "Notes from walking the field"),
        (.messages, "Message the squad"),
        (.nexus, "App status and event list"),
    ]

    var body: some View {
        List {
            Section {
                Text("Main flow is Playbook → Tally → Scout. Everything else lives here.")
                    .font(.subheadline)
                    .foregroundStyle(Color.glMuted)
                    .listRowBackground(Color.clear)
            }

            Section("Tools") {
                ForEach(rows, id: \.0) { tab, hint in
                    NavigationLink {
                        moreDestination(tab)
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Label(tab.label, systemImage: tab.systemImage)
                                .foregroundStyle(Color.glText)
                            Text(hint)
                                .font(.caption)
                                .foregroundStyle(Color.glMuted)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.glNavy)
        .navigationTitle("More")
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private func moreDestination(_ tab: AppTab) -> some View {
        switch tab {
        case .lineups:   LineupsView()
        case .team:      TeamView()
        case .codes:     CodesView()
        case .assess:    AssessView()
        case .movement:  MovementView()
        case .walk:      WalkView()
        case .messages:  MessagesView()
        case .nexus:     NexusView()
        default:         NexusView()
        }
    }
}
