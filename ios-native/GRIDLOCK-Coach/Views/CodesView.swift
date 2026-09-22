import SwiftUI
import SwiftData

struct TeamCodeItem: Identifiable, Hashable {
    var id: String
    var category: String
    var code: String
    var meaning: String
    var why: String
    var how: String
}

enum CodeCatalog {
    static let categories: [(id: String, name: String, blurb: String)] = [
        ("all", "All", "Every team call in one list."),
        ("standard", "Team standard", "Same meaning on every field — these do not change with the layout."),
        ("layoutc", "Layout-centric", "Meaning shifts with the field — re-confirm on each new layout."),
        ("prepoint", "Pre-point", "Called before the buzzer — sets the breakout."),
        ("sides", "Side names", "Fixed side names so a call never depends on who is facing which way."),
        ("breakout", "Breakout", "Off-the-break lanes, runs and who takes what."),
        ("ingame", "In-point", "Mid-point movement, bumps, trades and rotations."),
        ("zone", "Zone", "Who owns which piece of the field and what they cover."),
        ("endgame", "End-game", "Closeout with a body or clock advantage — or down bodies."),
        ("penalty", "Penalty / ref", "Playing a man up or down, and ref situations."),
        ("clock", "Clock / timeout", "Managing the point clock, timeouts and substitutions."),
        ("safety", "Abort / safety", "Kill the point, abort a run, safety calls."),
    ]

    /// Seed meanings from the coach HTML (code words are blank for the team to fill).
    static let seed: [TeamCodeItem] = [
        .init(id: "s-lucy", category: "standard", code: "", meaning: "Kill off left.", why: "", how: ""),
        .init(id: "s-ricky", category: "standard", code: "", meaning: "Kill off right.", why: "", how: ""),
        .init(id: "s-charlie", category: "standard", code: "", meaning: "Kill out of the center.", why: "", how: ""),
        .init(id: "s-danger", category: "standard", code: "", meaning: "Caution — them being in the Doritos.", why: "", how: "DANGER is also a pre-point call meaning D-side runner. Context decides."),
        .init(id: "s-redalert", category: "standard", code: "", meaning: "Caution — them being in the snake.", why: "", how: ""),
        .init(id: "s-yellow", category: "standard", code: "", meaning: "Caution — possible body in center.", why: "", how: "YELLOW is also a pre-point call meaning center runner. Context decides."),
        .init(id: "s-iso", category: "standard", code: "", meaning: "Isolate / pinch X body.", why: "", how: ""),
        .init(id: "s-widest", category: "standard", code: "", meaning: "Widest bunker on this side. Big Baby = baby widest.", why: "", how: ""),
        .init(id: "s-snake", category: "standard", code: "", meaning: "We have a body in the snake.", why: "", how: ""),
        .init(id: "s-dorito", category: "standard", code: "", meaning: "We have a body up the Doritos.", why: "", how: ""),
        .init(id: "s-other", category: "standard", code: "", meaning: "Other side of your bunker.", why: "", how: ""),
        .init(id: "s-stab", category: "standard", code: "", meaning: "Go stab X person.", why: "", how: ""),
        .init(id: "s-home", category: "standard", code: "", meaning: "Person on our side of the field.", why: "", how: ""),
        .init(id: "s-paint", category: "standard", code: "", meaning: "Low on paint.", why: "", how: ""),
        .init(id: "s-gundown", category: "standard", code: "", meaning: "Gun down.", why: "", how: ""),
        .init(id: "s-bad", category: "standard", code: "", meaning: "Bad situation — make something happen quickly.", why: "", how: ""),
        .init(id: "s-money", category: "standard", code: "", meaning: "X player has the ball.", why: "", how: ""),
        .init(id: "s-fiveup", category: "standard", code: "", meaning: "We are five up.", why: "", how: ""),
        .init(id: "s-looks", category: "standard", code: "", meaning: "Looking snake way.", why: "", how: ""),
        .init(id: "s-lookd", category: "standard", code: "", meaning: "Looking D side.", why: "", how: ""),
        .init(id: "s-wins", category: "standard", code: "", meaning: "Win from snake side — go all the way, you have containment.", why: "", how: ""),
        .init(id: "s-wind", category: "standard", code: "", meaning: "Win from D side — go all the way, you have containment.", why: "", how: ""),
        .init(id: "l-emptys", category: "layoutc", code: "", meaning: "No one in snake.", why: "", how: ""),
        .init(id: "l-emptyd", category: "layoutc", code: "", meaning: "No one in Doritos.", why: "", how: ""),
        .init(id: "l-clears", category: "layoutc", code: "", meaning: "No one snake side at all.", why: "", how: ""),
        .init(id: "p-hold", category: "prepoint", code: "", meaning: "Hold & Read break.", why: "Safest opener when up or even.", how: "All five to nearest primary; read the flood."),
        .init(id: "p-snake", category: "prepoint", code: "", meaning: "Snake stack break.", why: "Need the bottom wire.", how: "Runner + MW + GP; contain dorito."),
        .init(id: "p-flood", category: "prepoint", code: "", meaning: "Dorito flood break.", why: "Need the top wire.", how: "Two forward MD + center insert."),
        .init(id: "b-race", category: "breakout", code: "", meaning: "Race the GP / key bunker.", why: "", how: ""),
        .init(id: "i-bump", category: "ingame", code: "", meaning: "Bump / rotate one body.", why: "", how: ""),
        .init(id: "e-close", category: "endgame", code: "", meaning: "Closeout — mirror and trade clean.", why: "", how: ""),
        .init(id: "c-to", category: "clock", code: "", meaning: "Take the timeout.", why: "", how: ""),
        .init(id: "x-abort", category: "safety", code: "", meaning: "Abort the run — stay alive.", why: "", how: ""),
    ]
}

struct CodesView: View {
    @State private var items: [TeamCodeItem] = CodeCatalog.seed
    @State private var category: String = "all"
    @State private var query: String = ""
    @State private var editing: TeamCodeItem? = nil

    private var filtered: [TeamCodeItem] {
        items.filter { item in
            (category == "all" || item.category == category) &&
            (query.isEmpty || [item.code, item.meaning, item.why, item.how].joined(separator: " ").localizedCaseInsensitiveContains(query))
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("Team codes")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.glText)
                Text("Your team’s calls in one place — what each one means, why it exists, and how to run it. Everything is editable.")
                    .font(.subheadline)
                    .foregroundStyle(Color.glMuted)

                HStack(spacing: 8) {
                    TextField("Search codes", text: $query)
                        .textFieldStyle(.roundedBorder)
                    Button {
                        editing = TeamCodeItem(id: UUID().uuidString, category: "prepoint", code: "", meaning: "", why: "", how: "")
                    } label: {
                        Label("New", systemImage: "plus")
                            .font(.subheadline.weight(.semibold))
                    }
                    .buttonStyle(GLPrimaryButton())
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(CodeCatalog.categories, id: \.id) { cat in
                            let count = cat.id == "all" ? items.count : items.filter { $0.category == cat.id }.count
                            Button {
                                category = cat.id
                            } label: {
                                Text("\(cat.name) (\(count))")
                                    .font(.caption.weight(.semibold))
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 7)
                                    .background(category == cat.id ? Color.glBlue : Color.glPanel2)
                                    .foregroundStyle(category == cat.id ? .white : Color.glChalk)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                if category != "all", let blurb = CodeCatalog.categories.first(where: { $0.id == category })?.blurb {
                    Text(blurb)
                        .font(.caption)
                        .foregroundStyle(Color.glChalk)
                }

                ForEach(filtered) { item in
                    Button {
                        editing = item
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(item.code.isEmpty ? "— set code —" : item.code.uppercased())
                                    .font(.subheadline.weight(.black))
                                    .foregroundStyle(item.code.isEmpty ? Color.glDim : Color.glGold)
                                Spacer()
                                Text(catName(item.category))
                                    .font(.caption2)
                                    .foregroundStyle(Color.glMuted)
                            }
                            Text(item.meaning)
                                .font(.subheadline)
                                .foregroundStyle(Color.glText)
                                .multilineTextAlignment(.leading)
                            if !item.how.isEmpty {
                                Text(item.how)
                                    .font(.caption)
                                    .foregroundStyle(Color.glMuted)
                                    .multilineTextAlignment(.leading)
                            }
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.glPanel)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(14)
        }
        .background(Color.glNavy)
        .navigationTitle("Codes")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $editing) { item in
            CodeEditorSheet(item: item) { updated in
                if let idx = items.firstIndex(where: { $0.id == updated.id }) {
                    items[idx] = updated
                } else {
                    items.insert(updated, at: 0)
                }
                editing = nil
            } onDelete: {
                items.removeAll { $0.id == item.id }
                editing = nil
            }
        }
    }

    private func catName(_ id: String) -> String {
        CodeCatalog.categories.first { $0.id == id }?.name ?? id
    }
}

struct CodeEditorSheet: View {
    @State var item: TeamCodeItem
    var onSave: (TeamCodeItem) -> Void
    var onDelete: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Code word") {
                    TextField("CODE WORD", text: $item.code)
                        .textInputAutocapitalization(.characters)
                    Picker("Category", selection: $item.category) {
                        ForEach(CodeCatalog.categories.filter { $0.id != "all" }, id: \.id) { cat in
                            Text(cat.name).tag(cat.id)
                        }
                    }
                }
                Section("What it means") {
                    TextField("Meaning", text: $item.meaning, axis: .vertical)
                        .lineLimit(3...6)
                }
                Section("Why we use it") {
                    TextField("Why", text: $item.why, axis: .vertical)
                        .lineLimit(2...4)
                }
                Section("How to run it") {
                    TextField("How", text: $item.how, axis: .vertical)
                        .lineLimit(2...4)
                }
                Section {
                    Button("Delete code", role: .destructive, action: onDelete)
                }
            }
            .navigationTitle(item.code.isEmpty ? "New code" : item.code.uppercased())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let check = GridSecurity.requireCode(item.code)
                        guard check.isOK else { return }
                        var s = item
                        s.code = GridSecurity.sanitize(item.code, max: GridSecurity.Limits.code)
                        s.meaning = GridSecurity.sanitize(item.meaning, max: GridSecurity.Limits.notes)
                        s.why = GridSecurity.sanitize(item.why, max: GridSecurity.Limits.notes)
                        s.how = GridSecurity.sanitize(item.how, max: GridSecurity.Limits.notes)
                        onSave(s)
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
