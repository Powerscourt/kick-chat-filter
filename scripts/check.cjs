const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['storage']);
assert.equal(manifest.background, undefined);
assert.equal(manifest.host_permissions, undefined);
assert.deepEqual(manifest.content_scripts[0].matches, ['https://kick.com/*', 'https://www.kick.com/*']);
const sourceFiles = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (file.endsWith('.js')) sourceFiles.push(file);
  }
}
visit(path.join(root, 'src'));
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  new vm.Script(source, { filename: file });
  assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket|eval)\s*\(|new\s+Function\b|\.innerHTML\s*=/.test(source), file);
}
const refs = [...manifest.content_scripts.flatMap(s => [...s.js, ...s.css]), manifest.action.default_popup, ...Object.values(manifest.icons)];
for (const ref of refs) assert.ok(fs.existsSync(path.join(root, ref)), `Missing packaged file: ${ref}`);
console.log(`Manifest, ${sourceFiles.length} scripts, packaged resources and network/HTML execution checks passed.`);
