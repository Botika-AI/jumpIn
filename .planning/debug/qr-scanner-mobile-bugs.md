---
status: diagnosed
trigger: "QR scanner overlay has multiple problems on mobile"
created: 2026-03-14T00:00:00Z
updated: 2026-03-14T00:00:00Z
---

## Current Focus

hypothesis: Multiple distinct bugs from different root causes, not one single root cause
test: Complete source + bundle + library analysis
expecting: n/a - diagnosis complete
next_action: Fix implementation (out of scope for this session)

## Symptoms

expected: Clean fullscreen QR scanner overlay with live camera feed on mobile
actual: Library dropdown UI visible, buttons unreadable, layout breaks, no camera feed
errors: No runtime errors visible to user in most failure cases
reproduction: Open dashboard -> tap camera button -> observe scanner overlay on mobile
started: Mobile-specific; desktop may work correctly

## Eliminated

- hypothesis: Html5QrcodeScanner is still being used in the current code
  evidence: QRScanner.tsx line 22 destructures `{ Html5Qrcode }` not `{ Html5QrcodeScanner }`. Confirmed via git log that 363957c switched the API. The dropdown-injecting class is bundled (ESM index exports both) but never instantiated.
  timestamp: 2026-03-14

- hypothesis: The viewport meta tag is missing
  evidence: out/index.html confirms `<meta name="viewport" content="width=device-width, initial-scale=1"/>` is present via Next.js default metadata injection.
  timestamp: 2026-03-14

- hypothesis: Html5Qrcode injects a camera select dropdown
  evidence: Audited cjs/html5-qrcode.js - setupUi() only creates canvas, shading divs, and scannerPausedUiElement. Camera selection UI is exclusively inside Html5QrcodeScanner, which is not used.
  timestamp: 2026-03-14

## Evidence

- timestamp: 2026-03-14
  checked: components/QRScanner.tsx
  found: Uses Html5Qrcode (low-level API) correctly. Destructures `{ Html5Qrcode }` from dynamic import. Calls `.start({ facingMode: { ideal: 'environment' } }, ...)`. Has error handling in both per-frame callback and .catch().
  implication: The API migration to Html5Qrcode was completed correctly. Current code should NOT show the library dropdown.

- timestamp: 2026-03-14
  checked: git diff 363957c HEAD -- components/QRScanner.tsx
  found: The only change since the migration commit is cosmetic: `liquid-glass` -> `bg-black` on the container div. The core scanner logic is unchanged.
  implication: The "dropdown still appearing" report is based on a stale build or a pre-363957c deployment, not the current code.

- timestamp: 2026-03-14
  checked: .next/static/chunks/1c9ffce5dd967e02.js (dynamic chunk for html5-qrcode)
  found: Contains `Html5QrcodeScanner` class and `CAMERA_SELECTION_SELECT_ID` constant because Next.js bundles the entire ESM module when any export is imported. However, `Html5QrcodeScanner` is never instantiated.
  implication: Tree-shaking does not apply across dynamic import() boundaries. The scanner UI code is present in the bundle but dead code.

- timestamp: 2026-03-14
  checked: QRScanner.tsx .catch() handler keywords vs library error strings
  found: The .catch() checks for: NotAllowedError, NotReadableError, NotFoundError, OverconstrainedError. Library rejects with "Camera streaming not supported by the browser." for insecure contexts and "Error getting userMedia, error = ..." for getUserMedia failures. The insecure context message matches NONE of the keywords.
  implication: Silent failure on HTTP-served deployments. User sees blank scanner with no error message.

- timestamp: 2026-03-14
  checked: node_modules/html5-qrcode/cjs/camera/core-impl.js lines 151-160
  found: `videoElement.style.width = "{parentElement.clientWidth}px"` is set at VIDEO ELEMENT CREATION TIME, before the camera stream starts. If clientWidth is 0, video renders invisible.
  implication: If #qr-reader has not yet laid out (clientWidth=0), video is invisible even though camera is running.

- timestamp: 2026-03-14
  checked: QRScanner.tsx cleanup function (return from useEffect)
  found: `scannerRef.current?.stop().catch(console.error)`. If unmount happens while import() is still resolving, scannerRef.current is null (no-op), but import() completes afterward and calls start() on an already-unmounted component -> camera stays open with no cleanup.
  implication: Camera leak on rapid open/close. Not the primary "no feed" issue.

- timestamp: 2026-03-14
  checked: app/layout.tsx
  found: No `export const viewport` metadata. No `viewport-fit=cover`, no `interactive-widget`, no `user-scalable=no`. Next.js default generates minimal viewport tag.
  implication: On iOS with notch/home indicator, fixed overlay does not extend to safe area edges. On mobile browsers, user can accidentally zoom during scanning.

- timestamp: 2026-03-14
  checked: QRScanner.tsx JSX structure (lines 65-86)
  found: Close button has `className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white"`. The bg-white/10 = rgba(255,255,255,0.1) is 90% transparent. The X icon is white (text-white), which should contrast against the bg-black/90 overlay. However, the button has no z-index set and the library sets `element.style.position = "relative"` on #qr-reader, which could affect stacking if they share a parent context.
  implication: Button icon itself is white-on-dark (readable), but the button background is nearly invisible. The real unreadability issue is likely that on mobile the overlay background doesn't render as expected, leaving the button floating over unknown content.

- timestamp: 2026-03-14
  checked: next.config.mjs
  found: `output: 'export'` - static site generation. App is served as a static bundle (HTML/CSS/JS files). Camera API requires HTTPS on all modern mobile browsers.
  implication: If served over HTTP (common for local/staging), ALL camera functionality fails silently.

## Resolution

root_cause: The "dropdown still appearing" symptom is a stale-build artifact - the current code correctly uses Html5Qrcode. The remaining real bugs are: (1) silent failure on HTTP/insecure contexts because error messages don't match the .catch() keyword list; (2) potential zero clientWidth on the video element if layout hasn't settled; (3) missing viewport metadata for iOS safe area and zoom prevention; (4) camera resource leak on rapid unmount during async import.
fix: n/a - diagnosis only
verification: n/a
files_changed: []
