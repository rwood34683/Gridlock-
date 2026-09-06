import SwiftUI
import SwiftData

struct TeamView: View {
    @Environment(AppState.self) private var state
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Team.createdAt, order: .reverse) private var teams: [Team]
    @State private var newTeamName = ""
    @State private var newPlayerName = ""
    @State private var showCreate = false
    @State private var errorMessage: String?

    private var activeTeam: Team? {
        guard let code = state.activeTeamCode else { return nil }
        return teams.first { $0.code == code }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if let team = activeTeam {
                    teamHeader(team)
                    rosterSection(team)
                    codesSection(team)
                } else {
                    noTeam
                }
            }
            .padding(14)
        }
        .background(Color.glNavy)
        .navigationTitle("Team")
        .alert("Can’t save", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }

        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { showCreate = true } label: { Image(systemName: "plus") }
            }
        }
        .sheet(isPresented: $showCreate) { createTeamSheet }
    }

    private func teamHeader(_ team: Team) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(team.name).font(.title2.weight(.bold)).foregroundStyle(Color.glText)
            HStack {
                Label(team.code, systemImage: "qrcode")
                    .font(.subheadline.weight(.semibold)).foregroundStyle(Color.glChalk)
                Spacer()
                Text("\(team.players.count) players").font(.caption).foregroundStyle(Color.glMuted)
            }
            Text("Share the code with your roster. Players enter it once to activate the Player app.")
                .font(.caption).foregroundStyle(Color.glMuted)
        }
        .padding(14).background(Color.glPanel).clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.glBorder, lineWidth: 1))
    }

    private func rosterSection(_ team: Team) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Roster").font(.headline).foregroundStyle(Color.glText)
            HStack {
                TextField("Add player name", text: $newPlayerName).textFieldStyle(.roundedBorder)
                Button("Add") { addPlayer(to: team) }
                    .buttonStyle(GLPrimaryButton())
                    .disabled(newPlayerName.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            ForEach(team.players, id: \.id) { player in
                HStack {
                    Circle().fill(Color.glAccent.opacity(0.3)).frame(width: 32, height: 32)
                        .overlay(Text(String(player.name.prefix(1)).uppercased())
                            .font(.caption.weight(.bold)).foregroundStyle(Color.glChalk))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(player.name).font(.subheadline.weight(.semibold)).foregroundStyle(Color.glText)
                        Text(player.position ?? "flex").font(.caption2).foregroundStyle(Color.glMuted)
                    }
                    Spacer()
                    if let n = player.number {
                        Text("#\(n)").font(.caption.weight(.bold)).foregroundStyle(Color.glGold)
                    }
                }
                .padding(10).background(Color.glPanel).clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    private func codesSection(_ team: Team) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Team codes").font(.headline).foregroundStyle(Color.glText)
            Text("Players join with: \(team.code)").font(.subheadline).foregroundStyle(Color.glChalk)
            Text("Format is NAME-XXXX. Players must enter this exact code to unlock the Player edition.")
                .font(.caption).foregroundStyle(Color.glMuted)
        }
        .padding(14).background(Color.glPanel).clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var noTeam: some View {
        VStack(spacing: 14) {
            Image(systemName: "person.2.badge.gearshape").font(.system(size: 40)).foregroundStyle(Color.glMuted)
            Text("Set up your team").font(.title3.weight(.bold)).foregroundStyle(Color.glText)
            Text("GRIDLOCK by UPRA — create a team, share the code, players join from the Player app.")
                .font(.subheadline).foregroundStyle(Color.glMuted).multilineTextAlignment(.center)
            Button { showCreate = true } label: {
                Text("Create team").frame(maxWidth: .infinity)
            }
            .buttonStyle(GLPrimaryButton())
        }
        .padding(24).frame(maxWidth: .infinity)
        .background(Color.glPanel).clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var createTeamSheet: some View {
        NavigationStack {
            Form {
                Section("Team") { TextField("Team name", text: $newTeamName) }
                Section {
                    Text("A unique code like IMPACT-7QX2 will be generated.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("New team")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { showCreate = false } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { createTeam() }
                        .disabled(newTeamName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func createTeam() {
        guard AttackDefense.allowSave(AttackDefense.Action.teamCreate) else {
            errorMessage = AttackDefense.rateLimitMessage
            return
        }
        let check = GridSecurity.requireName(newTeamName, label: "Team name")
        guard check.isOK else {
            errorMessage = check.firstMessage
            return
        }
        let name = GridSecurity.sanitize(newTeamName, max: GridSecurity.Limits.name)
        let code = GridSecurity.teamCode("\(name.prefix(4))-\(Int.random(in: 1000...9999))")
        let team = Team(code: code.isEmpty ? "TEAM-\(Int.random(in: 1000...9999))" : code, name: name)
        modelContext.insert(team)
        GridlockAgent.save(modelContext, label: "team")
        state.activeTeamCode = team.code
        newTeamName = ""
        showCreate = false
    }

    private func addPlayer() {
        guard AttackDefense.allowSave(AttackDefense.Action.playerAdd) else {
            errorMessage = AttackDefense.rateLimitMessage
            return
        }
        let check = GridSecurity.requireName(newPlayerName, label: "Player name")
        guard check.isOK else {
            errorMessage = check.firstMessage
            return
        }
        guard let team = activeTeam else {
            errorMessage = "Create or select a team first."
            return
        }
        let name = GridSecurity.sanitize(newPlayerName, max: GridSecurity.Limits.name)
        let player = Player(name: name)
        player.team = team
        modelContext.insert(player)
        GridlockAgent.save(modelContext, label: "player")
        newPlayerName = ""
    }
}
