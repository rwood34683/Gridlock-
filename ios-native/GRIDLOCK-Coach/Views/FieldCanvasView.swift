import SwiftUI

// MARK: - Field canvas — HTML-exact footprints + positions (GunzUp-style paint)

struct FieldCanvasView: View {
    let layoutKey: String

    private var layout: FieldLayout? { BuiltInLayouts.layout(for: layoutKey) }
    private var displayName: String { layout?.name ?? layoutKey }

    /// HTML SVG viewBox is "-14 -16 178 150" (field 150×120 with padding).
    private let fieldW: CGFloat = 150
    private let fieldH: CGFloat = 120
    private let padX: CGFloat = 14
    private let padY: CGFloat = 16

    var body: some View {
        Canvas { context, size in
            // Match HTML preserveAspectRatio xMidYMid meet on viewBox 178×150
            let vbW = fieldW + padX * 2   // 178
            let vbH = fieldH + padY * 2   // 150
            let scale = min(size.width / vbW, size.height / vbH)
            let originX = (size.width - vbW * scale) / 2
            let originY = (size.height - vbH * scale) / 2
            // Field (0,0)..(150,120) maps inside padded viewBox
            let xOff = originX + padX * scale
            let yOff = originY + padY * scale
            let sx = scale
            let sy = scale

            drawTurf(context: context, size: size)
            drawGrid(context: context, xOff: xOff, yOff: yOff, sx: sx, sy: sy)
            drawBoundary(context: context, xOff: xOff, yOff: yOff, sx: sx, sy: sy)
            drawMidline(context: context, xOff: xOff, yOff: yOff, sx: sx, sy: sy)
            drawWireLabels(context: context, xOff: xOff, yOff: yOff, sx: sx, sy: sy)

            guard let layout else { return }

            // Shadows
            for b in layout.bunkers {
                let (path, _, _) = transformedPath(b, xOff: xOff, yOff: yOff, sx: sx, sy: sy)
                let soft = path.applying(CGAffineTransform(translationX: 0.5 * scale, y: 0.9 * scale))
                context.fill(soft, with: .color(.black.opacity(0.22)))
            }

            // Bodies
            for b in layout.bunkers {
                let (path, px, py) = transformedPath(b, xOff: xOff, yOff: yOff, sx: sx, sy: sy)
                let base = bunkerColor(b.type)
                context.fill(path, with: .color(base))
                context.stroke(path, with: .color(.black.opacity(0.5)), lineWidth: max(0.6, 0.25 * scale))
                context.stroke(path, with: .color(.white.opacity(0.28)), lineWidth: max(0.5, 0.2 * scale))

                let fontSize = max(7, 2.2 * scale)
                let shadow = context.resolve(
                    Text(b.name).font(.system(size: fontSize, weight: .black)).foregroundColor(.black.opacity(0.5))
                )
                let label = context.resolve(
                    Text(b.name).font(.system(size: fontSize, weight: .black)).foregroundColor(.white)
                )
                context.draw(shadow, at: CGPoint(x: px + 0.4, y: py + 0.5), anchor: .center)
                context.draw(label, at: CGPoint(x: px, y: py), anchor: .center)
            }
        }
        .aspectRatio(178.0 / 150.0, contentMode: .fit)  // HTML viewBox aspect
        .overlay(alignment: .topLeading) {
            Text(displayName)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Capsule().fill(.black.opacity(0.55)))
                .padding(8)
        }
        .glFieldFrame()
    }

    // HTML: X(x)=x, Y(y)=120-y  then scale into view
    private func mapPoint(_ p: CGPoint, xOff: CGFloat, yOff: CGFloat, sx: CGFloat, sy: CGFloat) -> CGPoint {
        CGPoint(x: xOff + p.x * sx, y: yOff + (fieldH - p.y) * sy)
    }

    private func transformedPath(_ b: Bunker, xOff: CGFloat, yOff: CGFloat, sx: CGFloat, sy: CGFloat) -> (Path, CGFloat, CGFloat) {
        // Build path in HTML draw space (y already flipped) then offset
        let hx = b.x
        let hy = fieldH - b.y  // HTML y = 120 - b.y
        var path = bunkerPathHTML(type: b.type, hx: hx, hy: hy, width: b.width)

        // HTML rotates in flipped space by +a degrees
        if let angle = b.angle, abs(angle) > 0.01 {
            let rad = CGFloat(angle) * .pi / 180
            path = path.applying(
                CGAffineTransform(translationX: hx, y: hy)
                    .rotated(by: rad)
                    .translatedBy(x: -hx, y: -hy)
            )
        }

        // Scale + offset into canvas
        path = path.applying(
            CGAffineTransform(a: sx, b: 0, c: 0, d: sy, tx: xOff, ty: yOff)
        )
        let px = xOff + hx * sx
        let py = yOff + hy * sy
        return (path, px, py)
    }

    // MARK: - Footprints matching HTML bunPolys (in flipped HTML y-space)

    private func bunkerPathHTML(type: String, hx x: CGFloat, hy y: CGFloat, width: Double?) -> Path {
        var path = Path()
        // HTML uses field units; IN=0.3 inset on rects — ignore tiny inset for fill clarity

        switch type {
        case "dorito":
            path.move(to: CGPoint(x: x, y: y - 3))
            path.addLine(to: CGPoint(x: x - 2.8, y: y + 2.2))
            path.addLine(to: CGPoint(x: x + 2.8, y: y + 2.2))
            path.closeSubpath()
        case "cake":
            path.move(to: CGPoint(x: x - 2, y: y - 1.8))
            path.addLine(to: CGPoint(x: x + 2, y: y - 1.8))
            path.addLine(to: CGPoint(x: x, y: y + 2.2))
            path.closeSubpath()
        case "sd":
            path.move(to: CGPoint(x: x, y: y - 2))
            path.addLine(to: CGPoint(x: x - 1.9, y: y + 1.5))
            path.addLine(to: CGPoint(x: x + 1.9, y: y + 1.5))
            path.closeSubpath()
        case "ballB", "ballR":
            // HTML circle r≈2.7
            path.addEllipse(in: CGRect(x: x - 2.7, y: y - 2.7, width: 5.4, height: 5.4))
        case "pin":
            path.addEllipse(in: CGRect(x: x - 1.6, y: y - 1.6, width: 3.2, height: 3.2))
        case "temple":
            path.addRect(CGRect(x: x - 2.5, y: y - 2.5, width: 5, height: 5))
        case "aztec":
            path.addRect(CGRect(x: x - 2, y: y - 2, width: 4, height: 4))
        case "can":
            path.addRect(CGRect(x: x - 1.9, y: y - 3.2, width: 3.8, height: 6.4))
        case "mw":
            path.addRect(CGRect(x: x - 1.1, y: y - 3, width: 2.2, height: 6))
        case "mb":
            path.addRect(CGRect(x: x - 1, y: y - 2.5, width: 2, height: 5))
        case "wm":
            path.addRect(CGRect(x: x - 1.1, y: y - 2.7, width: 2.2, height: 5.4))
        case "wing":
            path.addRect(CGRect(x: x - 3.8, y: y - 3.2, width: 7.6, height: 1.7))
            path.addRect(CGRect(x: x - 1.1, y: y - 3.2, width: 2.2, height: 6))
        case "wingS":
            path.addRect(CGRect(x: x - 2.5, y: y - 2.2, width: 5, height: 1.4))
            path.addRect(CGRect(x: x - 0.8, y: y - 2.2, width: 1.6, height: 4.2))
        case "plus":
            path.addRect(CGRect(x: x - 1.9, y: y - 4.8, width: 3.8, height: 9.6))
            path.addRect(CGRect(x: x - 4.8, y: y - 1.9, width: 9.6, height: 3.8))
        case "tower":
            path.addRect(CGRect(x: x - 2.5, y: y - 2.9, width: 5, height: 5.8))
        case "towerbig":
            path.addRect(CGRect(x: x - 2.2, y: y - 4.7, width: 4.4, height: 9.4))
        case "gb":
            path.addRect(CGRect(x: x - 1.6, y: y - 4, width: 3.2, height: 8))
        case "beam":
            let w = CGFloat(width ?? 16)
            path.addRect(CGRect(x: x - w/2, y: y - 1, width: w, height: 2))
        default:
            path.addEllipse(in: CGRect(x: x - 2, y: y - 2, width: 4, height: 4))
        }
        return path
    }

    // MARK: - Backdrop

    private func drawTurf(context: GraphicsContext, size: CGSize) {
        context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Color(red: 0.05, green: 0.18, blue: 0.10)))
        let stripeH = size.height / 10
        for i in 0..<10 where i % 2 == 0 {
            context.fill(
                Path(CGRect(x: 0, y: CGFloat(i) * stripeH, width: size.width, height: stripeH)),
                with: .color(Color(red: 0.08, green: 0.26, blue: 0.14).opacity(0.5))
            )
        }
    }

    private func drawGrid(context: GraphicsContext, xOff: CGFloat, yOff: CGFloat, sx: CGFloat, sy: CGFloat) {
        var fine = Path()
        for i in stride(from: 0, through: 150, by: 10) {
            let x = xOff + CGFloat(i) * sx
            fine.move(to: CGPoint(x: x, y: yOff))
            fine.addLine(to: CGPoint(x: x, y: yOff + 120 * sy))
        }
        for j in stride(from: 0, through: 120, by: 10) {
            let y = yOff + CGFloat(j) * sy
            fine.move(to: CGPoint(x: xOff, y: y))
            fine.addLine(to: CGPoint(x: xOff + 150 * sx, y: y))
        }
        context.stroke(fine, with: .color(.white.opacity(0.09)), lineWidth: 0.7)
    }

    private func drawBoundary(context: GraphicsContext, xOff: CGFloat, yOff: CGFloat, sx: CGFloat, sy: CGFloat) {
        let r = CGRect(x: xOff, y: yOff, width: 150 * sx, height: 120 * sy)
        context.stroke(Path(roundedRect: r, cornerRadius: 4), with: .color(.white.opacity(0.6)), lineWidth: 2)
    }

    private func drawMidline(context: GraphicsContext, xOff: CGFloat, yOff: CGFloat, sx: CGFloat, sy: CGFloat) {
        let x = xOff + 75 * sx
        var mid = Path()
        mid.move(to: CGPoint(x: x, y: yOff))
        mid.addLine(to: CGPoint(x: x, y: yOff + 120 * sy))
        context.stroke(mid, with: .color(.white.opacity(0.65)), style: StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
    }

    private func drawWireLabels(context: GraphicsContext, xOff: CGFloat, yOff: CGFloat, sx: CGFloat, sy: CGFloat) {
        let fs = max(8, 2.0 * sx)
        let snake = context.resolve(
            Text("SNAKE").font(.system(size: fs, weight: .black))
                .foregroundColor(Color(red: 1, green: 0.35, blue: 0.35).opacity(0.65))
        )
        let dorito = context.resolve(
            Text("DORITO").font(.system(size: fs, weight: .black))
                .foregroundColor(Color(red: 0.4, green: 0.7, blue: 1).opacity(0.65))
        )
        // HTML: snake is bottom (low y in field = high screen y after flip)
        context.draw(snake, at: CGPoint(x: xOff + 8 * sx, y: yOff + 120 * sy - 6), anchor: .bottomLeading)
        context.draw(dorito, at: CGPoint(x: xOff + 8 * sx, y: yOff + 6), anchor: .topLeading)
    }

    private func bunkerColor(_ type: String) -> Color {
        switch type {
        case "cake", "mw", "mb", "wm", "ballB":
            return Color(red: 0.12, green: 0.48, blue: 1.0)
        case "towerbig", "gb":
            return Color(red: 0.08, green: 0.35, blue: 0.92)
        case "temple", "tower", "aztec":
            return Color(red: 1.0, green: 0.82, blue: 0.12)
        case "ballR":
            return Color(red: 1.0, green: 0.15, blue: 0.22)
        case "plus":
            return Color(red: 1.0, green: 0.52, blue: 0.08)
        case "beam", "wing", "wingS":
            return Color(red: 0.95, green: 0.12, blue: 0.28)
        case "dorito", "sd":
            return Color(red: 1.0, green: 0.32, blue: 0.18)
        case "can", "pin":
            return Color(red: 0.90, green: 0.12, blue: 0.35)
        default:
            return Color(red: 0.92, green: 0.16, blue: 0.28)
        }
    }
}
