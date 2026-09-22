import SwiftUI

struct MovementView: View {
    @Environment(AppState.self) private var state
    @State private var entries: [(id: String, from: String, to: String, note: String)] = []
    @State private var fromBunker = ""
    @State private var toBunker = ""
    @State private var note = ""

    private var bunkerNames: [String] {
        let layout = BuiltInLayouts.cincinnati
        let names = Array(Set(layout.bunkers.map(\.name))).sorted()
        return names
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Movement")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.glText)
                Text("Track mid-point bumps, rotations, and trades on \(state.selectedLayoutKey.uppercased()).")
                    .font(.subheadline)
                    .foregroundStyle(Color.glMuted)

                FieldCanvasView(layoutKey: state.selectedLayoutKey)
                    .aspectRatio(178.0/150.0, contentMode: .fit)
                    .frame(maxHeight: 180)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.glBorder, lineWidth: 1))

                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        TextField("From", text: $fromBunker)
                            .textFieldStyle(.roundedBorder)
                        Image(systemName: "arrow.right")
                            .foregroundStyle(Color.glMuted)
                        TextField("To", text: $toBunker)
                            .textFieldStyle(.roundedBorder)
                    }
                    if !bunkerNames.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(bunkerNames, id: \.self) { name in
                                    Button(name) {
                                        if fromBunker.isEmpty { fromBunker = name }
                                        else { toBunker = name }
                                    }
                                    .font(.caption.weight(.semibold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 5)
                                    .background(Color.glPanel2)
                                    .foregroundStyle(Color.glChalk)
                                    .clipShape(Capsule())
                                }
                            }
                        }
                    }
                    TextField("Note", text: $note)
                        .textFieldStyle(.roundedBorder)
                    Button {
                        guard !fromBunker.isEmpty || !toBunker.isEmpty else { return }
                        entries.insert((UUID().uuidString, fromBunker, toBunker, note), at: 0)
                        fromBunker = ""; toBunker = ""; note = ""
                    } label: {
                        Label("Log movement", systemImage: "arrow.triangle.swap")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(GLPrimaryButton())
                }
                .padding(14)
                .background(Color.glPanel)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                ForEach(entries, id: \.id) { e in
                    HStack {
                        Text("\(e.from.isEmpty ? "?" : e.from) → \(e.to.isEmpty ? "?" : e.to)")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.glText)
                        Spacer()
                        if !e.note.isEmpty {
                            Text(e.note)
                                .font(.caption)
                                .foregroundStyle(Color.glMuted)
                                .lineLimit(1)
                        }
                    }
                    .padding(10)
                    .background(Color.glPanel2)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding(14)
        }
        .background(Color.glNavy)
        .navigationTitle("Movement")
        .navigationBarTitleDisplayMode(.inline)
    }
}
