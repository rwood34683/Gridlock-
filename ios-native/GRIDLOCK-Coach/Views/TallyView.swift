import SwiftUI
import SwiftData

struct TallyView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \TallyEntry.timestamp, order: .reverse) private var entries: [TallyEntry]

    @State private var pointNumber = 1
    @State private var playerName = ""
    @State private var event = "Elim"
    @State private var note = ""
    @State private var errorMessage: String?

    private let events = ["Elim", "Penalty", "Bunker", "Alive", "Lane kill", "Trade"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Point tally")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.glText)
                Text("Track eliminations, penalties, and time alive per player across points. Feeds Assess over time.")
                    .font(.subheadline)
                    .foregroundStyle(Color.glMuted)

                VStack(alignment: .leading, spacing: 10) {
                    Stepper("Point #\(pointNumber)", value: $pointNumber, in: 1...99)
                    TextField("Player name", text: $playerName)
                        .textFieldStyle(.roundedBorder)
                    Picker("Event", selection: $event) {
                        ForEach(events, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    TextField("Note (optional)", text: $note)
                        .textFieldStyle(.roundedBorder)
                    Button {
                        save()
                    } label: {
                        Label("Log event", systemImage: "plus.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(GLPrimaryButton())
                    .disabled(playerName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(14)
                .background(Color.glPanel)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                if entries.isEmpty {
                    emptyState
                } else {
                    Text("This session")
                        .font(.headline)
                        .foregroundStyle(Color.glText)
                    ForEach(entries.prefix(GridlockAgent.Caps.tallyVisible), id: \.id) { e in
                        HStack(alignment: .top, spacing: 10) {
                            Text("P\(e.pointNumber)")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Color.glGold)
                                .frame(width: 28, alignment: .leading)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(e.playerName)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(Color.glText)
                                Text("\(e.event)\(e.note.isEmpty ? "" : " · \(e.note)")")
                                    .font(.caption)
                                    .foregroundStyle(Color.glMuted)
                            }
                            Spacer()
                            Text(e.timestamp, style: .time)
                                .font(.caption2)
                                .foregroundStyle(Color.glDim)
                        }
                        .padding(10)
                        .background(Color.glPanel2)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
            .padding(14)
        }
        .background(Color.glNavy)
        .navigationTitle("Tally")
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

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "list.number")
                .font(.largeTitle)
                .foregroundStyle(Color.glMuted)
            Text("No events yet")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.glText)
            Text("Log eliminations and penalties as the point unfolds.")
                .font(.caption)
                .foregroundStyle(Color.glMuted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(Color.glPanel)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func save() {
        guard AttackDefense.allowSave(AttackDefense.Action.tallySave) else {
            errorMessage = AttackDefense.rateLimitMessage
            return
        }
        let nameCheck = GridSecurity.requireName(playerName, label: "Player name")
        let pointCheck = GridSecurity.pointNumber(pointNumber)
        let check = GridSecurity.combine(nameCheck, pointCheck)
        guard check.isOK else {
            errorMessage = check.firstMessage
            return
        }
        let name = GridSecurity.sanitize(playerName, max: GridSecurity.Limits.name)
        modelContext.insert(TallyEntry(
            pointNumber: pointNumber,
            playerName: name,
            event: event,
            note: GridSecurity.sanitize(note, max: GridSecurity.Limits.notes)
        ))
        GridlockAgent.save(modelContext, label: "tally")
        playerName = ""
        note = ""
    }
}
