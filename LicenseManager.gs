// Copyright (c) 2026 JJJJJ Enterprises, LLC. All rights reserved.
// Proprietary — see LICENSE for terms.

/**
 * LicenseManager.gs — Tier limits and feature gating for the Free/Pro plans.
 *
 * Tier is persisted in settings.license.tier ('free' | 'pro'). For now, Pro is
 * assigned manually via setTier_('pro'); in a later pass this will be wired to
 * the Google Workspace Marketplace subscription API.
 */

const TIERS = {
  free: {
    maxRules: 3,
    minPollMinutes: 15,
    allowChat: false,
    allowMcp: false,
    allowAiSuggest: false,
    logRetentionDays: 30
  },
  pro: {
    maxRules: Infinity,
    minPollMinutes: 1,
    allowChat: true,
    allowMcp: true,
    allowAiSuggest: true,
    logRetentionDays: Infinity
  }
};

const UPGRADE_URL = 'https://workspace.google.com/marketplace'; // updated at launch

// Founding-member lifetime offer — $79 one-time, first 500 buyers only.
// FOUNDING_MEMBERS_SOLD is bumped manually (or from the Marketplace subscription
// API once wired up). When FOUNDING_MEMBERS_SOLD >= FOUNDING_MEMBERS_LIMIT, the
// UI hides the offer and the Marketplace SKU should be paused.
const FOUNDING_MEMBERS_LIMIT = 500;
const FOUNDING_MEMBERS_SOLD  = 0;

function foundingMembersRemaining() {
  return Math.max(0, FOUNDING_MEMBERS_LIMIT - FOUNDING_MEMBERS_SOLD);
}

function isFoundingMemberOfferActive() {
  return foundingMembersRemaining() > 0;
}

function getTier() {
  const s = loadSettings();
  const tier = (s.license && s.license.tier) || 'free';
  return TIERS[tier] ? tier : 'free';
}

function getTierLimits() {
  return TIERS[getTier()];
}

function isPro() {
  return getTier() === 'pro';
}

function setTier_(tier) {
  if (tier !== 'free' && tier !== 'pro') {
    throw new Error('Invalid tier: ' + tier);
  }
  const s = loadSettings();
  s.license = Object.assign({}, s.license || {}, { tier: tier });
  saveSettings(s);
  activityLog('License tier changed to: ' + tier);
  return tier;
}

// Apps Script time-driven triggers only accept these everyMinutes() values.
const ALLOWED_POLL_MINUTES = [1, 5, 10, 15, 30];

/**
 * Normalize a requested poll interval to a valid Apps Script trigger value
 * that also respects the current tier's minimum. Snaps up to the nearest
 * allowed value (1, 5, 10, 15, or 30 min).
 *
 * Returns { value, clamped, raisedToTierMin, cappedAtMax, snappedUp, invalid, requested }.
 */
function enforcePollFloor(requestedMinutes) {
  const tierMin = getTierLimits().minPollMinutes;
  const parsed = parseInt(requestedMinutes, 10);
  const invalid = isNaN(parsed) || parsed < 1;
  const requested = invalid ? tierMin : parsed;
  const target = Math.max(requested, tierMin);
  var value = ALLOWED_POLL_MINUTES.find(function(m) { return m >= target; });
  if (value === undefined) value = ALLOWED_POLL_MINUTES[ALLOWED_POLL_MINUTES.length - 1]; // cap at 30
  return {
    value: value,
    clamped: value !== requested,
    raisedToTierMin: !invalid && parsed < tierMin,
    cappedAtMax: !invalid && parsed > 30,
    snappedUp: !invalid && parsed >= tierMin && parsed <= 30 && value !== parsed,
    invalid: invalid,
    requested: requested
  };
}

/**
 * True if the current tier may create one more rule.
 */
function canAddRule() {
  const rules = loadRules();
  return rules.length < getTierLimits().maxRules;
}

/**
 * Return an upgrade-required message for a given gated feature.
 */
function upgradeRequiredMessage(feature) {
  return 'Upgrade to Pro to use ' + feature + '.';
}
