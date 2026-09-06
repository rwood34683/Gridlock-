import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var state = AppState()

    var body: some View {
        Group {
            if sizeClass == .regular {
                iPadRoot
            } else {
                iPhoneRoot
            }
        }
        .glScreen()
        .environment(state)
        .preferredColorScheme(state.themeMode.preferredScheme)
        .onAppear { GLTheme.mode = state.themeMode }
        .sheet(isPresented: $state.showSettings) {
            SettingsSheet(state: state)
                .presentationDetents(sizeClass == .regular ? [.large] : [.medium, .large])
        }
        .sheet(isPresented: $state.showLayoutPicker) {
            LayoutPickerSheet(state: state)
                .presentationDetents(sizeClass == .regular ? [.medium, .large] : [.medium])
        }
    }

    // MARK: - iPhone: bottom tabs

    private var iPhoneRoot: some View {
        VStack(spacing: 0) {
            HeaderBar(state: state)
            TabView {
                NavigationStack {
                    PlaybookView()
                }
                .tabItem { Label("Playbook", systemImage: "map") }

                NavigationStack {
                    TallyView()
                }
                .tabItem { Label("Tally", systemImage: "list.number") }

                NavigationStack {
                    ScoutView()
                }
                .tabItem { Label("Scout", systemImage: "binoculars") }

                NavigationStack {
                    SightlinesView()
                }
                .tabItem { Label("Sightlines", systemImage: "eye") }

                NavigationStack {
                    MoreMenuView(state: state)
                }
                .tabItem { Label("More", systemImage: "ellipsis.circle") }
            }
            .tint(Color.glAccent)
        }
    }


    // MARK: - iPad: sidebar + detail

    private var iPadRoot: some View {
        NavigationSplitView {
            List {
                Section {
                    ForEach(AppTab.primaryTabs) { tab in
                        Button {
                            state.selectedTab = tab
                        } label: {
                            Label(tab.label, systemImage: tab.systemImage)
                        }
                        .foregroundStyle(state.selectedTab == tab ? Color.glAccent : Color.glText)
                    }
                } header: {
                    Text("Field")
                }

                Section {
                    ForEach(AppTab.rosterTabs) { tab in
                        Button {
                            state.selectedTab = tab
                        } label: {
                            Label(tab.label, systemImage: tab.systemImage)
                        }
                        .foregroundStyle(state.selectedTab == tab ? Color.glAccent : Color.glText)
                    }
                } header: {
                    Text("Team")
                }

                Section {
                    ForEach(AppTab.systemTabs) { tab in
                        Button {
                            state.selectedTab = tab
                        } label: {
                            Label(tab.label, systemImage: tab.systemImage)
                        }
                        .foregroundStyle(state.selectedTab == tab ? Color.glAccent : Color.glText)
                    }
                } header: {
                    Text("System")
                }
            }
            .listStyle(.sidebar)
            .navigationTitle(Brand.product)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        state.showLayoutPicker = true
                    } label: {
                        Image(systemName: "map")
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        state.showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
        } detail: {
            NavigationStack {
                detailFor(state.selectedTab)
                    .toolbar {
                        ToolbarItem(placement: .principal) {
                            VStack(spacing: 0) {
                                Text(Brand.shortTag)
                                    .font(.headline)
                                Text(layoutSubtitle)
                                    .font(.caption2)
                                    .foregroundStyle(Color.glMuted)
                            }
                        }
                    }
            }
        }
        .navigationSplitViewStyle(.balanced)
        .navigationSplitViewColumnWidth(min: 220, ideal: 260, max: 320)
        .tint(Color.glAccent)
            .toolbarBackground(Color.glNavy.opacity(0.95), for: .tabBar)
            .toolbarBackground(.visible, for: .tabBar)
    }

    private var layoutSubtitle: String {
        LayoutInfo.builtIn.first(where: { $0.key == state.selectedLayoutKey })?.name
            ?? state.selectedLayoutKey.uppercased()
    }

    @ViewBuilder
    private func detailFor(_ tab: AppTab) -> some View {
        switch tab {
        case .playbook:   PlaybookView()
        case .tally:      TallyView()
        case .scout:      ScoutView()
        case .sightlines: SightlinesView()
        case .walk:       WalkView()
        case .lineups:    LineupsView()
        case .movement:   MovementView()
        case .assess:     AssessView()
        case .codes:      CodesView()
        case .team:       TeamView()
        case .messages:   MessagesView()
        case .nexus:      NexusView()
        }
    }
}

// MARK: - Header (iPhone)

struct HeaderBar: View {
    @Bindable var state: AppState

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(Brand.product)
                    .font(.system(size: 15, weight: .bold))
                    .tracking(1.2)
                    .foregroundStyle(Color.glText)
                Text(Brand.tagline)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(Color.glMuted)
            }

            Spacer(minLength: 8)

            layoutPill

            iconButton("map") { state.showLayoutPicker = true }
            iconButton("gearshape") { state.showSettings = true }
        }
        .padding(.horizontal, GLSpace.screen)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial.opacity(0.35))
        .background(Color.glNavy.opacity(0.92))
    }

    private var layoutPill: some View {
        Button {
            state.showLayoutPicker = true
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "sportscourt")
                    .font(.system(size: 10, weight: .semibold))
                Text(layoutShort)
                    .font(.system(size: 11, weight: .semibold))
                    .lineLimit(1)
            }
            .foregroundStyle(Color.glChalk)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.glPanel2, in: Capsule())
            .overlay(Capsule().stroke(Color.glBorder.opacity(0.4), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private var layoutShort: String {
        LayoutInfo.builtIn.first(where: { $0.key == state.selectedLayoutKey })?.name
            .components(separatedBy: "·").first?
            .trimmingCharacters(in: .whitespaces)
            ?? state.selectedLayoutKey.uppercased()
    }

    private func iconButton(_ system: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: system)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Color.glText)
                .frame(width: 34, height: 34)
                .background(Color.glPanel2, in: Circle())
                .overlay(Circle().stroke(Color.glBorder.opacity(0.35), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

struct SettingsSheet: View {
    @Bindable var state: AppState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Coach") {
                    TextField("Coach name", text: $state.coachName)
                    Toggle("Coach mode", isOn: $state.isCoach)
                }
                Section("Appearance") {
                    Picker("Theme", selection: $state.themeMode) {
                        ForEach(ThemeMode.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                Section("Session") {
                    if let code = state.activeTeamCode {
                        LabeledContent("Team code", value: code)
                    } else {
                        Text("No active team")
                            .foregroundStyle(.secondary)
                    }
                }
                Section("About") {
                    LabeledContent("Edition", value: Brand.edition)
                    LabeledContent("Publisher", value: Brand.org)
                    LabeledContent("Version", value: Brand.version)
                    LabeledContent("App version", value: "2027.01")
                    Text(Brand.legal)
                    Text(Brand.copyright)
                        .font(.caption2)
                        .foregroundStyle(Color.glDim)
                    Text(Brand.licenseShort)
                        .font(.caption2)
                        .foregroundStyle(Color.glDim)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct LayoutPickerSheet: View {
    @Bindable var state: AppState
    @Environment(\.dismiss) private var dismiss
    private var feed: EventFeedService { EventFeedService.shared }
    @State private var showAddEvent = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if feed.isLoading {
                        ProgressView("Refreshing…")
                    }
                    if let err = feed.lastError {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Button {
                        showAddEvent = true
                    } label: {
                        Label("Add event", systemImage: "plus.circle.fill")
                    }
                }

                Section {
                    ForEach(feed.upcoming.prefix(40)) { event in
                        eventRow(event)
                    }
                } header: {
                    Text("Upcoming events")
                } footer: {
                    Text("Built-in major events + events you add. Optional remote catalog when your feed URL is live. Field maps are separate from registration listings.")
                }

                if !feed.coachEvents.isEmpty {
                    Section("Your added events") {
                        ForEach(feed.coachEvents) { event in
                            eventRow(event)
                                .swipeActions {
                                    Button(role: .destructive) {
                                        feed.removeCoachEvent(id: event.id)
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                        }
                    }
                }

                Section("Built-in layouts") {
                    ForEach(LayoutInfo.builtIn) { layout in
                        Button {
                            state.selectedLayoutKey = layout.key
                            dismiss()
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(layout.name)
                                        .font(.headline)
                                        .foregroundStyle(Color.glText)
                                    Text(layout.subtitle)
                                        .font(.caption)
                                        .foregroundStyle(Color.glMuted)
                                }
                                Spacer()
                                if state.selectedLayoutKey == layout.key {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(Color.glAccent)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Events & layouts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        Task { await feed.refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .task { await feed.refresh() }
            .sheet(isPresented: $showAddEvent) {
                AddEventSheet(feed: feed) { event in
                    if let key = event.layoutKey {
                        state.selectedLayoutKey = key
                    }
                    showAddEvent = false
                }
            }
        }
    }

    @ViewBuilder
    private func eventRow(_ event: GridEvent) -> some View {
        Button {
            if let key = event.layoutKey {
                state.selectedLayoutKey = key
            }
            dismiss()
        } label: {
            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(event.name)
                        .font(.headline)
                        .foregroundStyle(Color.glText)
                    if event.source == "coach" {
                        Text("YOU")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(Color.glNavy)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.glGold, in: Capsule())
                    }
                }
                Text("\(event.league) · \(event.locationLine)")
                    .font(.caption)
                    .foregroundStyle(Color.glMuted)
                Text("\(event.startDate) → \(event.endDate)")
                    .font(.caption2)
                    .foregroundStyle(Color.glDim)
                if let key = event.layoutKey {
                    Text("Layout linked: \(key.uppercased())")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.glGold)
                } else {
                    Text("No field map linked — pick a built-in layout below if needed")
                        .font(.caption2)
                        .foregroundStyle(Color.glDim)
                }
            }
            .padding(.vertical, 2)
        }
    }
}

// MARK: - Coach adds an event (public facts they already know)

struct AddEventSheet: View {
    var feed: EventFeedService
    var onSaved: (GridEvent) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var league = ""
    @State private var city = ""
    @State private var region = ""
    @State private var country = "USA"
    @State private var start = Date()
    @State private var end = Date()
    @State private var layoutKey = ""
    @State private var errorMessage: String?

    private let layoutOptions = [""] + LayoutInfo.builtIn.map(\.key)

    var body: some View {
        NavigationStack {
            Form {
                Section("Event") {
                    TextField("Event name", text: $name)
                    TextField("League (NXL, ICPL, local…)", text: $league)
                }
                Section("When") {
                    DatePicker("Start", selection: $start, displayedComponents: .date)
                    DatePicker("End", selection: $end, displayedComponents: .date)
                }
                Section("Where") {
                    TextField("City", text: $city)
                    TextField("State / region", text: $region)
                    TextField("Country", text: $country)
                }
                Section("Field map (optional)") {
                    Picker("Linked layout", selection: $layoutKey) {
                        Text("None yet").tag("")
                        ForEach(LayoutInfo.builtIn) { layout in
                            Text(layout.name).tag(layout.key)
                        }
                    }
                    Text("Only set this when you have a real bunker map for that event.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Add event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .alert("Can’t save", isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button("OK", role: .cancel) { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
        .preferredColorScheme(.dark)
    }

    private func save() {
        guard AttackDefense.allowSave(AttackDefense.Action.eventAdd) else {
            errorMessage = AttackDefense.rateLimitMessage
            return
        }
        let nameCheck = GridSecurity.requireName(name, label: "Event name")
        let startS = EventFeedService.dayString(from: start)
        let endS = EventFeedService.dayString(from: max(start, end))
        let dateCheck = GridSecurity.dateRange(start: startS, end: endS)
        let check = GridSecurity.combine(nameCheck, dateCheck)
        guard check.isOK else {
            errorMessage = check.firstMessage
            return
        }
        guard let event = feed.addCoachEvent(
            name: name,
            league: league,
            startDate: startS,
            endDate: endS,
            city: city,
            region: region,
            country: country,
            layoutKey: layoutKey.isEmpty ? nil : layoutKey
        ) else {
            errorMessage = "Couldn’t add event. Check the name and dates."
            return
        }
        onSaved(event)
        dismiss()
    }
}
