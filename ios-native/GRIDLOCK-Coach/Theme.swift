import SwiftUI

// MARK: - Theme mode

enum ThemeMode: String, CaseIterable, Identifiable, Codable {
    case night, stadium, system
    var id: String { rawValue }
    var title: String {
        switch self {
        case .night: return "Night"
        case .stadium: return "Stadium"
        case .system: return "System"
        }
    }
    var preferredScheme: ColorScheme? {
        switch self {
        case .night, .stadium: return .dark
        case .system: return nil
        }
    }
}

// MARK: - Design tokens (spacing / type / radius)

enum GLSpace {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let screen: CGFloat = 16
}

enum GLRadius {
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let pill: CGFloat = 100
}

// MARK: - Semantic palette

enum GLTheme {
    @MainActor static var mode: ThemeMode = .night

    private static let nightBg     = Color(red: 0.035, green: 0.045, blue: 0.090)
    private static let nightPanel  = Color(red: 0.055, green: 0.075, blue: 0.140)
    private static let nightPanel2 = Color(red: 0.085, green: 0.115, blue: 0.195)
    private static let nightBorder = Color(red: 0.18, green: 0.24, blue: 0.40)
    private static let nightText   = Color(red: 0.90, green: 0.92, blue: 0.97)
    private static let nightMuted  = Color(red: 0.55, green: 0.62, blue: 0.75)

    private static let stadiumBg     = Color(red: 0.02, green: 0.03, blue: 0.06)
    private static let stadiumPanel  = Color(red: 0.06, green: 0.09, blue: 0.16)
    private static let stadiumPanel2 = Color(red: 0.10, green: 0.14, blue: 0.24)
    private static let stadiumBorder = Color(red: 0.28, green: 0.36, blue: 0.55)
    private static let stadiumText   = Color(red: 0.95, green: 0.96, blue: 0.99)
    private static let stadiumMuted  = Color(red: 0.62, green: 0.68, blue: 0.80)

    @MainActor static func bg(for scheme: ColorScheme) -> Color {
        if mode == .system && scheme == .light { return Color(red: 0.96, green: 0.97, blue: 0.99) }
        return mode == .stadium ? stadiumBg : nightBg
    }
    @MainActor static func panel(for scheme: ColorScheme) -> Color {
        if mode == .system && scheme == .light { return .white }
        return mode == .stadium ? stadiumPanel : nightPanel
    }
    @MainActor static func panel2(for scheme: ColorScheme) -> Color {
        if mode == .system && scheme == .light { return Color(red: 0.93, green: 0.94, blue: 0.97) }
        return mode == .stadium ? stadiumPanel2 : nightPanel2
    }
    @MainActor static func border(for scheme: ColorScheme) -> Color {
        if mode == .system && scheme == .light { return Color(red: 0.82, green: 0.84, blue: 0.90) }
        return mode == .stadium ? stadiumBorder : nightBorder
    }
    @MainActor static func text(for scheme: ColorScheme) -> Color {
        if mode == .system && scheme == .light { return Color(red: 0.08, green: 0.10, blue: 0.16) }
        return mode == .stadium ? stadiumText : nightText
    }
    @MainActor static func muted(for scheme: ColorScheme) -> Color {
        if mode == .system && scheme == .light { return Color(red: 0.42, green: 0.45, blue: 0.55) }
        return mode == .stadium ? stadiumMuted : nightMuted
    }

    static let accent  = Color(red: 0.30, green: 0.52, blue: 0.98)
    static let gold    = Color(red: 0.96, green: 0.78, blue: 0.28)
    static let chalk   = Color(red: 0.55, green: 0.80, blue: 0.94)
    static let success = Color(red: 0.22, green: 0.78, blue: 0.48)
    static let alert   = Color(red: 0.98, green: 0.55, blue: 0.45)
    static let danger  = Color(red: 0.90, green: 0.28, blue: 0.28)
    static let field   = Color(red: 0.10, green: 0.26, blue: 0.14)
}

// MARK: - Static aliases (existing views)

extension Color {
    static let gridBg = Color(red: 0.035, green: 0.045, blue: 0.090)
    static let gridPanel = Color(red: 0.055, green: 0.075, blue: 0.140)
    static let gridPanel2 = Color(red: 0.085, green: 0.115, blue: 0.195)
    static let gridBorder = Color(red: 0.18, green: 0.24, blue: 0.40)
    static let gridChalk = Color(red: 0.55, green: 0.80, blue: 0.94)
    static let gridBlue = Color(red: 0.30, green: 0.52, blue: 0.98)
    static let gridGold = Color(red: 0.96, green: 0.78, blue: 0.28)
    static let gridText = Color(red: 0.90, green: 0.92, blue: 0.97)
    static let gridMuted = Color(red: 0.55, green: 0.62, blue: 0.75)
    static let gridDim = Color(red: 0.35, green: 0.40, blue: 0.52)
    static let gridSuccess = Color(red: 0.22, green: 0.78, blue: 0.48)
    static let gridAlert = Color(red: 0.98, green: 0.55, blue: 0.45)
    static let gridRed = Color(red: 0.90, green: 0.28, blue: 0.28)

    static let glNavy = gridBg
    static let glNavy2 = gridPanel
    static let glPanel = gridPanel
    static let glPanel2 = gridPanel2
    static let glBorder = gridBorder
    static let glChalk = gridChalk
    static let glAccent = gridBlue
    static let glBlue = gridBlue
    static let glGold = gridGold
    static let glText = gridText
    static let glMuted = gridMuted
    static let glDim = gridDim
    static let glSuccess = gridSuccess
    static let glAlert = gridAlert
    static let glDanger = gridAlert
    static let glRed = gridRed
    static let glGreen = Color(red: 0.10, green: 0.26, blue: 0.14)
}

// MARK: - View modifiers (clean product UI)

struct GLScreenModifier: ViewModifier {
    @Environment(\.colorScheme) private var scheme
    func body(content: Content) -> some View {
        content
            .background(GLTheme.bg(for: scheme).ignoresSafeArea())
    }
}

struct GLCardModifier: ViewModifier {
    var padding: CGFloat = GLSpace.md
    @Environment(\.colorScheme) private var scheme
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(GLTheme.panel(for: scheme))
            .clipShape(RoundedRectangle(cornerRadius: GLRadius.md, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: GLRadius.md, style: .continuous)
                    .stroke(GLTheme.border(for: scheme).opacity(0.45), lineWidth: 1)
            )
    }
}

struct GLSectionTitleModifier: ViewModifier {
    @Environment(\.colorScheme) private var scheme
    func body(content: Content) -> some View {
        content
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(GLTheme.muted(for: scheme))
            .textCase(.uppercase)
            .tracking(0.8)
    }
}

struct GLChipModifier: ViewModifier {
    var selected: Bool
    @Environment(\.colorScheme) private var scheme
    func body(content: Content) -> some View {
        content
            .font(.system(size: 13, weight: .semibold))
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(
                Capsule(style: .continuous)
                    .fill(selected ? GLTheme.accent.opacity(0.22) : GLTheme.panel2(for: scheme))
            )
            .foregroundStyle(selected ? GLTheme.accent : GLTheme.text(for: scheme))
            .overlay(
                Capsule(style: .continuous)
                    .stroke(selected ? GLTheme.accent.opacity(0.55) : GLTheme.border(for: scheme).opacity(0.35), lineWidth: 1)
            )
    }
}

struct GLFieldFrameModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .aspectRatio(178.0 / 150.0, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: GLRadius.md, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: GLRadius.md, style: .continuous)
                    .stroke(Color.glBorder.opacity(0.4), lineWidth: 1)
            )
    }
}

struct GLToolbarTitleModifier: ViewModifier {
    @Environment(\.colorScheme) private var scheme
    func body(content: Content) -> some View {
        content
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(GLTheme.text(for: scheme))
    }
}

struct GLHairlineDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color.glBorder.opacity(0.35))
            .frame(height: 1)
    }
}

extension View {
    func glScreen() -> some View { modifier(GLScreenModifier()) }
    func glCard(padding: CGFloat = GLSpace.md) -> some View { modifier(GLCardModifier(padding: padding)) }
    func glSectionTitle() -> some View { modifier(GLSectionTitleModifier()) }
    func glChip(selected: Bool) -> some View { modifier(GLChipModifier(selected: selected)) }
    func glFieldFrame() -> some View { modifier(GLFieldFrameModifier()) }
    func glToolbarTitle() -> some View { modifier(GLToolbarTitleModifier()) }
}

// MARK: - Buttons

struct GridPrimaryButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .frame(minHeight: 44)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: GLRadius.sm, style: .continuous)
                    .fill(Color.glAccent)
            )
            .foregroundStyle(.white)
            .opacity(configuration.isPressed ? 0.88 : 1)
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct GridSecondaryButton: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .medium))
            .padding(.horizontal, 16)
            .padding(.vertical, 11)
            .frame(minHeight: 44)
            .background(
                RoundedRectangle(cornerRadius: GLRadius.sm, style: .continuous)
                    .fill(Color.glPanel2)
            )
            .foregroundStyle(Color.glChalk)
            .overlay(
                RoundedRectangle(cornerRadius: GLRadius.sm, style: .continuous)
                    .stroke(Color.glBorder.opacity(0.6), lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.88 : 1)
    }
}

typealias GLPrimaryButton = GridPrimaryButton
typealias GLSecondaryButton = GridSecondaryButton
