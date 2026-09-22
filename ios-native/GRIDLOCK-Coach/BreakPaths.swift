import SwiftUI

// Break path routes from HTML PLAYS_CIN — field units (150×120).
struct BreakPathPlayer: Identifiable, Hashable {
    let id: Int
    let from: CGPoint
    let to: CGPoint
    let via: [CGPoint]
    let wire: String
    let label: String

    var points: [CGPoint] {
        var p = [from]
        p.append(contentsOf: via)
        p.append(to)
        return p
    }
}

enum BreakPaths {
    static func routes(forScriptId id: String) -> [BreakPathPlayer] {
        switch id {
        case "hold":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 22), to: CGPoint(x: 45, y: 31), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake primary"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 42), to: CGPoint(x: 40, y: 34), via: [], wire: "S", label: "snake contain"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 62), to: CGPoint(x: 45, y: 74), via: [], wire: "C", label: "center C hold"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 82), to: CGPoint(x: 25, y: 105), via: [], wire: "D", label: "dorito primary"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 104), to: CGPoint(x: 15, y: 76), via: [], wire: "back", label: "read the break"),
            ]
        case "base":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 22), to: CGPoint(x: 58, y: 30), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake MW"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 40), to: CGPoint(x: 64, y: 17), via: [], wire: "S", label: "GP"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 60), to: CGPoint(x: 63, y: 47), via: [], wire: "C", label: "MT 50"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 92), to: CGPoint(x: 63, y: 112), via: [], wire: "D", label: "fwd MD"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 108), to: CGPoint(x: 45, y: 74), via: [], wire: "back", label: "C lane"),
            ]
        case "snake":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 16), to: CGPoint(x: 76, y: 35), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "deep snake run"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 30), to: CGPoint(x: 58, y: 30), via: [], wire: "S", label: "snake MW"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 46), to: CGPoint(x: 64, y: 17), via: [], wire: "S", label: "GP"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 66), to: CGPoint(x: 65, y: 74), via: [], wire: "C", label: "tree"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 104), to: CGPoint(x: 55, y: 112), via: [], wire: "D", label: "MD hold"),
            ]
        case "flood":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 110), to: CGPoint(x: 63, y: 112), via: [], wire: "D", label: "fwd MD"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 96), to: CGPoint(x: 55, y: 112), via: [], wire: "D", label: "MD"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 80), to: CGPoint(x: 45, y: 74), via: [], wire: "C", label: "C insert"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 58), to: CGPoint(x: 63, y: 47), via: [], wire: "C", label: "MT 50"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 20), to: CGPoint(x: 40, y: 34), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake contain"),
            ]
        case "tower":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 60), to: CGPoint(x: 63, y: 47), via: [], wire: "C", label: "MT 50"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 72), to: CGPoint(x: 65, y: 74), via: [], wire: "C", label: "tree 50"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 46), to: CGPoint(x: 64, y: 17), via: [], wire: "S", label: "GP"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 96), to: CGPoint(x: 63, y: 112), via: [], wire: "D", label: "fwd MD"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 30), to: CGPoint(x: 58, y: 30), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake MW"),
            ]
        case "blitz":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 16), to: CGPoint(x: 76, y: 35), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake sprint"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 40), to: CGPoint(x: 66, y: 30), via: [], wire: "S", label: "MW push"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 108), to: CGPoint(x: 63, y: 112), via: [], wire: "D", label: "MD sprint"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 60), to: CGPoint(x: 63, y: 47), via: [], wire: "C", label: "MT 50"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 46), to: CGPoint(x: 64, y: 17), via: [], wire: "S", label: "GP"),
            ]
        case "clean":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 40), to: CGPoint(x: 58, y: 30), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake MW"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 60), to: CGPoint(x: 63, y: 47), via: [], wire: "C", label: "MT lane"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 74), to: CGPoint(x: 65, y: 74), via: [], wire: "C", label: "tree lane"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 92), to: CGPoint(x: 55, y: 112), via: [], wire: "D", label: "MD lane"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 108), to: CGPoint(x: 45, y: 74), via: [], wire: "back", label: "C trade"),
            ]
        case "cons":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 30), to: CGPoint(x: 15, y: 35), via: [], wire: "back", label: "snake back lane (MT)"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 80), to: CGPoint(x: 15, y: 76), via: [], wire: "back", label: "dorito back lane (C)"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 22), to: CGPoint(x: 45, y: 31), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake contain (cake)"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 60), to: CGPoint(x: 45, y: 74), via: [], wire: "C", label: "center cross (C)"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 104), to: CGPoint(x: 25, y: 105), via: [], wire: "D", label: "dorito contain (temple)"),
            ]
        case "contain":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 20), to: CGPoint(x: 40, y: 34), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake contain"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 42), to: CGPoint(x: 45, y: 31), via: [], wire: "S", label: "snake cake"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 64), to: CGPoint(x: 45, y: 74), via: [], wire: "C", label: "center cross"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 88), to: CGPoint(x: 25, y: 105), via: [], wire: "D", label: "dorito contain"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 108), to: CGPoint(x: 30, y: 100), via: [], wire: "D", label: "dorito temple"),
            ]
        case "counter":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 22), to: CGPoint(x: 45, y: 31), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake hold"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 46), to: CGPoint(x: 63, y: 47), via: [], wire: "C", label: "MT read"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 66), to: CGPoint(x: 45, y: 74), via: [], wire: "C", label: "center counter"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 88), to: CGPoint(x: 30, y: 100), via: [], wire: "D", label: "dorito hold"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 108), to: CGPoint(x: 15, y: 76), via: [], wire: "back", label: "back counter"),
            ]
        case "insert":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 26), to: CGPoint(x: 15, y: 35), via: [], wire: "back", label: "snake back lane"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 50), to: CGPoint(x: 45, y: 74), via: [], wire: "C", label: "center lane"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 70), to: CGPoint(x: 63, y: 47), via: [], wire: "C", label: "MT lane"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 94), to: CGPoint(x: 15, y: 76), via: [], wire: "back", label: "dorito back lane"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 20), to: CGPoint(x: 40, y: 34), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake contain"),
            ]
        case "wire":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 24), to: CGPoint(x: 58, y: 30), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake MW"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 52), to: CGPoint(x: 63, y: 47), via: [], wire: "C", label: "MT 50"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 68), to: CGPoint(x: 45, y: 74), via: [], wire: "C", label: "center C"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 84), to: CGPoint(x: 65, y: 74), via: [], wire: "C", label: "tree"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 100), to: CGPoint(x: 55, y: 112), via: [], wire: "D", label: "MD"),
            ]
        case "lanes":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 26), to: CGPoint(x: 15, y: 35), via: [], wire: "back", label: "snake back lane"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 50), to: CGPoint(x: 45, y: 74), via: [], wire: "C", label: "center lane"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 70), to: CGPoint(x: 63, y: 47), via: [], wire: "C", label: "MT lane"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 94), to: CGPoint(x: 15, y: 76), via: [], wire: "back", label: "dorito back lane"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 20), to: CGPoint(x: 40, y: 34), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake contain"),
            ]
        case "split":
            return [
                BreakPathPlayer(id: 1, from: CGPoint(x: 2, y: 24), to: CGPoint(x: 58, y: 30), via: [CGPoint(x: 30, y: 34)], wire: "S", label: "snake MW"),
                BreakPathPlayer(id: 2, from: CGPoint(x: 2, y: 52), to: CGPoint(x: 63, y: 47), via: [], wire: "C", label: "MT 50"),
                BreakPathPlayer(id: 3, from: CGPoint(x: 2, y: 68), to: CGPoint(x: 45, y: 74), via: [], wire: "C", label: "center C"),
                BreakPathPlayer(id: 4, from: CGPoint(x: 2, y: 84), to: CGPoint(x: 65, y: 74), via: [], wire: "C", label: "tree"),
                BreakPathPlayer(id: 5, from: CGPoint(x: 2, y: 100), to: CGPoint(x: 55, y: 112), via: [], wire: "D", label: "MD"),
            ]
        default:
            return routes(forScriptId: "hold")
        }
    }
}


/// Animated break paths over the field (HTML animateBreak style).
struct BreakPathOverlay: View {
    let scriptId: String
    var mirrored: Bool = false
    var gunsUp: Bool = true
    var playing: Bool = true

    private var routes: [BreakPathPlayer] { BreakPaths.routes(forScriptId: scriptId) }

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: !playing)) { timeline in
            Canvas { context, size in
                let vbW: CGFloat = 178
                let vbH: CGFloat = 150
                let scale = min(size.width / vbW, size.height / vbH)
                let originX = (size.width - vbW * scale) / 2
                let originY = (size.height - vbH * scale) / 2
                let xOff = originX + 14 * scale
                let yOff = originY + 16 * scale

                func map(_ p: CGPoint) -> CGPoint {
                    var x = p.x
                    if mirrored { x = 150 - x }
                    return CGPoint(
                        x: xOff + x * scale,
                        y: yOff + (120 - p.y) * scale
                    )
                }

                let t = timeline.date.timeIntervalSinceReferenceDate
                // ~2.8s loop matching HTML feel
                let cycle = 2.8
                let phase = playing ? (t.truncatingRemainder(dividingBy: cycle) / cycle) : 1.0

                for route in routes {
                    let pts = route.points.map(map)
                    guard pts.count >= 2 else { continue }

                    // Full route trail
                    var trail = Path()
                    trail.move(to: pts[0])
                    for p in pts.dropFirst() { trail.addLine(to: p) }
                    let col = wireColor(route.wire)
                    context.stroke(
                        trail,
                        with: .color(col.opacity(0.35)),
                        style: StrokeStyle(lineWidth: max(1.5, 1.2 * scale), lineCap: .round, lineJoin: .round, dash: [5, 4])
                    )

                    // Traveled portion
                    let pos = position(along: pts, progress: phase)
                    var traveled = Path()
                    traveled.move(to: pts[0])
                    let all = samplePath(pts: pts, upTo: phase)
                    if all.count > 1 {
                        traveled.move(to: all[0])
                        for p in all.dropFirst() { traveled.addLine(to: p) }
                        context.stroke(
                            traveled,
                            with: .color(col.opacity(0.95)),
                            style: StrokeStyle(lineWidth: max(2.2, 1.8 * scale), lineCap: .round, lineJoin: .round)
                        )
                    }

                    // Start gate tick
                    let startR = max(3.0, 2.2 * scale)
                    context.fill(
                        Path(ellipseIn: CGRect(x: pts[0].x - startR/2, y: pts[0].y - startR/2, width: startR, height: startR)),
                        with: .color(col.opacity(0.5))
                    )

                    // Moving player dot
                    let r = max(5.5, 3.8 * scale)
                    let glow = Path(ellipseIn: CGRect(x: pos.x - r*1.4, y: pos.y - r*1.4, width: r*2.8, height: r*2.8))
                    context.fill(glow, with: .color(col.opacity(0.25)))
                    context.fill(
                        Path(ellipseIn: CGRect(x: pos.x - r, y: pos.y - r, width: r*2, height: r*2)),
                        with: .color(col)
                    )
                    context.stroke(
                        Path(ellipseIn: CGRect(x: pos.x - r, y: pos.y - r, width: r*2, height: r*2)),
                        with: .color(.white.opacity(0.85)),
                        lineWidth: 1.2
                    )

                    let num = context.resolve(
                        Text("\(route.id)")
                            .font(.system(size: max(8, 2.6 * scale), weight: .black))
                            .foregroundColor(.white)
                    )
                    context.draw(num, at: pos, anchor: .center)

                    // Guns-up cone at end when mostly arrived
                    if gunsUp && phase > 0.85 {
                        drawGunCone(context: context, from: pts.last!, wire: route.wire, scale: scale, color: col)
                    }
                }
            }
        }
        .allowsHitTesting(false)
    }

    private func wireColor(_ w: String) -> Color {
        switch w {
        case "S": return Color(red: 1.0, green: 0.28, blue: 0.32)
        case "D": return Color(red: 0.25, green: 0.55, blue: 1.0)
        case "C": return Color(red: 1.0, green: 0.82, blue: 0.15)
        case "back": return Color(red: 0.75, green: 0.75, blue: 0.85)
        default: return Color.glChalk
        }
    }

    private func pathLength(_ pts: [CGPoint]) -> CGFloat {
        var len: CGFloat = 0
        for i in 1..<pts.count {
            len += hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y)
        }
        return max(len, 1)
    }

    private func position(along pts: [CGPoint], progress: Double) -> CGPoint {
        let total = pathLength(pts)
        var dist = CGFloat(progress) * total
        for i in 1..<pts.count {
            let seg = hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y)
            if dist <= seg {
                let t = seg > 0 ? dist / seg : 0
                return CGPoint(
                    x: pts[i-1].x + (pts[i].x - pts[i-1].x) * t,
                    y: pts[i-1].y + (pts[i].y - pts[i-1].y) * t
                )
            }
            dist -= seg
        }
        return pts.last ?? .zero
    }

    private func samplePath(pts: [CGPoint], upTo progress: Double) -> [CGPoint] {
        let total = pathLength(pts)
        let target = CGFloat(progress) * total
        var out: [CGPoint] = [pts[0]]
        var acc: CGFloat = 0
        for i in 1..<pts.count {
            let seg = hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y)
            if acc + seg >= target {
                let t = seg > 0 ? (target - acc) / seg : 0
                out.append(CGPoint(
                    x: pts[i-1].x + (pts[i].x - pts[i-1].x) * t,
                    y: pts[i-1].y + (pts[i].y - pts[i-1].y) * t
                ))
                return out
            }
            out.append(pts[i])
            acc += seg
        }
        return pts
    }

    private func drawGunCone(context: GraphicsContext, from: CGPoint, wire: String, scale: CGFloat, color: Color) {
        let dir: CGFloat = 1
        var ty: CGFloat = from.y
        switch wire {
        case "S": ty = from.y - 18 * scale
        case "D": ty = from.y + 18 * scale
        case "C": ty = from.y
        default: ty = from.y - 8 * scale
        }
        let tx = from.x + 28 * scale * dir
        var cone = Path()
        cone.move(to: from)
        cone.addLine(to: CGPoint(x: tx, y: ty - 6 * scale))
        cone.addLine(to: CGPoint(x: tx, y: ty + 6 * scale))
        cone.closeSubpath()
        context.fill(cone, with: .color(Color.glGold.opacity(0.18)))
        context.stroke(
            Path { p in
                p.move(to: from)
                p.addLine(to: CGPoint(x: tx, y: ty))
            },
            with: .color(Color.glGold.opacity(0.55)),
            lineWidth: 1
        )
    }
}
