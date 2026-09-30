import SwiftUI
import SwiftData

struct AssessView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \AssessmentEntry.timestamp, order: .reverse) private var assessments: [AssessmentEntry]
    @State private var playerName = ""
    @State private var category = "Break"
    @State private var score = 3
    @State private var notes = ""
    @State private var errorMessage: String?

    private let categories = ["Break", "Gunfight", "Communication", "Discipline", "Movement", "Lane control"]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Player assessments")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.glText)
                Text("Build a picture of every player over time. Scores feed the long-term view.")
                    .font(.subheadline)
                    .foregroundStyle(Color.glMuted)

                VStack(alignment: .leading, spacing: 10) {
                    TextField("Player name", text: $playerName)
                        .textFieldStyle(.roundedBorder)
                    Picker("Category", selection: $category) {
                        ForEach(categories, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.menu)
                    Stepper("Score: \(score)/5", value: $score, in: 1...5)
                    TextField("Notes", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                        .textFieldStyle(.roundedBorder)
                    Button("Save assessment") {
                        save()
                    }
                    .buttonStyle(GLPrimaryButton())
                    .disabled(playerName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(14)
                .background(Color.glPanel)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                ForEach(Array(assessments.prefix(GridlockAgent.Caps.assessmentsVisible)), id: \.id) { a in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(a.playerName)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Color.glText)
                            Text("\(a.category) · \(a.note)")
                                .font(.caption)
                                .foregroundStyle(Color.glMuted)
                                .lineLimit(1)
                        }
                        Spacer()
                        Text("\(a.score)")
                            .font(.title3.weight(.bold))
                            .foregroundStyle(Color.glGold)
                    }
                    .padding(12)
                    .background(Color.glPanel)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
            .padding(14)
        }
        .background(Color.glNavy)
        .navigationTitle("Assess")
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
        guard AttackDefense.allowSave(AttackDefense.Action.assessSave) else {
            errorMessage = AttackDefense.rateLimitMessage
            return
        }
        let nameCheck = GridSecurity.requireName(playerName, label: "Player name")
        let scoreCheck = GridSecurity.score(score)
        let check = GridSecurity.combine(nameCheck, scoreCheck)
        guard check.isOK else {
            errorMessage = check.firstMessage
            return
        }
        let name = GridSecurity.sanitize(playerName, max: GridSecurity.Limits.name)
        let a = AssessmentEntry(
            playerId: UUID().uuidString,
            playerName: name,
            category: category,
            score: score,
            note: GridSecurity.sanitize(notes, max: GridSecurity.Limits.notes)
        )
        modelContext.insert(a)
        GridlockAgent.save(modelContext, label: "assess")
        playerName = ""
        notes = ""
    }
}
