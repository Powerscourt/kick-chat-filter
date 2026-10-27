# Phase A — research and selector decision record

Date: **2026-10-27**, Europe/Istanbul. No production selector was chosen before live inspection.

## Environment and observations

- In-app browser: live DOM inspection at `https://kick.com/razo97` and `https://kick.com/anthonyz`, signed out. Its engine/version was not exposed by the available browser API; it is not represented as a Chrome test.
- Desktop **Google Chrome 156.0.8078.48**, macOS: installed unpacked extension and live tests on the same two URL forms. Browser version read from the application bundle. Mo'Kick **3.3.1** already enabled; it was not disabled or reconfigured.
- Both channels were live and chats arrived/rendered without requiring sign-in in the in-app browser. An offline/non-live stream's chat availability was not tested.
- Root: `div#chatroom-messages[data-testid="chatroom-messages"]`, a scrollable element, with a direct `div.no-scrollbar.relative` child. That child contains direct `div[data-index]` virtual-positioning wrappers with absolute positioning and `translateY` transforms.
- Ordinary row: virtual wrapper → `div.group` → `div.break-words` → identity `div.inline-flex` followed by body `span.font-normal`. Identity contains timestamp, badge elements and exactly one `button[title][data-prevent-expand]` sender button. This excludes those fields from the matching input.
- Live row indices and mounted windows changed over time (15 rows, then 15 with later indices on the first channel; 21 at one second-channel inspection). Virtualization is established by positioning/mount changes; exact renderer reuse internals were not inferred. Fixture tests cover both replacement and in-place text recycling defensively.
- Emotes: `span[data-emote-id][data-emote-name]` containing a div and `img[alt]`. Badges can use SVG title elements. v1 skips these body images/emote spans; no alt/name keyword filtering.
- Clicking an existing `/razo97` sidebar link from `/anthonyz` completed an in-site channel transition and produced the same root/row/body structure. A DOM-only read did not establish whether the identical root object was reused; code/tests cover both retained and replaced roots.

## Additional desktop Chrome evidence

The first installed run returned selector warnings and zero hidden rows. DevTools structural reads (without saving chat content) showed an action-menu div alongside the message box within `div.group`. The initial exactly-one-child assumption was too strict. Final adapter requires exactly one **direct content box**, allows the separately rendered action menu, and still extracts only that box's body.

Verified reply form: group → direct `div.wrap-break-word.flex-col` → quote `button` followed by `div.wrap-break-word` → identity div + body span. The quote is excluded. Inline mention buttons inside the body carry visible message text and are read there. No `data-mokick-*` or other-extension selector is used.

A non-message new-messages divider was observed with two direct `div.h-px.grow` lines and one direct `div.text-sm.font-semibold` label in the group, without a body or sender. It is explicitly left alone and does not produce a false adapter warning.

## Adapter guard / failure policy

Require a unique exact root, numeric direct virtual row under the observed list, one group child, exactly one verified content box, and the identity/body pair above. Unknown message shapes are left visible. Only individual verified rows get `data-kcf-hidden="1"`; the CSS path repeats the root/list/row restriction. No guessed selector fallback or broad text-content matching. All selectors are centralized in `src/content/kick-adapter.js` (CSS repeats only the visibility boundary).

`fixtures/kick-chat-example.html` is a **reduced, sanitized reconstruction** of the observed hierarchy; all usernames, timestamps, messages, badge labels and emote metadata are synthetic. Additional action-menu, reply, mention and divider structures are constructed with synthetic content in integration tests. No real chat history or personal identifiers were saved in the repository.

## Reference review (strategy, not dependencies)

- [KickKit source](https://raw.githubusercontent.com/ensardev/KickKit/master/src/content.js) corroborates root/index/body separation and mutation-based processing. [README](https://github.com/ensardev/KickKit) declares MIT; a standalone license grant/file was not established in the inspected listing. It was not installed or behavior-tested. No code copied.
- [uKick source](https://raw.githubusercontent.com/berkaygediz/uKick/main/chromium/content.js) uses root observers and batches added nodes for its broader chat features. Its [repository](https://github.com/berkaygediz/uKick) and source header identify Apache-2.0. Its broader fallback selectors and user-blocking behavior were not adopted. It was not installed or behavior-tested. No code copied.
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts) informed manifest origin restrictions and isolated execution.
- [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage) informed storage.local and onChanged propagation.

## Remaining Phase A/manual coverage

The standard chat-open view was inspected. Closed/late/replaced roots and navigation are fixture-tested, but live chat-open/closed toggle, paused/scroll-up history, theater/full-screen, dashboard and pop-out layouts have not been verified. Other enhancer combinations/settings and exact peak-rate browser flicker have not been measured. The implementation is limited to verified shapes and deliberately fails open elsewhere.
