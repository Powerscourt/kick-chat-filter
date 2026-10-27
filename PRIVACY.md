# Privacy

Kick Chat Filter works entirely inside the browser. It reads rendered Kick message bodies solely to compare them with your blocked terms. It hides matching rows for you; it does not delete, report or moderate anything on Kick's servers.

The extension sends no messages, chat content, settings, identifiers or telemetry anywhere. It contains no analytics, remote executable code, network API, Kick API client, websocket interception, cookie access, authentication handling or background service worker. Kick itself and other installed extensions can still make their own network requests independently.

The only permission is `storage`. Content scripts run in an isolated world on `https://kick.com/*` and `https://www.kick.com/*`. No broad tabs, activeTab or all-sites permissions. Popup-to-tab status messages contain only state and counts, never chat bodies or logs. The tab id is used transiently to ask the active tab for status; URLs and browsing history are not collected.

Enabled status, terms, matching mode, interface language and schema version are saved in `storage.local`. This is browser-local storage, not encrypted secret storage; do not treat blocked words as secrets. Chat text and usernames are not saved. Counters and transient row references live only in the page context. Removing a term updates local storage; removing the extension removes its saved settings through the browser's extension lifecycle.

Fixtures contain synthetic identities/messages only. Development tests require an optional npm dependency; it is not needed or executed by the installed extension. No accounts, cloud sync or external services are used by this extension.
