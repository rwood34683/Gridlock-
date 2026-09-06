# GRIDLOCK Coach — put this in Xcode

## 1. Download & unzip
Unzip this folder. You should see many `.swift` files and a `Views` folder.

## 2. Open your Xcode app project
Open **Gridlock Coach.xcodeproj** (your existing project).

## 3. Delete old Swift files in Xcode (left list)
Delete EVERY old `.swift` file from the left list (Remove Reference is fine).
Keep only **Assets** if you have it.

## 4. Drag these in
From the unzipped folder, drag into the left list:

**Main files (not in Views):**
- GRIDLOCKApp.swift
- AppState.swift
- Models.swift
- Theme.swift
- Brand.swift
- Security.swift
- Protection.swift
- AttackDefense.swift
- EventFeed.swift
- Resilience.swift
- SightlineMath.swift
- BreakPaths.swift

**Whole Views folder:**
- Drag the entire **Views** folder in

When the box appears:
- Check **Copy items if needed**
- Check **Create groups**
- Check target **Gridlock Coach**

## 5. One of each only
No file should appear twice. No "2" on the end of names.

## 6. Run
- Top bar destination = **iPhone 17 Pro** (or any iPhone)
- Product → Clean Build Folder
- Press the Play button ▶

## Tabs you should see
Playbook · Tally · Scout · Sightlines · More
