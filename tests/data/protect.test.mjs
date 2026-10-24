import test from 'node:test'; import assert from 'node:assert/strict';
import { needsBackup, lastBackupText, protectLabel, lastBackupAt, DAY } from '../../js/cc/protect.js';
const now = Date.UTC(2026, 9, 24);
test('backup nudge: no backup, more than 3 games', () => {
  assert.equal(needsBackup({ games: 3, now }), false);
  assert.equal(needsBackup({ games: 4, now }), true);
});
test('backup nudge: last backup older than 14 days', () => {
  assert.equal(needsBackup({ games: 1, lastBackupAt: now - 14 * DAY, now }), false);
  assert.equal(needsBackup({ games: 1, lastBackupAt: now - 15 * DAY, now }), true);
  assert.equal(needsBackup({ games: 9, lastBackupAt: now - DAY, now }), false);
});
test('backup nudge: snooze holds it back', () => {
  assert.equal(needsBackup({ games: 9, snoozeUntil: now + DAY, now }), false);
  assert.equal(needsBackup({ games: 9, snoozeUntil: now - 1, now }), true);
});
test('plain words for last backup', () => {
  assert.equal(lastBackupText(0, now), 'No backup file yet.');
  assert.equal(lastBackupText(now - 1000, now), 'Last backup file: today.');
  assert.equal(lastBackupText(now - DAY, now), 'Last backup file: yesterday.');
  assert.equal(lastBackupText(now - 5 * DAY, now), 'Last backup file: 5 days ago.');
});
test('protect label', () => {
  assert.equal(protectLabel({}), 'Not protected');
  assert.equal(protectLabel({ persisted: true }), 'Protected');
  assert.equal(protectLabel({ standalone: true }), 'Protected');
});
test('copied code counts as a backup only once the server has the data', () => {
  assert.equal(lastBackupAt({ codeCopiedAt: 5 }), 0);
  assert.equal(lastBackupAt({ codeCopiedAt: 5, sync: { lastPushAt: 4 } }), 5);
  assert.equal(lastBackupAt({ backupDownloadedAt: 9, codeCopiedAt: 5, sync: { lastPushAt: 4 } }), 9);
});
