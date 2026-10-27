# 0.1.0 preview — 2026-10-27

Implemented local-only keyword/phrase filtering, Turkish Unicode normalization, default substring/optional whole-word matching, reversible row hiding, live settings propagation, current-mounted-row counts and a Turkish keyboard-accessible popup. Added guarded selectors established through live reconnaissance, sanitized fixtures, automated matching/storage/DOM/popup/load tests, icons, installation and privacy documentation.

Installed Chrome tests verified ordinary matching rows, restores, username isolation and cross-tab propagation with Mo'Kick 3.3.1 enabled. A live action-menu difference was corrected. The verified reply wrapper excludes the quoted body; inline mention text is included. Special non-message dividers remain visible.

**Not a completed v1 release.** Remaining gates include the exact real `Ahmet bugün yayında mı?` acceptance message, controlled incoming/mode tests, full browser restart, extended scroll/peak-rate/layout checks, isolated network tracing and Firefox. Theater/full-screen, dashboard/pop-out, paused/history and other extension combinations are unverified. Image emote names are intentionally not filtered. Unknown markup fails open. Virtualizer spacing and flicker can vary; zero exposure is not guaranteed. See `docs/VALIDATION.md`.

## Interface language update

English is now the default interface language, as requested after the original implementation plan. The popup offers English and Türkçe; the preference is stored locally and restored on reopening. All popup labels, feedback, status text and accessible labels switch together. Keyword normalization remains unchanged. Validation: 22 automated tests passed, none skipped; package checks passed.
