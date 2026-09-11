const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function gate(status) {
  const exports = {};
  const onComplete = () => {};
  const onSignOut = () => {};
  const code = ts.transpileModule(fs.readFileSync(__dirname + '/MfaAccessGate.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => name === 'react/jsx-runtime' ? require(name) :
    name.includes('AuthContext') ? { useAuth: () => ({ mfaStatus: status, completeMfaChallenge: onComplete, signOut: onSignOut }) } :
      { EnrollMFA: 'enroll-fixture', ChallengeMFA: 'challenge-fixture', Button: 'button', Loader2: 'spinner' } });
  const tree = exports.MfaAccessGate();
  const nodes = [];
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    nodes.push(node);
    walk(node.props?.children);
  }
  walk(tree);
  return { nodes, onComplete, onSignOut };
}
test('admin without enrolled factor gets enrollment that can complete or sign out', () => {
  const { nodes, onComplete, onSignOut } = gate('enrollment');
  const enroll = nodes.find(node => node.type === 'enroll-fixture');
  assert.ok(enroll);
  assert.equal(enroll.props.onSuccess, onComplete);
  assert.equal(enroll.props.onCancel, onSignOut);
  assert.equal(nodes.some(node => node.type === 'challenge-fixture'), false);
});
test('existing factor requires challenge', () => {
  const { nodes } = gate('pending');
  assert.ok(nodes.some(node => node.type === 'challenge-fixture'));
  assert.equal(nodes.some(node => node.type === 'enroll-fixture'), false);
});
test('policy outage has retry and signout instead of access or endless loading', () => {
  const { nodes, onComplete, onSignOut } = gate('error');
  assert.ok(nodes.some(node => node.props.onClick === onComplete));
  assert.ok(nodes.some(node => node.props.onClick === onSignOut));
  assert.equal(nodes.some(node => node.type === 'spinner'), false);
});
