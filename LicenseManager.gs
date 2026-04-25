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

/**
 * Validate and normalize a requested poll interval against the current tier:
 *   - Free: rounded up to the next multiple of 15.
 *   - Pro: 1, or rounded up to the next multiple of 5.
 * Both grids are chosen so an Apps Script `everyMinutes()` value always
 * divides pollMinutes evenly — no imprecise cadence, no skip-fire quota
 * burn beyond the trigger interval itself. The 1-minute Pro option fires
 * 1440 times/day and gets a quota warning since heavy rule sets can hit
 * the daily Apps Script execution cap.
 *
 * Returns { value, clamped, raisedToTierMin, snappedToGrid, quotaWarning,
 *           invalid, requested }.
 */
function enforcePollFloor(requestedMinutes) {
  const tier = getTier();
  const tierMin = getTierLimits().minPollMinutes;
  const parsed = parseInt(requestedMinutes, 10);
  const invalid = isNaN(parsed) || parsed < 1;
  const requested = invalid ? tierMin : parsed;
  var value = Math.max(requested, tierMin);
  var snappedToGrid = false;
  if (tier === 'free') {
    if (value % 15 !== 0) {
      value = Math.ceil(value / 15) * 15;
      snappedToGrid = true;
    }
  } else {
    // Pro: allow 1, otherwise require multiple of 5.
    if (value !== 1 && value % 5 !== 0) {
      value = Math.ceil(value / 5) * 5;
      snappedToGrid = true;
    }
  }
  return {
    value: value,
    clamped: value !== requested,
    raisedToTierMin: !invalid && parsed < tierMin,
    snappedToGrid: snappedToGrid,
    quotaWarning: tier === 'pro' && value === 1,
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
