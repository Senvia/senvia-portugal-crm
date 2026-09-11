const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadRoute(fileName, mfaStatus) {
  const calls = { permissions: 0, pipeline: 0, subscription: 0 };
  const exports = {};
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, fileName), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText;

  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'react') return { useState: () => [false, () => {}] };
      if (name.includes('react-router-dom')) {
        return { Navigate: 'navigate-fixture', Outlet: 'outlet-fixture', useLocation: () => ({ pathname: '/dashboard' }) };
      }
      if (name.includes('AuthContext')) {
        return {
          useAuth: () => ({
            user: { id: 'user-1' },
            isLoading: false,
            needsOrgSelection: false,
            organizations: [{ organization_id: 'org-1' }],
            selectOrganization: () => {},
            mfaStatus,
            organization: { id: 'org-1', name: 'Org' },
            profile: { full_name: 'User' },
          }),
        };
      }
      if (name.includes('useStripeSubscription')) {
        return { useStripeSubscription: () => { calls.subscription += 1; return { subscriptionStatus: null, hasChecked: false }; } };
      }
      if (name.includes('usePipelineStages')) {
        return { usePipelineStages: () => { calls.pipeline += 1; return { data: [], isLoading: false }; } };
      }
      if (name.includes('usePermissions')) {
        return { usePermissions: () => { calls.permissions += 1; return { isAdmin: true }; } };
      }
      return new Proxy({}, { get: (_, property) => String(property) });
    },
  });

  return { exports, calls };
}

for (const [fileName, exportName] of [
  ['ProtectedLayoutRoute.tsx', 'ProtectedLayoutRoute'],
  ['ProtectedRoute.tsx', 'ProtectedRoute'],
]) {
  test(`${exportName} defers protected data while MFA is pending`, () => {
    // Given an authenticated session which has not completed its MFA gate
    const { exports, calls } = loadRoute(fileName, 'enrollment');

    // When the protected route decides which surface to render
    exports[exportName]({ children: 'protected-content' });

    // Then no organization-protected request has started
    assert.deepEqual(calls, { permissions: 0, pipeline: 0, subscription: 0 });
  });
}
