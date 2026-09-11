const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function renderDialog() {
  const exports = {};
  const storage = new Map();
  const navigations = [];
  let openState = false;
  const code = ts.transpileModule(fs.readFileSync(__dirname + '/MfaAdoptionDialog.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;

  const context = {
    exports,
    require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'react') {
        return {
          useEffect: effect => { effect(); },
          useState: () => [openState, next => { openState = typeof next === 'function' ? next(openState) : next; }],
        };
      }
      if (name.includes('react-router-dom')) return { useNavigate: () => path => navigations.push(path) };
      if (name.includes('AuthContext')) return { useAuth: () => ({ user: { id: 'user-1' }, mfaStatus: 'none' }) };
      if (name.includes('safeStorage')) {
        return { safeStorage: { get: key => storage.get(key) ?? null, set: (key, value) => storage.set(key, value) } };
      }
      if (name.includes('mfa-rollout')) {
        return {
          getMfaReminderDay: () => '2026-09-11',
          isMfaEnforcementActive: () => false,
          shouldShowMfaReminder: input => input.mfaStatus === 'none' && input.dismissedDay !== input.today && !input.enforcementActive && !input.announcementOpen,
        };
      }
      if (name.includes('useWhatsNewStore')) return { useWhatsNewStore: selector => selector({ isOpen: false }) };
      return new Proxy({}, { get: (_, property) => String(property) });
    },
    Date,
  };
  vm.runInNewContext(code, context);

  exports.MfaAdoptionDialog();
  const tree = exports.MfaAdoptionDialog();
  const nodes = [];
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    nodes.push(node);
    walk(node.props?.children);
  }
  walk(tree);
  return { nodes, storage, navigations };
}

test('daily MFA reminder can be postponed without blocking CRM access', () => {
  // Given an optional MFA reminder for an unenrolled user
  const { nodes, storage } = renderDialog();
  const buttons = nodes.filter(node => node.type === 'Button');

  // When the user postpones enrollment
  buttons[0].props.onClick();

  // Then the dismissal is recorded for the current Lisbon day
  assert.equal(storage.get('senvia_mfa_adoption_user-1'), '2026-09-11');
});

test('daily MFA reminder links directly to security settings', () => {
  // Given an optional MFA reminder for an unenrolled user
  const { nodes, navigations } = renderDialog();
  const buttons = nodes.filter(node => node.type === 'Button');

  // When the user chooses to configure MFA
  buttons[1].props.onClick();

  // Then the account security subsection opens
  assert.deepEqual(navigations, ['/settings?og=account&os=account-security']);
});
