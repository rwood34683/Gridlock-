import SwiftUI
import SwiftData

// MARK: - Playbook coaching data (ported from web coach app)

struct BreakScript: Identifiable, Hashable {
    let id: String
    let name: String
    let detail: String
    let aggression: Int   // 1...5 dots
    let players: [RoleDirective]
}

struct RoleDirective: Identifiable, Hashable {
    let id: String
    let number: Int
    let label: String       // e.g. "snake primary"
    let wire: String        // S / C / D / back
    var face: Bool
    var shot: Bool
    var pjs: Bool           // P/S zone
}

enum GameSituation: String, CaseIterable, Identifiable {
    case up = "Up"
    case even = "Even"
    case down = "Down"
    case mustWin = "Must-win"
    var id: String { rawValue }
}

enum PlaybookScripts {
    /// Exact PLAYMETA list from gridlock_coach.html (coach edition)
    static let all: [BreakScript] = [
        BreakScript(id: "base", name: "Balanced Break",
            detail: "Wire-to-wire spread: snake MW + GP, a 50 body, a forward dorito, a back lane. The default — flexible, reacts to the other team.",
            aggression: 3, players: roles([
                (1, "snake MW", "S"), (2, "GP race", "S"), (3, "center 50", "C"),
                (4, "dorito forward", "D"), (5, "back lane", "back")
            ])),
        BreakScript(id: "snake", name: "Snake Stack",
            detail: "Overload the bottom: deep runner into the snake, MW + GP support, hold the dorito with one. Wins if the runner gets the snake and the GP.",
            aggression: 4, players: roles([
                (1, "snake runner", "S"), (2, "snake MW", "S"), (3, "GP support", "S"),
                (4, "center hold", "C"), (5, "dorito contain", "D")
            ])),
        BreakScript(id: "flood", name: "Dorito Flood",
            detail: "Push the top wire: two forward MDs + a center insert, snake side just contains. Pressures the dorito and gets up-field early.",
            aggression: 4, players: roles([
                (1, "snake contain", "S"), (2, "center insert", "C"), (3, "dorito primary", "D"),
                (4, "dorito forward", "D"), (5, "back support", "back")
            ])),
        BreakScript(id: "tower", name: "Tower / Center",
            detail: "Take the 50 first: MT + tree at center to choke the cross, GP for snake-side pressure, one forward dorito. Controls the middle knife fight.",
            aggression: 3, players: roles([
                (1, "GP pressure", "S"), (2, "MT 50", "C"), (3, "tree / center", "C"),
                (4, "dorito forward", "D"), (5, "back lane", "back")
            ])),
        BreakScript(id: "blitz", name: "Blitz",
            detail: "All gas: snake sprint + MW push + MD sprint to get bodies up-field in the first seconds. High risk, high reward off the buzzer.",
            aggression: 5, players: roles([
                (1, "snake sprint", "S"), (2, "MW push", "S"), (3, "center push", "C"),
                (4, "MD sprint", "D"), (5, "trail", "back")
            ])),
        BreakScript(id: "clean", name: "Clean / Lane Trade",
            detail: "Lane the middle from the 50, trade bodies even, win on attrition and counts. Safe vs aggressive opponents.",
            aggression: 2, players: roles([
                (1, "snake contain", "S"), (2, "lane shooter", "C"), (3, "50 lane", "C"),
                (4, "dorito contain", "D"), (5, "back lane", "back")
            ])),
        BreakScript(id: "cons", name: "Conservative",
            detail: "Play for 5 alive & clean lanes: two back shooters laning from the buzzer, a contained snake (cake), a safe center cylinder for cross-field, a contained dorito. No GP race, no tower climb, no flood — bait the over-commit and win on counts.",
            aggression: 1, players: roles([
                (1, "cake / snake contain", "S"), (2, "center cylinder", "C"), (3, "dorito contain", "D"),
                (4, "back lane", "back"), (5, "back lane 2", "back")
            ])),
        BreakScript(id: "hold", name: "Hold & Read",
            detail: "No commit off the buzzer — all five to their nearest primary, read which wire the other team floods, then react. The safest opener; wins on their over-commit.",
            aggression: 1, players: roles([
                (1, "snake primary", "S"), (2, "snake contain", "S"), (3, "center C hold", "C"),
                (4, "dorito primary", "D"), (5, "read the break", "back")
            ])),
        BreakScript(id: "contain", name: "Contain Both Wires",
            detail: "Squeeze both wires and hold the center: contain the snake, contain the dorito, one in the center cross. No races — bait the push and lane it.",
            aggression: 2, players: roles([
                (1, "snake contain", "S"), (2, "snake support", "S"), (3, "center cross", "C"),
                (4, "dorito contain", "D"), (5, "dorito support", "D")
            ])),
        BreakScript(id: "lanes", name: "Lock the Lanes",
            detail: "Two back shooters lane the cross-field from the buzzer, an MT and center hold the middle, snake contained. Trade even, win on counts vs an aggressive team.",
            aggression: 2, players: roles([
                (1, "snake contain", "S"), (2, "MT hold", "C"), (3, "center", "C"),
                (4, "back lane S", "back"), (5, "back lane D", "back")
            ])),
        BreakScript(id: "counter", name: "Counter Break",
            detail: "Hold primaries a beat, read the committed side, then counter it. A patient break for when you are even or up bodies and want them to move first.",
            aggression: 2, players: roles([
                (1, "snake primary hold", "S"), (2, "center read", "C"), (3, "dorito primary hold", "D"),
                (4, "counter runner", "S"), (5, "back read", "back")
            ])),
        BreakScript(id: "split", name: "Wire Split",
            detail: "Balanced split — one to the snake MW, three through the center (MT, C, tree), one forward dorito. Controls the middle without over-extending either wire.",
            aggression: 3, players: roles([
                (1, "snake MW", "S"), (2, "MT", "C"), (3, "center C", "C"),
                (4, "tree", "C"), (5, "dorito forward", "D")
            ])),
    ]

    private static func roles(_ items: [(Int, String, String)]) -> [RoleDirective] {
        items.map { RoleDirective(id: "r\($0.0)", number: $0.0, label: $0.1, wire: $0.2, face: false, shot: false, pjs: false) }
    }

    static func suggested(for situation: GameSituation) -> BreakScript {
        switch situation {
        case .up:      return all.first { $0.id == "hold" } ?? all[0]
        case .even:    return all.first { $0.id == "base" } ?? all[0]
        case .down:    return all.first { $0.id == "counter" } ?? all[0]
        case .mustWin: return all.first { $0.id == "blitz" } ?? all[0]
        }
    }
}

// MARK: - Playbook View

struct PlaybookView: View {
    @Environment(AppState.self) private var state
    @Environment(\.modelContext) private var modelContext
    @Environment(\.horizontalSizeClass) private var sizeClass
    @Query(sort: \Play.createdAt, order: .reverse) private var plays: [Play]

    @State private var situation: GameSituation = .even
    @State private var activeScriptId: String = "hold"
    @State private var roles: [RoleDirective] = PlaybookScripts.all.first?.players ?? []
    @State private var showScriptPicker = false
    @State private var gunsUp = true
    @State private var showZones = false
    @State private var mirrored = false
    @State private var replayPulse = false

    private var fieldHeight: CGFloat {
        sizeClass == .regular ? 420 : 260
    }

    private var activeScript: BreakScript {
        PlaybookScripts.all.first { $0.id == activeScriptId } ?? PlaybookScripts.all[0]
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("1. Pick the field · 2. Pick the break · 3. Log it")
                    .font(.caption)
                    .foregroundStyle(Color.glMuted)

                ZStack {
                    FieldCanvasView(layoutKey: state.selectedLayoutKey)
                    BreakPathOverlay(
                        scriptId: activeScriptId,
                        mirrored: mirrored,
                        gunsUp: gunsUp,
                        playing: pathPlaying
                    )
                }
                .aspectRatio(178.0/150.0, contentMode: .fit)
                .frame(maxHeight: fieldHeight)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.glBorder.opacity(0.6), lineWidth: 1)
                )
                .scaleEffect(x: mirrored ? -1 : 1, y: 1)
                .animation(.easeInOut(duration: 0.25), value: mirrored)

                // HTML play top controls
                fieldControls

                situationBar
                suggestedBar
                actionChips
                scriptCard
                rolesSection
                savedBreakouts

                Text("\(Brand.product) by \(Brand.org) — training aid only. Officials govern the live call.")
                    .font(.caption2)
                    .foregroundStyle(Color.glDim)
                    .padding(.top, 4)
            }
            .padding(GLSpace.screen)
        }
        .glScreen()
        .navigationTitle("Playbook")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showScriptPicker) { scriptPickerSheet }
        .onChange(of: situation) { _, new in
            let s = PlaybookScripts.suggested(for: new)
            activeScriptId = s.id
            roles = s.players
            pathPlaying = true
        }
        .onChange(of: activeScriptId) { _, _ in
            pathPlaying = true
        }
    }

    private var fieldControls: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button {
                    mirrored.toggle()
                } label: {
                    Text(mirrored ? "Mirror ⇄ on" : "Mirror ⇄")
                }
                .glChip(selected: mirrored)

                Button {
                    gunsUp.toggle()
                } label: {
                    Text(gunsUp ? "Guns up: on" : "Guns up: off")
                }
                .glChip(selected: gunsUp)

                Button {
                    showZones.toggle()
                } label: {
                    Text(showZones ? "Zones: on" : "Zones: off")
                }
                .glChip(selected: showZones)

                Button {
                    pathPlaying.toggle()
                } label: {
                    Text(pathPlaying ? "⏸ Pause path" : "▶ Play path")
                }
                .glChip(selected: pathPlaying)

                Button {
                    pathPlaying = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                        pathPlaying = true
                    }
                } label: {
                    Text("↻ Restart")
                }
                .glChip(selected: false)
            }
        }
    }

    private var situationBar: some View {

        VStack(alignment: .leading, spacing: 8) {
            Text("Situation").glSectionTitle()
            HStack(spacing: 8) {
                ForEach(GameSituation.allCases) { s in
                    Button {
                        situation = s
                    } label: {
                        Text(s.rawValue)
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(situation == s ? Color.glBlue : Color.glPanel2)
                            .foregroundStyle(situation == s ? .white : Color.glChalk)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var suggestedBar: some View {
        let suggested = PlaybookScripts.suggested(for: situation)
        return VStack(alignment: .leading, spacing: 6) {
            Text(situationHint)
                .font(.subheadline)
                .foregroundStyle(Color.glText)
            HStack(spacing: 8) {
                Text("Suggested")
                    .font(.caption)
                    .foregroundStyle(Color.glMuted)
                aggressionDots(suggested.aggression, filled: Color.glGold)
                Text("this play is")
                    .font(.caption)
                    .foregroundStyle(Color.glMuted)
                aggressionDots(activeScript.aggression, filled: Color.glGold)
            }
        }
        .padding(12)
        .background(Color.glPanel)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var situationHint: String {
        switch situation {
        case .up:      return "Up bodies — take the smart break."
        case .even:    return "Balanced — take the smart break."
        case .down:    return "Down bodies — need a lane or a steal."
        case .mustWin: return "Must-win — commit and pressure a wire."
        }
    }

    private func aggressionDots(_ n: Int, filled: Color) -> some View {
        HStack(spacing: 3) {
            ForEach(0..<5, id: \.self) { i in
                Circle()
                    .fill(i < n ? filled : Color.glDim.opacity(0.4))
                    .frame(width: 8, height: 8)
            }
        }
    }

    private var actionChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip("Active set", icon: "star.fill", active: true) {}
                chip("Script", icon: "list.bullet.rectangle") { showScriptPicker = true }
                chip("Counter", icon: "arrow.triangle.2.circlepath") {
                    activeScriptId = "counter"
                    roles = PlaybookScripts.all.first { $0.id == "counter" }?.players ?? roles
                }
                chip("Roles", icon: "person.3") {}
                chip("Cards", icon: "rectangle.stack") {}
                chip("Opp", icon: "shield") {}
                chip("Rep", icon: "bolt.fill") {}
            }
        }
    }

    private func chip(_ title: String, icon: String, active: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(active ? Color.glBlue : Color.glPanel2)
                .foregroundStyle(active ? .white : Color.glChalk)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private var scriptCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(activeScript.name)
                    .font(.headline)
                    .foregroundStyle(Color.glSuccess)
                Spacer()
                aggressionDots(activeScript.aggression, filled: Color.glSuccess)
                Text(aggressionLabel(activeScript.aggression))
                    .font(.caption)
                    .foregroundStyle(Color.glMuted)
            }
            Text(activeScript.detail)
                .font(.subheadline)
                .foregroundStyle(Color.glText)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 10) {
                Button {
                    logBreak()
                } label: {
                    Label("Log break", systemImage: "checkmark.circle.fill")
                        .font(.subheadline.weight(.bold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(GLPrimaryButton())

                Button {
                    showScriptPicker = true
                } label: {
                    Label("Change", systemImage: "arrow.left.arrow.right")
                        .font(.subheadline.weight(.semibold))
                }
                .buttonStyle(GLSecondaryButton())
            }
        }
        .padding(14)
        .background(Color.glPanel)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.glBorder, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func aggressionLabel(_ n: Int) -> String {
        switch n {
        case 1: return "very conservative"
        case 2: return "patient"
        case 3: return "balanced"
        case 4: return "aggressive"
        default: return "max pressure"
        }
    }

    private var rolesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("DIRECT YOUR PLAYERS")
                .font(.caption2.weight(.bold))
                .foregroundStyle(Color.glMuted)
            Text("Face · Shot · P/S · Zone")
                .font(.caption)
                .foregroundStyle(Color.glDim)

            ForEach($roles) { $role in
                roleRow($role)
            }
        }
        .padding(14)
        .background(Color.glPanel)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func roleRow(_ role: Binding<RoleDirective>) -> some View {
        HStack(spacing: 10) {
            Text("\(role.wrappedValue.number)")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(Color.glGold)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(role.wrappedValue.label)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.glText)
                Text(wireLabel(role.wrappedValue.wire))
                    .font(.caption2)
                    .foregroundStyle(Color.glMuted)
            }

            Spacer()

            togglePill("face", isOn: role.face)
            togglePill("shot", isOn: role.shot)
            togglePill("P/S", isOn: role.pjs)
        }
        .padding(.vertical, 6)
    }

    private func togglePill(_ title: String, isOn: Binding<Bool>) -> some View {
        Button {
            isOn.wrappedValue.toggle()
        } label: {
            Text(title)
                .font(.caption2.weight(.bold))
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(isOn.wrappedValue ? Color.glBlue : Color.glPanel2)
                .foregroundStyle(isOn.wrappedValue ? .white : Color.glMuted)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func wireLabel(_ w: String) -> String {
        switch w {
        case "S": return "snake wire"
        case "D": return "dorito wire"
        case "C": return "center"
        case "back": return "back / lane"
        default: return w
        }
    }

    private var savedBreakouts: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Saved breakouts")
                    .font(.headline)
                    .foregroundStyle(Color.glText)
                Spacer()
                Button { logBreak() } label: { Image(systemName: "plus") }
            }

            if plays.isEmpty {
                Text("Log a break above or tap + to save one.")
                    .font(.caption)
                    .foregroundStyle(Color.glMuted)
            } else {
                ForEach(plays, id: \.id) { play in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(play.name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Color.glText)
                            Text(play.notes)
                                .font(.caption)
                                .foregroundStyle(Color.glMuted)
                                .lineLimit(1)
                        }
                        Spacer()
                        if state.calledPlayId == play.id {
                            Text("CALLED")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(Color.glNavy)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.glGold, in: Capsule())
                        }
                    }
                    .padding(10)
                    .background(Color.glPanel2)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .onTapGesture {
                        state.selectedPlayId = play.id
                        state.calledPlayId = play.id
                    }
                }
            }
        }
    }

    private var scriptPickerSheet: some View {
        NavigationStack {
            List {
                ForEach(PlaybookScripts.all) { script in
                    Button {
                        activeScriptId = script.id
                        roles = script.players
                        showScriptPicker = false
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(script.name)
                                    .font(.headline)
                                    .foregroundStyle(Color.glText)
                                Spacer()
                                aggressionDots(script.aggression, filled: Color.glGold)
                            }
                            Text(script.detail)
                                .font(.caption)
                                .foregroundStyle(Color.glMuted)
                                .lineLimit(3)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .glScreen()
            .navigationTitle("Break scripts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { showScriptPicker = false }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private func logBreak() {
        let play = Play(
            name: "\(activeScript.name) · \(situation.rawValue)",
            layoutKey: state.selectedLayoutKey,
            notes: activeScript.detail
        )
        modelContext.insert(play)
        GridlockAgent.save(modelContext, label: "play")
        state.selectedPlayId = play.id
        state.calledPlayId = play.id
    }
}

