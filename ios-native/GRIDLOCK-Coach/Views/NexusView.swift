import SwiftUI
import SwiftData

struct NexusView: View {
    @Environment(AppState.self) private var state
    @Environment(\.modelContext) private var modelContext
    @State private var health = GridlockAgent.Health(
        storeMode: "durable",
        teamCode: "—",
        layoutKey: "CIN",
        warnings: []
    )
    @State private var pressureResult = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Nexus")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.glText)
                Text("Status for this phone. Your logs stay on the device — nothing required online to coach a point.")
                    .font(.subheadline)
                    .foregroundStyle(Color.glMuted)

                card {
                    row("Edition", "\(Brand.edition) · v\(Brand.version)")
                    row("Store", health.storeMode)
                    row("Layout", health.layoutKey)
                    row("Team code", health.teamCode)
                    row("Coach", state.coachName)
                }

                if !health.warnings.isEmpty {
                    card {
                        Text("Agent warnings")
                            .font(.headline)
                            .foregroundStyle(Color.glAlert)
                        ForEach(health.warnings, id: \.self) { w in
                            Text("• \(w)")
                                .font(.caption)
                                .foregroundStyle(Color.glMuted)
                        }
                    }
                }

                card {
                    Text("Self-repair")
                        .font(.headline)
                        .foregroundStyle(Color.glText)
                    Text("If the local database fails after an update, GRIDLOCK rebuilds the store automatically so you can still coach the point.")
                        .font(.caption)
                        .foregroundStyle(Color.glMuted)
                    Button("Re-check health") {
                        health = GridlockAgent.health(state: state, storeMode: health.storeMode)
                    }
                    .buttonStyle(GLSecondaryButton())
                    .padding(.top, 6)
                }

                card {
                    Text("Advanced")
                        .font(.headline)
                        .foregroundStyle(Color.glText)
                    Text("Optional test for developers. Coaches can ignore this.")
                        .font(.caption)
                        .foregroundStyle(Color.glMuted)
                    if GridProtection.allowsDiagnosticsTools {
                        Button("Run readiness check") {
                            pressureResult = GridlockAgent.pressureTest(context: modelContext)
                        }
                        .buttonStyle(GLPrimaryButton())
                        .padding(.top, 4)
                        if !pressureResult.isEmpty {
                            Text(pressureResult)
                                .font(.caption2)
                                .foregroundStyle(Color.glSuccess)
                        }
                    }
                    if !GridProtection.environmentFlags().isEmpty {
                        Text("Env: \(GridProtection.environmentFlags().joined(separator: ", "))")
                            .font(.caption2)
                            .foregroundStyle(Color.glDim)
                    }
                    if !GridProtection.brandIntact() {
                        Text("Brand integrity check failed.")
                            .font(.caption2)
                            .foregroundStyle(Color.glAlert)
                    }
                }

                card {
                    Text("Event catalog")
                        .font(.headline)
                        .foregroundStyle(Color.glText)
                    Text("Upcoming events load from the UPRA feed (seeded offline). A rate-limited server job maintains the catalog from public league calendars — the app never mass-scrapes PBLeagues from 10k devices.")
                        .font(.caption)
                        .foregroundStyle(Color.glMuted)
                    HStack(spacing: 10) {
                        Button("Refresh feed") {
                            Task { await EventFeedService.shared.refresh() }
                        }
                        .buttonStyle(GLSecondaryButton())
                    }
                    Text("Add events from the layout picker (map icon → Add event). Coach-submitted events stay on this device.")
                        .font(.caption2)
                        .foregroundStyle(Color.glDim)
                        .padding(.top, 4)
                }

                card {
                    Text("Event load (10k coaches)")
                        .font(.headline)
                        .foregroundStyle(Color.glText)
                    Text("Offline-first: no shared server on the critical path. Each install owns its SwiftData store. UI lists are capped for phone hardware.")
                        .font(.caption)
                        .foregroundStyle(Color.glMuted)
                }

                Text(Brand.legal)
                Text(Brand.copyright)
                    .font(.caption2)
                    .foregroundStyle(Color.glDim)
                Text(GridProtection.licenseNotice)
                    .font(.caption2)
                    .foregroundStyle(Color.glDim)
            }
            .padding(14)
        }
        .glScreen()
        .navigationTitle("Nexus")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            health = GridlockAgent.health(state: state, storeMode: "durable")
        }
    }

    private func card<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            content()
        }
        .glCard()
    }

    private func row(_ k: String, _ v: String) -> some View {
        HStack {
            Text(k).font(.subheadline).foregroundStyle(Color.glMuted)
            Spacer()
            Text(v).font(.subheadline.weight(.semibold)).foregroundStyle(Color.glText)
        }
    }
}
