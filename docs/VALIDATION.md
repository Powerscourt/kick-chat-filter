# Validation record — 2026-10-27

## Status

**0.1.0 preview; v1 acceptance is NOT complete.** Source and automated tests are implemented. Basic installed Chrome behavior is verified, with remaining manual gates explicitly below.

## Automated checks

Commands from the project root:

```sh
npm ci --ignore-scripts
npm test
npm run check
npm run test:performance
```

Runner: built-in Node `node:test`, jsdom 30.1.3. Test host: macOS, Node v26.8.0-alpha.0.0.0 / npm 11.19.0. npm reports this pre-release Node as outside its supported range; tests and package checks nevertheless ran successfully. A stable supported Node version is recommended for reproduction.

Coverage: acceptance matching matrix; Turkish dotted/dotless I and English edge cases; NFC; Unicode phrase edges including astral letters/marks/emoji/URLs; invalid and malicious-looking rules; local schema/errors/subscriptions; initial rows; streaming additions; text recycling; restores; root/SPA changes; action menus/replies/mentions/dividers; safe unknown markup; content-script startup races and two-tab events; popup validation, safe text rendering and save errors; throttled-background detached-queue pruning.

Performance fixture: 2,000 existing rows, 100 rules, ten arrivals per 100ms for two seconds (200 arrivals), removing old rows to keep the mounted window bounded. Local regression budgets: initial scan <5 seconds and complete two-second burst <6 seconds. The pre-final hardening run measured initial scan **152.4ms**, burst **2061ms**, exactly **200** arrival rows processed, no full backlog rescan, zero remaining observers and zero retained tracked rows after cleanup. Heap before 120.3MB, after explicit GC 40.4MB. Heap values describe the process, not isolated extension allocation or a proof of universal leak freedom. Final run after background-queue hardening: **21/21 automated tests passed**, 0 failed/cancelled/skipped/todo; `npm run check` passed. Separate explicit-GC performance run: initial scan **149.7ms**, burst **2062.4ms**, exactly 200 arrival rows processed, heap 120.4MB before / 40.4MB after GC, zero remaining observers and zero retained tracked rows. The performance test itself also passed with no skips.

This is a synthetic DOM test, not a browser rendering benchmark. Live peak-traffic scrolling/input responsiveness and paint/flicker remain unmeasured.

## Manual Chrome checks actually performed

Chrome 156.0.8078.48, macOS, Mo'Kick 3.3.1 enabled, unpacked extension loaded from this folder with explicit user authorization.

- Popup rendered in Turkish; Enter added terms, remove buttons saved changes and global switch worked.
- On `/razo97`, adding an observed `giveaway` body keyword hid **3** mounted rows. Popup reported active with 3 hidden. Disabling reduced the count to 0 and all three previously hidden bodies reappeared in the accessibility tree. Re-enabling removed those bodies again while unrelated chat remained, including the pinned control containing the same word.
- On `/anthonyz`, adding `lol` hid **2** mounted ordinary messages. Removing `giveaway` in that popup restored matching rows on the first tab without reload: actual cross-tab storage propagation was observed.
- Blocking the sender-name-only term `Faded_Gxd` left that sender's clean `facts` body and other clean rows visible. Body-only extraction is also fixture-tested with synthetic `ahmet` as a sender.
- Saved terms survived extension reload, Kick refresh and popup reopening. Final test terms were removed; extension left enabled with an empty blocklist, and the final source reload/popup showed active status and zero hidden rows. Test-created Chrome tabs were closed and the original user tab left open. This is not a browser-restart test.
- DevTools inspection identified action menus and reply/mention/divider shapes; the adapter was corrected and regression tests added. Reloading the final reply-aware adapter produced active status on the second channel with no selector warning for the observed backlog.
- Live DOM/in-site navigation reconnaissance is documented separately. Chat content was never posted, modified on the server or saved as chat logs.

## Acceptance gates

| Plan requirement | Evidence / remaining work |
| --- | --- |
| Exact real `Ahmet bugün yayında mı?` hidden by `ahmet` | Exact phrase verified in synthetic fixtures only. Live tests used naturally occurring other terms; exact real phrase remains pending. No chat was sent to manufacture it. |
| Unrelated body visible; username alone ignored | Verified live with another sender term and in exact synthetic fixtures. |
| Existing and incoming rows respond to add/remove/toggle/mode | Existing/add/remove/toggle verified live; incoming/recycling and mode semantics automated. Controlled manual incoming-message/mode matrix still pending. |
| Persistence and all applicable tabs | Reload/popup reopen and two real tabs verified; full browser restart pending. |
| No credentials/API/websocket/server behavior | Source/manifest checks and code inspection passed; isolated extension network tracing not completed. Page and Mo'Kick emit their own requests/errors. |
| No pane hiding/degradation | Synthetic load passed; live ordinary rows and surrounding controls remained usable. Extended peak-traffic/scroll/layout pass pending. |
| Tests and one real scenario | Automated suite passes; two live channels exercised. |
| Source, tests, install/privacy docs | Included. |
| Unsupported modes listed | README, selector record and release notes enumerate them. |

Firefox, browser restart, paused/scroll-up chat, chat-closed/open toggles, theater/full-screen, dashboard/pop-out layouts and exhaustive Mo'Kick combinations were not tested. No skipped automated tests are described as passed. Do not promote this preview to v1 until all mandatory gates are verified.

## Phase checklist

- A: live DOM, sanitized fixture, reference/license review done; alternate layouts remain unverified.
- B: MV3, settings, matcher, guarded adapter, observer/restore/navigation/storage implementation done and fixture-tested.
- C: Turkish accessible popup, mode/status/counter/local notice/icons done; native popup interaction checked.
- D: automated/security checks and basic installed Chrome scenarios done; remaining manual gates above block full v1 sign-off.
