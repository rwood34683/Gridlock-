import SwiftUI

struct SightlinesView: View {
    @Environment(AppState.self) private var state
    @Environment(\.horizontalSizeClass) private var sizeClass

    @State private var selected: Int? = nil
    @State private var stance: SightStance = .stand

    private var layout: FieldLayout {
        BuiltInLayouts.layout(for: state.selectedLayoutKey)
    }

    private var bunkers: [Bunker] { layout.bunkers }

    private var clearIdx: [Int] {
        guard let s = selected else { return [] }
        return SightlineMath.clearTargets(from: s, bunkers: bunkers, stance: stance)
    }

    private var fieldHeight: CGFloat {
        sizeClass == .regular ? 440 : 280
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("Sightlines")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.glText)

                Text("Tap a bunker for every clear shot from true footprints. Layout: \(layout.name).")
                    .font(.subheadline)
                    .foregroundStyle(Color.glMuted)

                // Stance (HTML stand/crouch)
                HStack(spacing: 8) {
                    ForEach(SightStance.allCases) { s in
                        Button {
                            stance = s
                        } label: {
                            Text(s.title)
                        }
                        .glChip(selected: stance == s)
                    }
                    Spacer()
                    HStack(spacing: 10) {
                        legendSwatch(Color(red: 0.22, green: 0.82, blue: 0.48), "clear")
                        legendSwatch(Color(red: 0.75, green: 0.19, blue: 0.23), "blocked")
                    }
                }

                // Field + rays
                fieldBoard
                    .frame(maxHeight: fieldHeight)
                    .glFieldFrame()

                // Results
                if let s = selected, bunkers.indices.contains(s) {
                    let origin = bunkers[s]
                    let names = clearIdx.map { bunkers[$0].name }
                    VStack(alignment: .leading, spacing: 6) {
                        Text("From \(origin.name)  (\(Int(origin.x)), \(Int(origin.y)))")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(Color.glGold)
                        Text("Clear shots to \(clearIdx.count) of \(max(bunkers.count - 1, 0)) bunkers.")
                            .font(.subheadline)
                            .foregroundStyle(Color.glText)
                        Text(names.isEmpty ? "none" : names.joined(separator: ", "))
                            .font(.caption)
                            .foregroundStyle(Color.glSuccess)
                    }
                    .glCard()
                } else {
                    Text("Tap any bunker to see every clear shot it has into the rest of the field.")
                        .font(.caption)
                        .foregroundStyle(Color.glDim)
                }

                Text("Height matters: cakes, snake beams, and pins are LOW — a standing player shoots over them. Crouch treats low pieces as blockers. Training aid — walk the field to confirm.")
                    .font(.caption2)
                    .foregroundStyle(Color.glDim)
            }
            .padding(GLSpace.screen)
        }
        .glScreen()
        .navigationTitle("Sightlines")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: Field board with rays + hit testing

    private var fieldBoard: some View {
        GeometryReader { geo in
            let size = geo.size
            let scale = min(size.width / 150.0, size.height / 120.0)
            let xOff = (size.width - 150 * scale) / 2
            let yOff = (size.height - 120 * scale) / 2

            ZStack {
                FieldCanvasView(layoutKey: state.selectedLayoutKey)

                // Ray overlay
                Canvas { context, _ in
                    guard let s = selected, bunkers.indices.contains(s) else { return }
                    let origin = bunkers[s]
                    let ox = xOff + origin.x * scale
                    let oy = yOff + (120 - origin.y) * scale
                    let clearSet = Set(clearIdx)

                    for (j, b) in bunkers.enumerated() where j != s {
                        let tx = xOff + b.x * scale
                        let ty = yOff + (120 - b.y) * scale
                        let clear = clearSet.contains(j)
                        var line = Path()
                        line.move(to: CGPoint(x: ox, y: oy))
                        line.addLine(to: CGPoint(x: tx, y: ty))
                        context.stroke(
                            line,
                            with: .color(clear
                                ? Color(red: 0.22, green: 0.82, blue: 0.48).opacity(0.85)
                                : Color(red: 0.75, green: 0.19, blue: 0.23).opacity(0.45)),
                            style: StrokeStyle(
                                lineWidth: clear ? 1.4 : 0.9,
                                dash: clear ? [] : [4, 3]
                            )
                        )
                    }

                    // Selection ring
                    let ring = Path(ellipseIn: CGRect(x: ox - 8, y: oy - 8, width: 16, height: 16))
                    context.stroke(ring, with: .color(Color.glGold), lineWidth: 2)
                }
                .allowsHitTesting(false)
            }
            .contentShape(Rectangle())
            .onTapGesture { location in
                // View → field coords (inverse of canvas transform)
                let fx = (location.x - xOff) / scale
                let fySVG = (location.y - yOff) / scale
                let fy = 120 - fySVG
                let pt = CGPoint(x: fx, y: fy)
                selected = SightlineMath.nearestBunker(to: pt, bunkers: bunkers, maxDist: 8)
            }
        }
        .aspectRatio(178.0 / 150.0, contentMode: .fit)
    }

    private func legendSwatch(_ color: Color, _ label: String) -> some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 14, height: 4)
            Text(label)
                .font(.caption2)
                .foregroundStyle(Color.glMuted)
        }
    }
}
