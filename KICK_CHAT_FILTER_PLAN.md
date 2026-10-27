Kick Chat Keyword Filter — Implementation Plan for Codex

Document type: Research-backed engineering specification; NO implementation code included.
Date: 2026-10-27
Status: Planning only; implementation must begin only when this document is given to Codex.
Primary target: Chrome / Chromium (Manifest V3)
Secondary target: Firefox where practical
Language of UI: Turkish by default; strings centralized for future English support.

1. Mission

Develop a small, privacy-first browser extension that hides messages in Kick live chats when the message body includes any user-defined blocked keyword or phrase. The filtering is client-side only, visible only to the person running the extension. The extension must never moderate, delete or report a message on Kick’s servers.

Example: If the user blocks ahmet, the text Ahmet bugün yayında mı? should not remain visible in the live chat. The message Merhaba arkadaşlar should remain visible. Case differences should be ignored.

Critical product rule: The default setting must be substring matching (the keyword anywhere within the message), not whole-word-only matching. Provide optional whole-word matching for people who prefer it.

2. Scope and non-goals

Must ship in version 1

• Enable / disable all filtering using a prominent extension popup toggle.
• Add, view and remove blocked keywords or multiword phrases.
• Persist settings across page reloads and browser restarts.
• Match messages case-insensitively, with a deliberate and well-tested Turkish text normalization policy.
• Default substring matching; optional whole-word matching.
• Hide the entire chat message row, including its username/timestamp/badges, when the message content matches. Avoid hiding an entire chat pane or unrelated parent container.
• Process messages already visible when the extension loads and messages arriving later.
• Handle dynamic chat mounting, navigation between channels without full reload, and chat rerenders.
• Reflect setting changes promptly in all open Kick tabs, including restoring messages hidden by the extension when disabled or removed from the blocklist, if still present in DOM.
• Provide an unobtrusive count of messages filtered in this tab/session, accurately labeled and reset by navigation/reload as appropriate.
• Restrict operation to Kick pages; do not send chat messages or settings to remote services.
• Fail safely: if Kick changes markup, leave chat functional instead of hiding the wrong content.
• Provide installation instructions and a short README.

Explicit non-goals for v1

• Kick server-side moderation, bans, timeouts or deletion.
• Blocking users by username. A username filter can be a separate v2 feature, but usernames must not accidentally trigger v1 body-text filtering.
• Filtering based on audio, video, VOD captions, stream title or other page sections.
• Reading Kick authentication cookies, private messages or credentials.
• External telemetry, analytics, advertising or accounts.
• Regex entered by end users (possible v2 enhancement; avoid ReDoS and UI complexity in v1).
• Import/export, cloud sync, per-channel rules and blur mode (candidate v2 enhancements).
• A native mobile app or unsupported browsers.

3. Research / evidence baseline

• KickKit advertises word filtering (hide/blur), whole-word mode and Unicode/Turkish compatibility. Treat as reference rather than dependency: https://github.com/ensardev/KickKit
• Kick Chat Cleaner supports hiding user-specified message text/emotes: https://chromewebstore.google.com/detail/kick-chat-cleaner/nkpchhnmenbncfofheegmabpgcickkob
• uKick is another open-source reference for DOM-based filtering and dynamic Kick pages: https://github.com/berkaygediz/uKick
• Chrome MV3 content scripts documentation: https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
• Chrome storage API and change events: https://developer.chrome.com/docs/extensions/reference/api/storage
• Firefox content scripts: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts
• Mozilla manifest documentation: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json
• Manifest V3 prohibits remotely hosted executable code: https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code

Evidence limitation: The exact current Kick chat DOM structure and selectors have not been verified through a live browser session for this document. Do NOT hallucinate or hardcode unverified CSS selectors as if confirmed. Begin implementation with live DOM reconnaissance and inspect existing open-source implementations for corroboration. Verify their current behavior and licenses before copying any code.

4. Architecture

Build a small, dependency-light extension, preferably plain JavaScript, HTML and CSS. Use MV3. No service worker unless a concrete, documented feature requires it.

Suggested logical components (names can vary):

• Content script: Detects Kick chat root, monitors added/updated chat rows, extracts message body, invokes matcher and hides/unhides chat rows.
• Chat adapter: Centralizes Kick-specific DOM selectors and strategies. Must be isolated from filtering logic, so Kick markup changes affect one module.
• Matcher: Pure functions for sanitizing rules, case normalization, substring/whole-word matching, and deciding visibility. Independent of DOM.
• Settings store: Browser extension storage.local is the canonical state for v1; includes a schema version, enabled flag, blocked terms and matching mode. Listen to storage.onChanged. Do not assume storage.sync is private or appropriate by default.
• Popup UI: Add/delete rules, display current rules, enable toggle, substring/whole-word option, concise in-page status/help and session filter count if communications support it. Avoid requiring the popup to remain open.
• Style: A namespaced CSS class or data attribute for extension-hidden rows. Prefer display: none !important restricted to an added marker over deleting nodes from the DOM.

Proposed package structure:

kick-chat-filter/
  manifest.json
  src/
    content/
      index.js
      kick-adapter.js
      observer.js
      visibility.js
    shared/
      matcher.js
      settings.js
      normalization.js
    popup/
      popup.html
      popup.css
      popup.js
  assets/
    icons/
  tests/
    matcher.test.js
    fixture-filter.test.js
    storage.test.js
  fixtures/
    kick-chat-example.html
  README.md
  PRIVACY.md

The structure is illustrative. Prefer removing complexity over adding unnecessary tooling. Pick one modest test runner and document it.

5. Stage 0 — live Kick reconnaissance (blocking prerequisite)

Before implementation:

1. Open an accessible Kick channel with active chat on desktop Chrome. Note the tested date, URL form, browser version, and whether a live stream is needed.
2. Inspect several real message nodes in DevTools. Document the chat scrolling container, individual message row, message body only, and username/badges/timestamp sub-elements.
3. Check if rendered emotes are images, spans, custom elements or accessible text, and how their alternative text is exposed. For v1, prioritize visible text and phrases; explicitly document emote support if available.
4. Inspect how chat rows are inserted, removed and recycled. Determine whether existing row text updates in-place (virtualization) and whether a MutationObserver requires childList, subtree and selective characterData observation.
5. Navigate between Kick channels without a hard reload. Determine how the chat root is replaced and how to reconnect the observer.
6. Inspect theater/full-screen modes and standard chat-open/chat-closed states, as well as any relevant dashboard layouts, to determine what is supported without broad page targeting.
7. Test for conflicts with MoKick and other chat-enhancing extensions. Incompatibility can be documented; never make page selectors dependent on another extension.
8. Save sanitized HTML fixtures and a short selector decision record. Do not store real usernames, chat histories or personal information in the repo.
9. Review existing GitHub projects for strategy and test ideas. Review licenses before incorporating code.

Exit condition: A documented, verified adapter strategy that uniquely selects the complete chat message row and extracts ONLY its body. If inspection is impossible, build a DOM-agnostic skeleton with fixture-based tests, mark live Kick support as UNVERIFIED, and do not claim the extension is fully working.

6. Stage 1 — matching contract

Default behavior

• Multiple entries are combined with logical OR; any match hides the row.
• Matching is case-insensitive and, by default, substring-based.
• Trim outer whitespace from stored terms; reject empty entries and deduplicate equivalent terms.
• Preserve original display form in UI where useful, while using normalized representations for comparison.
• Do not automatically strip accents or transliterate names; avoid unexpected matches.
• Avoid innerHTML and never treat user-supplied terms as HTML.
• Restrict matching input to actual message body content; sender usernames, badges and timestamps should not cause false positives.
• Ignore non-chat UI (such as chat textbox, autocomplete, pinned controls and moderation buttons) unless live inspection establishes an explicit reason to support an element.

Turkish Unicode policy

Choose and document an exact policy rather than relying on naive .toLowerCase() without testing:

• Unicode normalization: NFC on user terms and extracted chat text.
• Case-insensitive comparison must support Turkish dotted/dotless I correctly as far as a consistently documented locale policy allows.
• Test Ahmet vs ahmet, İzmir vs izmir, Işık vs ışık, combining marks and emoji-containing messages.
• Consider toLocaleLowerCase('tr') for Turkish, with explicit tests for English/non-Turkish chat terms. If locale-specific edge cases conflict, choose a documented predictable policy rather than ad hoc character replacements.
• Whole-word mode needs a Unicode-aware boundary strategy. ASCII \b is not sufficient for Turkish characters. Prefer Intl.Segmenter if supported and appropriate, or a tested Unicode property approach with well-defined behavior for punctuation and emoji.

Matching acceptance examples

|Blocked |Message body            |Default substring          |Optional whole-word                              |
|--------|------------------------|---------------------------|-------------------------------------------------|
|ahmet   |`Ahmet burada`          |Hide                       |Hide                                             |
|ahmet   |`mehmet ve ahmet`       |Hide                       |Hide                                             |
|ahmet   |`ahmetler`              |Hide                       |Show                                             |
|ahmet   |`merhaba`               |Show                       |Show                                             |
|izmir   |`İzmir güzel`           |Hide                       |Hide under TR locale policy                      |
|ışık    |`IŞIK`                  |Hide under TR locale policy|Hide under TR locale policy                      |
|kötü söz|`Bu kötü söz kullanıldı`|Hide                       |Hide when phrase boundaries meet documented rules|

7. Stage 2 — DOM filtering mechanics

1. On injection, load settings asynchronously and initialize a safe, idempotent lifecycle.
2. Locate chat root using verified selector(s); handle root not yet mounted.
3. Run one bounded initial scan of known chat rows after root exists.
4. Attach a MutationObserver to the narrowest stable chat container, not the full document indefinitely. A temporary, bounded discovery observer is acceptable while waiting for the root.
5. Batch mutation records and deduplicate changed candidate rows. Observe child additions and targeted text changes when necessary, but prevent observers from processing their own visibility mutations endlessly.
6. For each row, extract the message body using DOM-safe text extraction. Avoid .textContent on the entire row where username/badges are present. Establish emote handling separately.
7. Evaluate current settings, mark matching rows with a unique extension marker, and remove that marker for nonmatching rows.
8. Never delete Kick-owned nodes for basic hide behavior. This permits restoring messages after disabling the filter and lowers the risk of breaking the chat renderer.
9. Manage chat-root replacement, browser SPA navigation, DOM recycling and detach/reconnect cleanup. Avoid duplicate observers and dangling listeners.
10. Reprocess existing rows when blocked list, enabled status or match mode changes. All open Kick tabs should update through storage events without manual refresh.
11. Define a safe fallback when Kick changes markup: preserve chat, surface a subtle status/error, log in development only.
12. Keep the original reading/scrolling experience smooth. Avoid resetting chat scroll or moving focus.

Race conditions and flicker

Where possible, filter newly inserted rows before they are painted or use narrowly scoped CSS to minimize visible flash. Do not sacrifice correctness or hide the entire chat panel indefinitely to achieve zero flicker. Measure behavior on an active chat and document any remaining brief exposure under extreme traffic.

Counters

Count a row as hidden only when the extension transitions it from visible to filtered state in the current session. Do not increment for repeat mutations or scans of an already hidden row. Define behavior for recycled rows and settings changes explicitly; hidden now is safer than an inaccurate all-time count.

8. Stage 3 — popup UX

Create a compact, visually clean popup (~320–380 px wide) with strong contrast and keyboard accessibility. Default copy in Turkish.

Suggested hierarchy:

1. Header: Kick Chat Filter, short subtitle Sohbet mesajlarını kelimelere göre gizle.
2. Primary enable toggle, clearly labeled Filtreleme aktif.
3. Single-line input with placeholder Engellenecek kelime veya ifade, plus explicit add button. Enter should add.
4. List of blocked terms as readable chips/rows with individual remove actions.
5. Toggle between Kelimeyi içeren tüm mesajlar (default) and Yalnızca tam kelime.
6. Compact indicator explaining that filtering is local to the current browser.
7. Context status: supported Kick page, waiting for chat, active, or selector issue, if obtainable reliably.

UX rules:

• Empty list state must explain how to add a word.
• Deduplicate rules and show non-disruptive validation for empty input.
• Preserve keyboard use, visible focus and accessible labels.
• Never show entire messages or chat logs in popup.
• Do not over-design with multiple settings pages in v1.
• No network access or analytics.

9. Stage 4 — permissions, privacy and security

• Manifest V3.
• Grant only the necessary storage permission and narrowly scoped kick.com matches/host access consistent with the final implementation. Avoid <all_urls>, cookie access, webRequest interception, unnecessary tabs access and broad activeTab usage.
• Use an isolated content-script world, unless a specific inspected feature proves the need for the main world.
• Keep executable code inside the packaged extension; no remote executable JavaScript, eval, or dynamically constructed functions.
• Treat message content as untrusted. Never inject chat content or user rules into innerHTML.
• Do not collect/send chat messages, blocklists, cookies, tokens, or identifiers to any external destination.
• Store settings in storage.local; note that local storage is not encrypted secret storage, and blocked words should not be treated as secrets.
• Avoid confusing extension-local hiding with server moderation; document this in README/privacy copy.
• Do not modify Kick websocket traffic or send requests to the Kick API.

10. Stage 5 — testing plan

Pure unit tests

• Empty/whitespace/duplicate rules; multiple terms OR behavior.
• Case-insensitive comparisons, Turkish letters (İ/i and I/ı), Unicode normalization and combined marks.
• Substring vs whole-word boundaries, punctuation, quotes, URLs and emojis.
• Long text, many rules, unusual Unicode and malicious-looking HTML payloads.
• Schema migrations or invalid settings fallback.

DOM integration tests with fixtures

• Extract body without incorporating username/timestamp/badges.
• Hide entire matching row; leave unmatched rows intact.
• Initial backlog filtering and new streamed row filtering.
• Repeated mutations do not create duplicate observers/counters.
• Changing words, switching matching mode and disabling filtering restores existing rows correctly.
• Root replacement, row recycling and SPA-style navigation.
• Filter marker is isolated and does not hide adjacent messages.
• No fatal failure on missing selectors or unsupported markup.

Browser manual end-to-end verification

• Chrome with unpacked extension installed via chrome://extensions → Developer mode → Load unpacked.
• Open at least two active Kick channels and verify filtering on both.
• Verify the popup is accessible and saves correctly.
• Type blocked terms; verify relevant messages disappear without removing unrelated messages.
• Keep several tabs open: settings should propagate across tabs.
• Reload pages; close/reopen browser; verify persistence.
• Test paused chat, scroll-up chat history, rapid chat flow, theater mode and channel transitions.
• Test coexistence with MoKick (if available) and note any unresolved compatibility issues.
• Confirm there are no unexpected network calls and no severe DevTools errors.
• Firefox manual unpacked/temporary add-on test as a secondary compatibility check; document any browser-specific manifest differences.

Quantitative performance acceptance

• Use a synthetic fixture with at least 2,000 existing rows and a simulated arrival burst of 100 messages per second.
• No unbounded accumulation of observers or detached-node references.
• No full-page rescan for every message. Process batches of changed rows.
• Instrument fixture test timing and memory behavior; establish a reasonable threshold on the test machine rather than claiming an unmeasured universal millisecond guarantee.
• Chat scroll, input responsiveness and page navigation must remain usable under test conditions.

11. Prioritized execution checklist

Phase A — investigate and validate

☐ Inspect actual Kick chat DOM and document correct row/body selectors.
☐ Capture sanitized sample fixtures.
☐ Assess SPA navigation, virtualized chat and alternate chat layouts.
☐ Evaluate competing open-source implementations and their licenses.

Phase B — build core

☐ Initialize minimal MV3 package and manifest.
☐ Implement settings schema and storage wrapper.
☐ Implement pure keyword matcher and Unicode tests.
☐ Implement Kick adapter from verified DOM structure.
☐ Implement initial filtering, observers and reversible hiding.
☐ Implement re-filtering upon settings updates and navigation.

Phase C — interface

☐ Build accessible popup with add/remove and global toggle.
☐ Add matching mode and concise feedback/status.
☐ Add minimal icon set and local-only privacy notice.

Phase D — harden

☐ Run unit/DOM fixture tests.
☐ Verify in real Chrome Kick chat.
☐ Test across tabs, reloads, channel switches and heavy chat.
☐ Test Firefox if feasible.
☐ Complete security/permissions review.
☐ Write README, installation, troubleshooting and limitations.

12. Definition of done / acceptance criteria

All of the following must be true before claiming v1 is complete:

1. Adding ahmet hides a real Kick chat message Ahmet bugün yayında mı? on the user’s screen in a verified live browser test.
2. An unrelated chat message remains visible, and a matching username alone does not trigger filtering if its message body is clean.
3. Adding/removing rules and enable/disable affects existing and incoming chat messages without reload.
4. Settings persist after a browser restart; applicable tabs react to settings changes.
5. Normal filtering does not use Kick credentials, API endpoints, websocket interception or an external server.
6. No unintended whole-panel hiding, persistent blank chat or severe degradation in synthetic high-volume test.
7. Appropriate local automated tests pass; at least one real Kick chat scenario is tested manually and documented.
8. Final repo includes build/install instructions, privacy statement, source and test scripts.
9. Unsupported modes and unverified assumptions are listed in the release notes; never mark untested cases as validated.

13. Known risks and mitigations

|Risk                                     |Mitigation                                                                 |
|-----------------------------------------|---------------------------------------------------------------------------|
|Kick markup changes                      |Isolate selectors in adapter, verify DOM live, add fixture tests, fail open|
|Chat nodes are virtualized/reused        |Re-evaluate changed rows and do not permanently remove DOM nodes           |
|Keywords match usernames/badges          |Extract the message body only                                              |
|Turkish casefold/word-boundary surprises |Explicit normalization policy, Unicode-specific tests                      |
|Message briefly appears before hiding    |Narrow observer scope, batch handling and measure real behavior            |
|Extension conflicts with MoKick          |Test coexistence, avoid modifying Kick application state                   |
|High-traffic performance issues          |Observe narrow subtree, changed-row batching, no full rescans per update   |
|Browser-specific MV3 differences         |Chrome first, Firefox separate compatibility pass                          |
|Hidden rows remain hidden after disabling|Track only extension-owned markers and reconcile all currently mounted rows|
|Accidental privacy expansion             |Minimal permissions, no network access, local storage only                 |

14. Optional v2 roadmap (do not implement unless requested)

• Per-channel filter profiles.
• Filter by chat sender username (separate from message-body rules).
• Blur/reveal instead of complete hide.
• Optional text highlighting rather than hiding.
• Import/export settings.
• Regex filters with explicit guardrails and safe execution limits.
• Filter statistics that do not store chat content.
• Firefox-specific package and store publication pipeline.

15. Final instructions to Codex

Implement this plan, not a broader Kick client. Start by validating the current Kick DOM; do not invent selectors or treat references as proof of current behavior. Favor stable, readable code and targeted tests over frameworks or unnecessary dependencies. Implement in small phases, test at each phase, and document exact files and commands. Never claim live Kick compatibility until it has been verified in a browser. If browsing/DevTools is unavailable in Codex’s environment, clearly separate completed fixture-tested functionality from the outstanding live verification work. The user requested a private client-side keyword-hiding extension, not a moderation bot.