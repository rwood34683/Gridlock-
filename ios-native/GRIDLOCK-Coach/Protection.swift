import Foundation
import UIKit

/// Device / brand / storage hardening for GRIDLOCK Coach by UPRA.
enum GridProtection {

    static let buildSeal = "UPRA-GRIDLOCK-COACH-v1"

    static var isLikelyJailbroken: Bool {
        let probes = [
            "/Applications/Cydia.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/cydia",
            "/usr/lib/libjailbreak.dylib",
        ]
        for path in probes where FileManager.default.fileExists(atPath: path) {
            return true
        }
        // Suspicious write outside sandbox
        let test = "/private/gridlock_jb_probe.txt"
        do {
            try "x".write(toFile: test, atomically: true, encoding: .utf8)
            try? FileManager.default.removeItem(atPath: test)
            return true
        } catch {
            return false
        }
    }

    static func environmentFlags() -> [String] {
        var flags: [String] = []
        #if DEBUG
        flags.append("debug-build")
        #endif
        if isLikelyJailbroken { flags.append("modified-device") }
        if !brandIntact() { flags.append("brand-mismatch") }
        return flags
    }

    static func brandIntact() -> Bool {
        Brand.product == "GRIDLOCK"
            && Brand.org == "UPRA"
            && Brand.copyright.contains("UPRA")
            && Brand.legal.contains("UPRA")
            && Brand.tagline.contains("UPRA")
    }

    static var licenseNotice: String {
        """
        \(Brand.fullName) by \(Brand.org).
        \(Brand.copyright)
        Unauthorized copying, redistribution, reverse engineering for rebrand,
        or commercial exploitation of this software is prohibited.
        Seal: \(buildSeal)
        """
    }

    static func writeProtected(_ data: Data, to url: URL) throws {
        // Ensure parent exists
        try FileManager.default.createDirectory(
            at: url.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        try data.write(to: url, options: [.atomic, .completeFileProtection])
        try? FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
            ofItemAtPath: url.path
        )
    }

    static var allowsDiagnosticsTools: Bool {
        #if DEBUG
        true
        #else
        false
        #endif
    }

    /// Soft boot check — never crash launch.
    static func startupWarnings() -> [String] {
        var w: [String] = []
        if !brandIntact() { w.append("Brand integrity warning") }
        if isLikelyJailbroken { w.append("Modified device detected") }
        return w
    }
}
