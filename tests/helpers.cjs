const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const scripts = ['src/shared/normalization.js', 'src/shared/matcher.js', 'src/shared/settings.js',
  'src/content/kick-adapter.js', 'src/content/observer.js'];
function load(context, files = scripts) {
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  return context.KCF;
}
function pure() { return load(vm.createContext({})); }
function fixture(html = fs.readFileSync(path.join(root, 'fixtures/kick-chat-example.html'), 'utf8')) {
  const dom = new JSDOM(html, { url: 'https://kick.com/sample-channel', pretendToBeVisual: true, runScripts: 'outside-only' });
  const ns = load(dom.getInternalVMContext());
  return { dom, window: dom.window, document: dom.window.document, ns };
}
const settings = (terms = ['ahmet'], extra = {}) => ({ schemaVersion: 1, enabled: true, terms, mode: 'substring', language: 'en', ...extra });
const tick = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms));
function mockApiHub(initial = {}) {
  let data = structuredClone(initial);
  const listeners = new Set();
  const messageListeners = new Set();
  const api = {
    storage: { local: {
      async get(key) { return { [key]: structuredClone(data[key]) }; },
      async set(values) {
        const changes = {};
        for (const [key, value] of Object.entries(values)) {
          changes[key] = { oldValue: structuredClone(data[key]), newValue: structuredClone(value) };
          data[key] = structuredClone(value);
        }
        for (const callback of listeners) callback(changes, 'local');
      }
    }, onChanged: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) } },
    runtime: { onMessage: { addListener: fn => messageListeners.add(fn), removeListener: fn => messageListeners.delete(fn) } },
    tabs: { async query() { return [{ id: 1 }]; }, async sendMessage() {
      let response;
      for (const listener of messageListeners) listener({ type: 'kcf:status' }, {}, value => { response = value; });
      if (!response) throw Error('No content script');
      return response;
    } }
  };
  return { api, listeners, messageListeners, snapshot: () => structuredClone(data) };
}
module.exports = { root, load, pure, fixture, settings, tick, mockApiHub };
