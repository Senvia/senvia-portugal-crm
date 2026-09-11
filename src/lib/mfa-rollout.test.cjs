const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadRollout() {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(__dirname + '/mfa-rollout.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports });
  return exports;
}

test('MFA remains optional through 20 September in Lisbon', () => {
  // Given the final second of the announced adaptation period
  const { isMfaEnforcementActive } = loadRollout();

  // When the rollout state is evaluated
  const isRequired = isMfaEnforcementActive(Date.parse('2026-09-20T23:59:59+01:00'));

  // Then users are still allowed to continue without enrollment
  assert.equal(isRequired, false);
});

test('MFA becomes mandatory after 20 September in Lisbon', () => {
  // Given the first instant after the announced adaptation period
  const { isMfaEnforcementActive } = loadRollout();

  // When the rollout state is evaluated
  const isRequired = isMfaEnforcementActive(Date.parse('2026-09-21T00:00:00+01:00'));

  // Then enrollment is mandatory
  assert.equal(isRequired, true);
});

test('reminder dismissal lasts only for the current Lisbon calendar day', () => {
  // Given two instants on opposite sides of midnight in Lisbon
  const { getMfaReminderDay } = loadRollout();

  // When daily reminder keys are generated
  const beforeMidnight = getMfaReminderDay(new Date('2026-09-20T22:59:59Z'));
  const afterMidnight = getMfaReminderDay(new Date('2026-09-20T23:00:00Z'));

  // Then the reminder becomes eligible again on the new local day
  assert.equal(beforeMidnight, '2026-09-20');
  assert.equal(afterMidnight, '2026-09-21');
});

test('unenrolled users see the reminder once per Lisbon day during adaptation', () => {
  // Given an unenrolled user who has not dismissed today's reminder
  const { shouldShowMfaReminder } = loadRollout();
  const input = {
    mfaStatus: 'none',
    today: '2026-09-11',
    dismissedDay: '2026-09-10',
    enforcementActive: false,
    announcementOpen: false,
  };

  // When reminder eligibility is evaluated
  const shouldShow = shouldShowMfaReminder(input);

  // Then the adoption notice is shown
  assert.equal(shouldShow, true);
});

test('the reminder stays hidden after dismissal and after enforcement', () => {
  // Given the reminder was dismissed today or the mandatory gate is active
  const { shouldShowMfaReminder } = loadRollout();
  const base = {
    mfaStatus: 'none',
    today: '2026-09-11',
    dismissedDay: '2026-09-11',
    enforcementActive: false,
    announcementOpen: false,
  };

  // When both non-eligible states are evaluated
  const dismissed = shouldShowMfaReminder(base);
  const mandatory = shouldShowMfaReminder({ ...base, dismissedDay: null, enforcementActive: true });

  // Then neither state opens the optional reminder
  assert.equal(dismissed, false);
  assert.equal(mandatory, false);
});
