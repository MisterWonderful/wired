import { timingSafeEqual } from "node:crypto";
const BEARER_PREFIX = "bearer ";
const SCAN_TRIGGER_TOKEN_HEADER = "x-wired-scan-token";

export type ScanTriggerAuthEnv = Partial<Pick<NodeJS.ProcessEnv, "SCAN_TRIGGER_TOKEN">>;

export function resolveScanTriggerToken(env?: ScanTriggerAuthEnv): string | null {
  return normalizeToken((env ?? process.env as ScanTriggerAuthEnv).SCAN_TRIGGER_TOKEN);
}

export function isScanTriggerRequestAuthorized(
  headers: Headers,
  env?: ScanTriggerAuthEnv,
): boolean {
  const configuredToken = resolveScanTriggerToken(env);
  if (!configuredToken) {
    return true;
  }

  return extractPresentedScanTriggerTokens(headers).some((token) => tokensMatch(token, configuredToken));
}

export function extractPresentedScanTriggerTokens(headers: Headers): string[] {
  const tokens: string[] = [];

  const bearerToken = parseBearerToken(headers.get("authorization"));
  if (bearerToken) {
    tokens.push(bearerToken);
  }

  const wiredToken = normalizeToken(headers.get(SCAN_TRIGGER_TOKEN_HEADER));
  if (wiredToken) {
    tokens.push(wiredToken);
  }

  return tokens;
}

function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  if (!authorizationHeader.toLowerCase().startsWith(BEARER_PREFIX)) {
    return null;
  }

  return normalizeToken(authorizationHeader.slice(BEARER_PREFIX.length));
}

function normalizeToken(token: string | null | undefined): string | null {
  const normalized = token?.trim();
  return normalized ? normalized : null;
}

function tokensMatch(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}
