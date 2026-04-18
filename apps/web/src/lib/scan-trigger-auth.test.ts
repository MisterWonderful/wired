import test from "node:test";
import assert from "node:assert/strict";
import {
  isScanTriggerRequestAuthorized,
  resolveScanTriggerToken,
  type ScanTriggerAuthEnv,
} from "./scan-trigger-auth";

test("resolveScanTriggerToken returns null when the token is unset or blank", () => {
  assert.equal(resolveScanTriggerToken({ SCAN_TRIGGER_TOKEN: "" } satisfies ScanTriggerAuthEnv), null);
  assert.equal(resolveScanTriggerToken({ SCAN_TRIGGER_TOKEN: "   " } satisfies ScanTriggerAuthEnv), null);
});

test("scan trigger auth stays open when no token is configured", () => {
  const headers = new Headers({
    authorization: "Bearer anything",
    "x-wired-scan-token": "anything",
  });

  assert.equal(isScanTriggerRequestAuthorized(headers, {} satisfies ScanTriggerAuthEnv), true);
});

test("scan trigger auth accepts either supported header when token is configured", () => {
  const env = { SCAN_TRIGGER_TOKEN: "scan-secret" } satisfies ScanTriggerAuthEnv;

  const bearerHeaders = new Headers({
    authorization: "Bearer scan-secret",
  });

  const wiredHeaders = new Headers({
    "x-wired-scan-token": "scan-secret",
  });

  assert.equal(isScanTriggerRequestAuthorized(bearerHeaders, env), true);
  assert.equal(isScanTriggerRequestAuthorized(wiredHeaders, env), true);
});

test("scan trigger auth rejects missing or mismatched credentials when token is configured", () => {
  const env = { SCAN_TRIGGER_TOKEN: "scan-secret" } satisfies ScanTriggerAuthEnv;

  const missingHeaders = new Headers();
  const wrongHeaders = new Headers({
    authorization: "Bearer wrong-secret",
    "x-wired-scan-token": "wrong-secret",
  });

  assert.equal(isScanTriggerRequestAuthorized(missingHeaders, env), false);
  assert.equal(isScanTriggerRequestAuthorized(wrongHeaders, env), false);
});
