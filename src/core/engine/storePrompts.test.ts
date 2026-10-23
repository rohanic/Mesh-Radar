import { numberLine } from './numbers';
import { REVIEW_GAP_DAYS, REVIEW_MAX_ASKS, dayKey, shouldAskForReview, type ReviewStats } from './review';
import { RESTART_SNOOZE_HOURS, UPDATE_SNOOZE_DAYS, isUrgent, updateAction, type UpdateContext, type UpdateInfo } from './updates';

const now = 1_760_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const info = (patch: Partial<UpdateInfo> = {}): UpdateInfo => ({
  availability: 'available',
  versionCode: 12,
  stalenessDays: 0,
  priority: 0,
  flexibleAllowed: true,
  installStatus: 'unknown',
  ...patch,
});

const ctx = (patch: Partial<UpdateContext> = {}): UpdateContext => ({
  nowMs: now,
  dismissedVersion: 0,
  dismissedAtMs: 0,
  busy: false,
  meshRunning: false,
  ...patch,
});

describe('in-app updates (DEC-043)', () => {
  it('offers a waiting update and marks old or high-priority ones urgent', () => {
    expect(updateAction(info(), ctx())).toEqual({ kind: 'offer', versionCode: 12, urgent: false });
    expect(updateAction(info({ priority: 4 }), ctx())).toEqual({ kind: 'offer', versionCode: 12, urgent: true });
    expect(isUrgent({ priority: 0, stalenessDays: 14 })).toBe(true);
    expect(isUrgent({ priority: 3, stalenessDays: null })).toBe(false);
  });

  it('never interrupts a safety moment, even with a finished download', () => {
    expect(updateAction(info(), ctx({ busy: true }))).toEqual({ kind: 'none' });
    expect(updateAction(info({ installStatus: 'downloaded' }), ctx({ busy: true }))).toEqual({ kind: 'none' });
  });

  it('asks for the restart once downloaded and says when it stops the mesh', () => {
    expect(updateAction(info({ installStatus: 'downloaded' }), ctx())).toEqual({ kind: 'restart', stopsMesh: false });
    expect(updateAction(info({ installStatus: 'downloaded' }), ctx({ meshRunning: true }))).toEqual({ kind: 'restart', stopsMesh: true });
    expect(updateAction(info({ installStatus: 'downloading' }), ctx())).toEqual({ kind: 'downloading' });
    expect(updateAction(info({ installStatus: 'installing' }), ctx())).toEqual({ kind: 'none' });
  });

  it('lets the person put off the restart for a few hours', () => {
    const downloaded = info({ installStatus: 'downloaded' });
    expect(updateAction(downloaded, ctx({ dismissedVersion: 12, dismissedAtMs: now - 60 * 60 * 1000 }))).toEqual({ kind: 'none' });
    expect(updateAction(downloaded, ctx({ dismissedVersion: 12, dismissedAtMs: now - RESTART_SNOOZE_HOURS * 60 * 60 * 1000 }))).toMatchObject({ kind: 'restart' });
  });

  it('shows nothing offline, without an update or when Play forbids the flexible flow', () => {
    expect(updateAction(info({ availability: 'unknown' }), ctx())).toEqual({ kind: 'none' });
    expect(updateAction(info({ availability: 'none' }), ctx())).toEqual({ kind: 'none' });
    expect(updateAction(info({ flexibleAllowed: false }), ctx())).toEqual({ kind: 'none' });
  });

  it('respects Later for this version only, and urgent ones come back after a day', () => {
    const later = ctx({ dismissedVersion: 12, dismissedAtMs: now - DAY });
    expect(updateAction(info(), later)).toEqual({ kind: 'none' });
    expect(updateAction(info(), ctx({ dismissedVersion: 12, dismissedAtMs: now - UPDATE_SNOOZE_DAYS * DAY }))).toMatchObject({ kind: 'offer' });
    expect(updateAction(info({ versionCode: 13 }), later)).toMatchObject({ kind: 'offer', versionCode: 13 });
    expect(updateAction(info({ priority: 5 }), later)).toMatchObject({ kind: 'offer', urgent: true });
    expect(updateAction(info({ priority: 5 }), ctx({ dismissedVersion: 12, dismissedAtMs: now - DAY / 2 }))).toEqual({ kind: 'none' });
  });
});

const stats = (patch: Partial<ReviewStats> = {}): ReviewStats => ({
  firstOpenMs: now - 10 * DAY,
  activeDays: 5,
  regroups: 1,
  drillsCompleted: 0,
  lastSosMs: 0,
  asks: 0,
  lastAskMs: 0,
  ...patch,
});

const calm = { nowMs: now, busy: false, elderMode: false };

describe('in-app review (DEC-044)', () => {
  it('asks after a successful regroup by someone who has used the app for a few days', () => {
    expect(shouldAskForReview(stats(), 'regroup', calm)).toBe(true);
    expect(shouldAskForReview(stats({ regroups: 0 }), 'regroup', calm)).toBe(false);
    expect(shouldAskForReview(stats({ drillsCompleted: 1 }), 'drillDone', calm)).toBe(true);
    expect(shouldAskForReview(stats(), 'drillDone', calm)).toBe(false);
  });

  it('waits for new installs and light users', () => {
    expect(shouldAskForReview(stats({ firstOpenMs: now - 2 * DAY }), 'regroup', calm)).toBe(false);
    expect(shouldAskForReview(stats({ firstOpenMs: 0 }), 'regroup', calm)).toBe(false);
    expect(shouldAskForReview(stats({ activeDays: 2 }), 'regroup', calm)).toBe(false);
  });

  it('never asks near SOS, during a safety moment or in Elder mode', () => {
    expect(shouldAskForReview(stats({ lastSosMs: now - 6 * DAY }), 'regroup', calm)).toBe(false);
    expect(shouldAskForReview(stats({ lastSosMs: now - 8 * DAY }), 'regroup', calm)).toBe(true);
    expect(shouldAskForReview(stats(), 'regroup', { ...calm, busy: true })).toBe(false);
    expect(shouldAskForReview(stats(), 'regroup', { ...calm, elderMode: true })).toBe(false);
  });

  it('spaces asks out and stops after a few', () => {
    expect(shouldAskForReview(stats({ asks: 1, lastAskMs: now - 30 * DAY }), 'regroup', calm)).toBe(false);
    expect(shouldAskForReview(stats({ asks: 1, lastAskMs: now - REVIEW_GAP_DAYS * DAY }), 'regroup', calm)).toBe(true);
    expect(shouldAskForReview(stats({ asks: REVIEW_MAX_ASKS, lastAskMs: now - 400 * DAY }), 'regroup', calm)).toBe(false);
  });

  it('counts days in local time', () => {
    const lateEvening = Date.UTC(2026, 9, 23, 20, 0);
    // UTC+5 (offset -300): 01:00 the next local day.
    expect(dayKey(lateEvening, -300)).toBe(dayKey(lateEvening, 0) + 1);
    expect(dayKey(lateEvening + 60 * 60 * 1000, 0)).toBe(dayKey(lateEvening, 0));
  });
});

describe('emergency number lines (E5)', () => {
  it('drops the kind when the label already names it', () => {
    expect(numberLine('Police', 'Police')).toBe('Police');
    expect(numberLine('Police', 'Motorway Police (motorways)')).toBe('Motorway Police (motorways)');
    expect(numberLine('Fire', 'Fire brigade')).toBe('Fire brigade');
    expect(numberLine('Child helpline', 'Child protection helpline')).toBe('Child protection helpline');
  });

  it('keeps both when the label is a name', () => {
    expect(numberLine('Rescue', 'Basarnas')).toBe('Rescue, Basarnas');
    expect(numberLine('Ambulance', '')).toBe('Ambulance');
  });
});
