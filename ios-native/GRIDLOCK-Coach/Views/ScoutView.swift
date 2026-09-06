import SwiftUI
import SwiftData

struct ScoutView: View {
    @Environment(AppState.self) private var state
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \ScoutEntry.timestamp, order: .reverse) private var logs: [ScoutEntry]

    @State private var teamName = ""
    @State private var breakName = "Hold & Read"
    @State private var notes = ""
    @State private var errorMessage: String?

    private let breaks = ["Hold & Read", "Balanced Break", "Snake Stack", "Dorito Flood", "Conservative", "Counter Break", "Wire Split", "Custom"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Scout board")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.glText)
                Text("Log what opposing teams actually ran — breakouts and notes on the event layout.")
                    .font(.subheadline)
                    .foregroundStyle(Color.glMuted)

                FieldCanvasView(layoutKey: state.selectedLayoutKey)
                    .aspectRatio(178.0/150.0, contentMode: .fit)
                    .frame(maxHeight: 220)
                    .glFieldFrame()

                VStack(alignment: .leading, spacing: 10) {
                    TextField("Opponent team", text: $teamName)
                        .textFieldStyle(.roundedBorder)
                    Picker("Break observed", selection: $breakName) {
                        ForEach(breaks, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.menu)
                    TextField("Notes", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                        .textFieldStyle(.roundedBorder)
                    Button {
                        save()
                    } label: {
                        Label("Log break", systemImage: "binoculars.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(GLPrimaryButton())
                    .disabled(teamName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(14)
                .background(Color.glPanel)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                if logs.isEmpty {
                    Text("No scouting logs yet. Capture what they ran after each point.")
                        .font(.caption)
                        .foregroundStyle(Color.glMuted)
                } else {
                    Text("Break log")
                        .font(.headline)
                        .foregroundStyle(Color.glText)
                    ForEach(logs.prefix(GridlockAgent.Caps.scoutVisible), id: \.id) { log in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(log.teamName)
                                    .font(.subheadline.weight(.bold))
                                    .foregroundStyle(Color.glText)
                                Spacer()
                                Text(log.layoutKey.uppercased())
                                    .font(.caption2)
                                    .foregroundStyle(Color.glDim)
                            }
                            Text(log.breakName)
                                .font(.subheadline)
                                .foregroundStyle(Color.glGold)
                            if !log.notes.isEmpty {
                                Text(log.notes)
                                    .font(.caption)
                                    .foregroundStyle(Color.glMuted)
                            }
                        }
                        .padding(12)
                        .background(Color.glPanel2)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
            .padding(14)
        }
        .background(Color.glNavy)
        .navigationTitle("Scout")
        .alert("Can’t save", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }

        .navigationBarTitleDisplayMode(.inline)
    }

    private func save() {
        guard AttackDefense.allowSave(AttackDefense.Action.scoutSave) else {
            errorMessage = AttackDefense.rateLimitMessage
            return
        }
        let check = GridSecurity.requireName(teamName, label: "Team name")
        guard check.isOK else {
            errorMessage = check.firstMessage
            return
        }
        modelContext.insert(ScoutEntry(
            teamName: GridSecurity.sanitize(teamName, max: GridSecurity.Limits.name),
            layoutKey: state.selectedLayoutKey,
            breakName: GridSecurity.sanitize(breakName, max: GridSecurity.Limits.shortText),
            notes: GridSecurity.sanitize(notes, max: GridSecurity.Limits.notes)
        ))
        GridlockAgent.save(modelContext, label: "scout")
        notes = ""
    }
}
