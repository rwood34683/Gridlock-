/* Grind X billing adapter — reference implementation (RevenueCat).
 *
 * Fills in window.gridlockBilling with buy() and restore(), returning the
 * {plan, exp, source} shape window.gridlockEntitle expects. In-app purchase is
 * a NATIVE capability (StoreKit / Play Billing), so this is a thin wrapper over
 * the RevenueCat Capacitor plugin — which validates receipts on its servers, so
 * the entitlement the app trusts is verified, not a client claim.
 *
 * IT IS NOT PART OF THE APP BUNDLE. The default, web and offline builds carry no
 * store, so no wall — billingLive() is false unless this adapter is present. The
 * native store shell wires it up:
 *
 *   import { Purchases } from "@revenuecat/purchases-capacitor";
 *   await Purchases.configure({ apiKey: PUBLIC_SDK_KEY });   // per platform
 *   window.gridlockPurchases = Purchases;
 *   window.GRIDLOCK_BILLING = {
 *     entitlements: ["team", "event"],        // RevenueCat entitlement ids that grant Team
 *     products: {                             // our ids -> the store product ids
 *       team_season: "grindx_team_season",
 *       team_month:  "grindx_team_month",
 *       event_pass:  "grindx_event_pass",
 *     },
 *   };
 *   // then load native/gridlock-billing.js
 *
 * Only the RevenueCat PUBLIC SDK key is used, and it lives in native config, not
 * here. No secret ever appears in this file. docs/PAYWALL.md is the switch-on.
 */
(function () {
  "use strict";

  var DEFAULTS = {
    entitlements: ["team", "event"],
    products: { team_season: "grindx_team_season", team_month: "grindx_team_month", event_pass: "grindx_event_pass" },
  };
  var CFG = merge(DEFAULTS, window.GRIDLOCK_BILLING || {});

  function merge(a, b) {
    return { entitlements: (b.entitlements || a.entitlements), products: Object.assign({}, a.products, b.products || {}) };
  }
  function purchases() { return window.gridlockPurchases || null; }

  // Turn a RevenueCat customerInfo into what the app keeps. Team access if any
  // configured entitlement is active; exp is the latest expiry, or 0 for a
  // lifetime/non-expiring grant (planOf treats exp 0 as "never lapses").
  function fromInfo(info) {
    var active = (info && info.entitlements && info.entitlements.active) || {};
    var has = false, exp = 0, lifetime = false;
    CFG.entitlements.forEach(function (id) {
      var e = active[id];
      if (e) {
        has = true;
        if (e.expirationDate) exp = Math.max(exp, Date.parse(e.expirationDate) || 0);
        else lifetime = true;
      }
    });
    if (!has) return { plan: "free", source: "revenuecat" };
    return { plan: "team", exp: lifetime ? 0 : exp, source: "revenuecat" };
  }

  async function findPackage(P, productId) {
    try {
      var off = await P.getOfferings();
      var list = [];
      if (off && off.current) list.push(off.current);
      if (off && off.all) Object.keys(off.all).forEach(function (k) { list.push(off.all[k]); });
      for (var i = 0; i < list.length; i++) {
        var pkgs = (list[i] && list[i].availablePackages) || [];
        for (var j = 0; j < pkgs.length; j++) {
          if (pkgs[j].product && pkgs[j].product.identifier === productId) return pkgs[j];
        }
      }
    } catch (e) {}
    return null;
  }

  function cancelled(err) {
    return !!(err && (err.userCancelled || err.code === "1" || err.code === "PurchaseCancelledError"
      || /cancel/i.test(String(err.message || ""))));
  }

  var api = {
    // buy(id): id is one of team_season / team_month / event_pass. Returns the
    // entitle object on success, null if the coach cancelled or nothing matched,
    // and throws only on a real store error (buyPlan turns that into a message).
    async buy(id) {
      var P = purchases(); if (!P) return null;
      var productId = CFG.products[id]; if (!productId) return null;
      try {
        var pkg = await findPackage(P, productId), res;
        if (pkg) {
          res = await P.purchasePackage({ aPackage: pkg });
        } else {
          var got = await P.getProducts({ productIdentifiers: [productId] });
          var product = (got && got.products || [])[0];
          if (!product) return null;
          res = await P.purchaseStoreProduct({ product: product });
        }
        return fromInfo(res && res.customerInfo);
      } catch (err) {
        if (cancelled(err)) return null;
        throw err;
      }
    },
    async restore() {
      var P = purchases(); if (!P) return { plan: "free" };
      var res = await P.restorePurchases();
      return fromInfo(res && res.customerInfo);
    },
    // The shell can call this after the app boots to unlock a returning paid
    // coach without a Restore tap. Best-effort and silent.
    async refresh() {
      var P = purchases(); if (!P || !P.getCustomerInfo || !window.gridlockEntitle) return;
      try { var res = await P.getCustomerInfo(); window.gridlockEntitle(fromInfo(res && res.customerInfo)); } catch (e) {}
    },
  };

  window.gridlockBillingConfigure = function (purchasesPlugin, config) {
    if (purchasesPlugin) window.gridlockPurchases = purchasesPlugin;
    if (config) CFG = merge(DEFAULTS, config);
    install();
  };
  function install() { if (purchases()) window.gridlockBilling = api; }
  install();

  if (typeof module !== "undefined" && module.exports) module.exports = { api: api, fromInfo: fromInfo };
})();
