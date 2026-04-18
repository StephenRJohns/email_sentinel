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
 * Clamp a requested poll interval to the tier's minimum.
 * Returns { value, clamped } where clamped=true means the input was raised.
 */
function enforcePollFloor(requestedMinutes) {
  const min = getTierLimits().minPollMinutes;
  const requested = Math.max(1, parseInt(requestedMinutes, 10) || min);
  if (requested < min) {
    return { value: min, clamped: true };
  }
  return { value: requested, clamped: false };
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
