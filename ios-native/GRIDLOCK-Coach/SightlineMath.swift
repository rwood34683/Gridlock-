import Foundation
import CoreGraphics

// MARK: - Sightline ray math (port of gridlock_coach.html losClear / bunPolys)

enum SightStance: String, CaseIterable, Identifiable {
    case stand, crouch
    var id: String { rawValue }
    var title: String { rawValue == "stand" ? "Stand" : "Crouch" }
}

struct SightFootprint {
    var polys: [[CGPoint]]
    var x0: CGFloat, y0: CGFloat, x1: CGFloat, y1: CGFloat
}

enum SightlineMath {
    /// Knee/waist pieces — standing shooter clears them (HTML LOW_T).
    static let lowTypes: Set<String> = ["beam", "cake", "pin", "sd", "ballR", "ballB"]

    // MARK: Public API

    /// True if a shot from field point A to B is clear given stance.
    static func losClear(
        from a: CGPoint,
        to b: CGPoint,
        bunkers: [Bunker],
        exclude: Set<Int> = [],
        stance: SightStance = .stand
    ) -> Bool {
        let fps = footprints(bunkers)
        let ay = 120 - a.y
        let by = 120 - b.y
        let ax = a.x, bx = b.x

        for i in bunkers.indices {
            if exclude.contains(i) { continue }
            let c = bunkers[i]
            if !blocksAt(type: c.type, stance: stance) { continue }

            // Don't let the origin/target bunker block itself
            if (abs(c.x - a.x) < 0.7 && abs(c.y - a.y) < 0.7)
                || (abs(c.x - b.x) < 0.7 && abs(c.y - b.y) < 0.7) {
                continue
            }

            if let f = fps[i] {
                // AABB reject in SVG space
                if max(ax, bx) < f.x0 || min(ax, bx) > f.x1
                    || max(ay, by) < f.y0 || min(ay, by) > f.y1 {
                    continue
                }
                for poly in f.polys {
                    if segPoly(ax, ay, bx, by, poly) { return false }
                }
            } else {
                // Circle fallback (balls / pins without poly)
                let r = bkR(c.type) - 0.3
                let cy = 120 - c.y
                if segPtDist(CGPoint(x: c.x, y: cy), ax, ay, bx, by) < r {
                    return false
                }
            }
        }
        return true
    }

    /// Clear target indices from origin index.
    static func clearTargets(
        from origin: Int,
        bunkers: [Bunker],
        stance: SightStance = .stand
    ) -> [Int] {
        guard bunkers.indices.contains(origin) else { return [] }
        let o = bunkers[origin]
        var hits: [Int] = []
        for j in bunkers.indices where j != origin {
            let t = bunkers[j]
            if losClear(
                from: CGPoint(x: o.x, y: o.y),
                to: CGPoint(x: t.x, y: t.y),
                bunkers: bunkers,
                exclude: [origin, j],
                stance: stance
            ) {
                hits.append(j)
            }
        }
        return hits
    }

    /// Nearest bunker index to a field point, or nil if farther than maxDist.
    static func nearestBunker(to point: CGPoint, bunkers: [Bunker], maxDist: CGFloat = 6) -> Int? {
        var best: Int?
        var bestD = maxDist
        for (i, b) in bunkers.enumerated() {
            let d = hypot(b.x - point.x, b.y - point.y)
            if d < bestD {
                bestD = d
                best = i
            }
        }
        return best
    }

    // MARK: Footprints

    static func footprints(_ bunkers: [Bunker]) -> [SightFootprint?] {
        bunkers.map { b in
            guard let polys = bunPolys(b), !polys.isEmpty else { return nil }
            var x0 = CGFloat.greatestFiniteMagnitude
            var y0 = CGFloat.greatestFiniteMagnitude
            var x1 = -CGFloat.greatestFiniteMagnitude
            var y1 = -CGFloat.greatestFiniteMagnitude
            for poly in polys {
                for p in poly {
                    x0 = min(x0, p.x); y0 = min(y0, p.y)
                    x1 = max(x1, p.x); y1 = max(y1, p.y)
                }
            }
            return SightFootprint(polys: polys, x0: x0, y0: y0, x1: x1, y1: y1)
        }
    }

    /// Polygon(s) in SVG space: x = field x, y = 120 - field y. Inset 0.3.
    static func bunPolys(_ b: Bunker) -> [[CGPoint]]? {
        let x = b.x
        let y = 120 - b.y
        let inset: CGFloat = 0.3
        let angle = b.angle ?? 0

        func rot(_ pts: [CGPoint]) -> [CGPoint] {
            guard abs(angle) > 0.001 else { return pts }
            let r = angle * .pi / 180
            let c = cos(r), s = sin(r)
            return pts.map { p in
                CGPoint(
                    x: x + (p.x - x) * c - (p.y - y) * s,
                    y: y + (p.x - x) * s + (p.y - y) * c
                )
            }
        }

        func rect(_ x0: CGFloat, _ y0: CGFloat, _ w: CGFloat, _ h: CGFloat) -> [CGPoint] {
            rot([
                CGPoint(x: x + x0 + inset, y: y + y0 + inset),
                CGPoint(x: x + x0 + w - inset, y: y + y0 + inset),
                CGPoint(x: x + x0 + w - inset, y: y + y0 + h - inset),
                CGPoint(x: x + x0 + inset, y: y + y0 + h - inset),
            ])
        }

        func tri(_ pts: [CGPoint]) -> [CGPoint] {
            let cx = pts.map(\.x).reduce(0, +) / 3
            let cy = pts.map(\.y).reduce(0, +) / 3
            return rot(pts.map { p in
                CGPoint(x: cx + (p.x - cx) * 0.88, y: cy + (p.y - cy) * 0.88)
            })
        }

        switch b.type {
        case "dorito":
            return [tri([
                CGPoint(x: x, y: y - 3),
                CGPoint(x: x - 2.8, y: y + 2.2),
                CGPoint(x: x + 2.8, y: y + 2.2),
            ])]
        case "cake":
            return [tri([
                CGPoint(x: x - 2, y: y - 1.8),
                CGPoint(x: x + 2, y: y - 1.8),
                CGPoint(x: x, y: y + 2.2),
            ])]
        case "temple", "aztec":
            return [rect(-2.5, -2.5, 5, 5)]
        case "can", "TCK":
            return [rect(-1.9, -3.2, 3.8, 6.4)]
        case "mw":
            return [rect(-1.1, -3, 2.2, 6)]
        case "wing":
            return [rect(-3.8, -3.2, 7.6, 1.7), rect(-1.1, -3.2, 2.2, 6)]
        case "wingS":
            return [rect(-2.5, -2.2, 5, 1.4), rect(-0.8, -2.2, 1.6, 4.2)]
        case "plus":
            return [rect(-1.9, -4.8, 3.8, 9.6), rect(-4.8, -1.9, 9.6, 3.8)]
        case "tower":
            return [rect(-2.5, -2.9, 5, 5.8)]
        case "towerbig", "gb":
            return [rect(-2.2, -4.7, 4.4, 9.4)]
        case "beam":
            let w = CGFloat(b.width ?? 16)
            return [rect(-w / 2, -1, w, 2)]
        case "sd":
            return [tri([
                CGPoint(x: x, y: y - 2),
                CGPoint(x: x - 1.9, y: y + 1.5),
                CGPoint(x: x + 1.9, y: y + 1.5),
            ])]
        case "mb":
            return [rect(-1, -2.5, 2, 5)]
        case "wm":
            return [rect(-1.1, -2.7, 2.2, 5.4)]
        default:
            // pin, ballR, ballB → circle path via bkR
            return nil
        }
    }

    // MARK: Helpers

    static func blocksAt(type: String, stance: SightStance) -> Bool {
        if stance == .stand { return !lowTypes.contains(type) }
        return true
    }

    static func bkR(_ type: String) -> CGFloat {
        switch type {
        case "pin": return 1.1
        case "towerbig", "gb": return 4.6
        case "plus": return 4.2
        case "tower", "wing": return 3.6
        case "beam": return 3.2
        case "dorito", "temple", "cake": return 3.0
        case "can": return 2.6
        case "mw": return 2.2
        case "ballR", "ballB": return 1.8
        default: return 2.6
        }
    }

    static func segsInt(
        _ ax: CGFloat, _ ay: CGFloat, _ bx: CGFloat, _ by: CGFloat,
        _ cx: CGFloat, _ cy: CGFloat, _ dx: CGFloat, _ dy: CGFloat
    ) -> Bool {
        let d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
        let d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax)
        let d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx)
        let d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx)
        return d1 * d2 < 0 && d3 * d4 < 0
    }

    static func ptInPoly(_ px: CGFloat, _ py: CGFloat, _ P: [CGPoint]) -> Bool {
        var inn = false
        var j = P.count - 1
        for i in 0..<P.count {
            let yi = P[i].y, yj = P[j].y
            if (yi > py) != (yj > py) {
                let xIntersect = (P[j].x - P[i].x) * (py - yi) / (yj - yi) + P[i].x
                if px < xIntersect { inn.toggle() }
            }
            j = i
        }
        return inn
    }

    static func segPoly(
        _ ax: CGFloat, _ ay: CGFloat, _ bx: CGFloat, _ by: CGFloat,
        _ P: [CGPoint]
    ) -> Bool {
        for i in 0..<P.count {
            let j = (i + 1) % P.count
            if segsInt(ax, ay, bx, by, P[i].x, P[i].y, P[j].x, P[j].y) {
                return true
            }
        }
        return ptInPoly((ax + bx) / 2, (ay + by) / 2, P)
    }

    static func segPtDist(
        _ p: CGPoint,
        _ ax: CGFloat, _ ay: CGFloat,
        _ bx: CGFloat, _ by: CGFloat
    ) -> CGFloat {
        let dx = bx - ax, dy = by - ay
        let L = dx * dx + dy * dy
        var t: CGFloat = L > 0 ? ((p.x - ax) * dx + (p.y - ay) * dy) / L : 0
        t = min(1, max(0, t))
        return hypot(p.x - (ax + t * dx), p.y - (ay + t * dy))
    }
}
