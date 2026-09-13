import SwiftUI

struct WalkView: View {
    @Environment(AppState.self) private var state

    private var layoutName: String {
        LayoutInfo.builtIn.first(where: { $0.key == state.selectedLayoutKey })?.name ?? state.selectedLayoutKey
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("Walk the field")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Color.glText)
                Text("Walk the official, to-scale \(layoutName) field. Use the map below for orientation, then open GunzUp for true 3D.")
                    .font(.subheadline)
                    .foregroundStyle(Color.glMuted)

                FieldCanvasView(layoutKey: state.selectedLayoutKey)
                    .aspectRatio(178.0/150.0, contentMode: .fit)
                    .frame(maxHeight: 240)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.glBorder, lineWidth: 1))

                Link(destination: URL(string: "https://gunzup.com/")!) {
                    HStack {
                        Image(systemName: "arrow.up.right.square")
                        Text("Open the field in GunzUp")
                            .fontWeight(.bold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(14)
                    .background(Color.glBlue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                Text("Opens gunzup.com in Safari — needs a connection. Choose the matching event layout when it opens.")
                    .font(.caption)
                    .foregroundStyle(Color.glDim)

                VStack(alignment: .leading, spacing: 6) {
                    Text("On this device")
                        .font(.headline)
                        .foregroundStyle(Color.glText)
                    Text("• Top-down bunker map for \(layoutName)")
                    Text("• Full 3D walk via GunzUp (official NXL field-walk platform)")
                    Text("• Native first-person walk ports from the HTML walk engine in a later build")
                }
                .font(.caption)
                .foregroundStyle(Color.glMuted)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.glPanel)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(14)
        }
        .background(Color.glNavy)
        .navigationTitle("Walk")
        .navigationBarTitleDisplayMode(.inline)
    }
}
