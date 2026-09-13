import SwiftUI
import SwiftData

struct LineupsView: View {
    @Environment(AppState.self) private var state
    @Query(sort: \Team.createdAt, order: .reverse) private var teams: [Team]
    @State private var slots: [String] = ["", "", "", "", ""]
    @State private var lineupName = "Point 1"
    @State private var saved: [(name: String, players: [String])] = []

    private var roster: [Player] {
        guard let code = state.activeTeamCode else { return [] }
        return teams.first { $0.code == code }?.players ?? []
    }

    private let roles = ["Snake", "Snake 2 / MW", "Center", "Dorito", "Back / lane"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Lineups")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.glText)
                Text("Build the five for the next point. Assign roster players to break roles.")
                    .font(.subheadline)
                    .foregroundStyle(Color.glMuted)

                TextField("Lineup name", text: $lineupName)
                    .textFieldStyle(.roundedBorder)

                VStack(spacing: 8) {
                    ForEach(0..<5, id: \.self) { i in
                        HStack {
                            Text("\(i + 1)")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Color.glGold)
                                .frame(width: 18)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(roles[i])
                                    .font(.caption2)
                                    .foregroundStyle(Color.glMuted)
                                if roster.isEmpty {
                                    TextField("Player name", text: $slots[i])
                                        .textFieldStyle(.roundedBorder)
                                } else {
                                    Picker("Player", selection: $slots[i]) {
                                        Text("—").tag("")
                                        ForEach(roster, id: \.id) { p in
                                            Text(p.name).tag(p.name)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                }
                            }
                        }
                        .padding(10)
                        .background(Color.glPanel)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }

                Button {
                    let players = slots.map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                    guard !players.isEmpty else { return }
                    saved.insert((lineupName, players), at: 0)
                } label: {
                    Label("Save lineup", systemImage: "person.3.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(GLPrimaryButton())

                if !saved.isEmpty {
                    Text("Saved")
                        .font(.headline)
                        .foregroundStyle(Color.glText)
                    ForEach(Array(saved.enumerated()), id: \.offset) { _, item in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Color.glText)
                            Text(item.players.joined(separator: " · "))
                                .font(.caption)
                                .foregroundStyle(Color.glMuted)
                        }
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.glPanel2)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }

                if roster.isEmpty {
                    Text("Tip: create a team and add players in the Team tab to pick from the roster.")
                        .font(.caption)
                        .foregroundStyle(Color.glDim)
                }
            }
            .padding(14)
        }
        .background(Color.glNavy)
        .navigationTitle("Lineups")
        .navigationBarTitleDisplayMode(.inline)
    }
}
