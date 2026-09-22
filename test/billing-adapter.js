#!/usr/bin/env node
"use strict";
/* Grind X billing adapter (native/gridlock-billing.js) against a mocked
 * RevenueCat plugin. No store: a stubbed Purchases object returns canned
 * offerings and customer info, so the adapter's own mapping — products to
 * packages, entitlements to the {plan, exp, source} the app keeps — is checked. */
const path = require("node:path");
const { chromium } = require("playwright-core");
const { launchOptions } = require("../scripts/browser.js");

let passed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log("  PASS  " + name); }
  else { console.log("  FAIL  " + name + (extra ? "  — " + extra : "")); process.exitCode = 1; }
}

const MOCK = `
window.__purchased = null; window.__cancel = false; window.__restoreActive = {};
window.gridlockPurchases = {
  async getOfferings(){ return { current: { availablePackages: [
    { identifier:"$rc_annual",  product:{ identifier:"grindx_team_season" } },
    { identifier:"$rc_monthly", product:{ identifier:"grindx_team_month" } },
  ] }, all: { default: { availablePackages: [] } } }; },
  async purchasePackage({ aPackage }){
    if (window.__cancel) { const e = new Error("cancelled"); e.userCancelled = true; throw e; }
    window.__purchased = aPackage.product.identifier;
    return { customerInfo: { entitlements: { active: { team: { expirationDate: "2027-01-01T00:00:00Z" } } } } };
  },
  async getProducts({ productIdentifiers }){ return { products: productIdentifiers.map(id => ({ identifier: id })) }; },
  async purchaseStoreProduct({ product }){
    window.__purchased = product.identifier;
    return { customerInfo: { entitlements: { active: { event: { expirationDate: "2026-10-01T00:00:00Z" } } } } };
  },
  async restorePurchases(){ return { customerInfo: { entitlements: { active: window.__restoreActive } } }; },
  async getCustomerInfo(){ return { customerInfo: { entitlements: { active: window.__restoreActive } } }; },
};`;

(async () => {
  const browser = await chromium.launch(launchOptions());
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(process.env.APP_URL || "http://localhost:5173/");
    await page.evaluate(MOCK);
    await page.addScriptTag({ path: path.resolve(__dirname, "../native/gridlock-billing.js") });

    check("it installs when the store plugin is present", await page.evaluate(() =>
      !!(window.gridlockBilling && window.gridlockBilling.buy && window.gridlockBilling.restore)));

    check("buying the season resolves the package and keeps Team with an expiry", await page.evaluate(async () => {
      const r = await window.gridlockBilling.buy("team_season");
      return window.__purchased === "grindx_team_season" && r.plan === "team"
        && r.source === "revenuecat" && r.exp === Date.parse("2027-01-01T00:00:00Z");
    }));
    check("the event pass (no offering package) buys the product directly and grants Team", await page.evaluate(async () => {
      const r = await window.gridlockBilling.buy("event_pass");
      return window.__purchased === "grindx_event_pass" && r.plan === "team" && r.exp === Date.parse("2026-10-01T00:00:00Z");
    }));
    check("a cancelled purchase is null, not an error", await page.evaluate(async () => {
      window.__cancel = true;
      const r = await window.gridlockBilling.buy("team_season");
      window.__cancel = false;
      return r === null;
    }));
    check("restore with nothing owned is a free plan", await page.evaluate(async () => {
      window.__restoreActive = {};
      const r = await window.gridlockBilling.restore();
      return r.plan === "free";
    }));
    check("restore with an active entitlement returns Team", await page.evaluate(async () => {
      window.__restoreActive = { team: { expirationDate: "2027-06-01T00:00:00Z" } };
      const r = await window.gridlockBilling.restore();
      return r.plan === "team" && r.exp === Date.parse("2027-06-01T00:00:00Z");
    }));
    check("a lifetime entitlement (no expiry) never lapses", await page.evaluate(async () => {
      window.__restoreActive = { team: { expirationDate: null } };
      const r = await window.gridlockBilling.restore();
      return r.plan === "team" && r.exp === 0;
    }));
    check("refresh entitles the app from the current customer info", await page.evaluate(async () => {
      window.__restoreActive = { team: { expirationDate: "2027-06-01T00:00:00Z" } };
      window.__entitled = null;
      window.gridlockEntitle = e => { window.__entitled = e; };
      await window.gridlockBilling.refresh();
      return window.__entitled && window.__entitled.plan === "team";
    }));
    check("the adapter carries no secret key", await page.evaluate(() =>
      !/service|secret|sk_|rcb_/i.test(String(window.gridlockBilling.buy) + String(window.gridlockBilling.restore))));

    check("no page errors during the run", errors.length === 0, errors.join(" | "));
    console.log(`\nBilling adapter: ${passed} checks passed.`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
