#!/usr/bin/env node
/**
 * verify-certificate.mjs — AIO Trust Certification 오프라인 검증기
 * Offline verifier for AIO Trust Certification certificates.
 *
 * No npm dependencies. Node 18+ (node:crypto, global fetch) only.
 *
 * WHAT IT PROVES
 *   A verified signature proves that AIO issued this exact record — the model name, the model
 *   version, the operator, the standards pack and its version, the score, the issue and expiry
 *   dates, and the status the pack was in when the certificate was issued (basisStatus).
 *   Nothing more. It is not a statement that the model is safe, and it is not a legal
 *   conformity assessment. Expiry and revocation are checked separately, below.
 *
 * HOW IT WORKS
 *   1. Fetch the certificate:  GET https://aioq.org/api/certifications/{certId}
 *   2. Take verification.canonicalPayload VERBATIM as the signed message (UTF-8 bytes).
 *      Do not re-serialize it — it is already canonical (signed fields only, keys sorted,
 *      no whitespace). Re-serializing is the single most common way to get a false negative.
 *   3. Fetch the public keys: GET https://aioq.org/.well-known/aio-cert-key.json
 *      and select the key whose `kid` equals the certificate's signatureKeyId.
 *   4. Ed25519-verify the base64url signature against that key.
 *   5. Independently re-derive the canonical payload from the certificate's own fields and
 *      check it matches what the server said. This catches a server that hands you a payload
 *      that does not correspond to the fields it displays.
 *
 * USAGE
 *   node verify-certificate.mjs AIO-C0-XXXXXXXX
 *   node verify-certificate.mjs AIO-C0-XXXXXXXX --json
 *   node verify-certificate.mjs AIO-C0-XXXXXXXX --key ./aio-cert-key.json   # pinned local key
 *   node verify-certificate.mjs --file ./certificate.json                   # saved response
 *
 * EXIT CODES
 *   0  signature verified AND the certificate is currently valid
 *   1  signature verified but the certificate is expired or revoked
 *   2  signature missing, mismatched, or the payload does not match the fields
 *   3  usage / network / not-found error
 *
 * License: CC BY 4.0 — AIO — AI Integrity Organization, https://aioq.org
 */

import { readFile } from 'node:fs/promises';
import { createPublicKey, verify as edVerify } from 'node:crypto';

const API_BASE = 'https://aioq.org/api/certifications';
const KEY_URL = 'https://aioq.org/.well-known/aio-cert-key.json';

/** Signed fields, in the exact set the issuer signs. Order is decided by canonicalization. */
const SIGNED_FIELDS = [
  'basisStatus',
  'certId',
  'expiresAt',
  'issuedAt',
  'methodologyVersion',
  'modelName',
  'modelVersion',
  'operator',
  'packId',
  'packVersion',
  'score',
  'status',
  'tier',
];

/* ── canonicalization ─────────────────────────────────────────────────── */

/** Whitespace-free JSON with object keys sorted by code point. Array order is preserved. */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/** Rebuild the signed message from the certificate's own fields. */
function canonicalPayloadFrom(cert) {
  const payload = {};
  for (const field of SIGNED_FIELDS) {
    if (cert[field] !== undefined) payload[field] = cert[field];
  }
  return canonicalJson(payload);
}

/* ── helpers ──────────────────────────────────────────────────────────── */

function fromBase64url(value) {
  return Buffer.from(String(value).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Build a Node KeyObject from a published JWK entry (OKP / Ed25519), PEM if present. */
function publicKeyFromJwk(entry) {
  if (typeof entry.pem === 'string' && entry.pem.includes('BEGIN')) {
    return createPublicKey({ key: entry.pem, format: 'pem' });
  }
  return createPublicKey({
    key: { kty: 'OKP', crv: 'Ed25519', x: entry.x },
    format: 'jwk',
  });
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return res.json();
}

function fail(code, message) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

/* ── main ─────────────────────────────────────────────────────────────── */

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  const keyPathIndex = argv.indexOf('--key');
  const filePathIndex = argv.indexOf('--file');
  const keyPath = keyPathIndex >= 0 ? argv[keyPathIndex + 1] : null;
  const filePath = filePathIndex >= 0 ? argv[filePathIndex + 1] : null;
  const certId = argv.find((a) => /^AIO-C[0-2]-[0-9A-HJKMNP-TV-Z]{8}$/.test(a));

  if (!certId && !filePath) {
    fail(
      3,
      'usage: node verify-certificate.mjs AIO-C0-XXXXXXXX [--json] [--key <file>]\n' +
        '       node verify-certificate.mjs --file <saved-response.json> [--json] [--key <file>]',
    );
  }

  // 1. the certificate response
  let body;
  try {
    body = filePath
      ? JSON.parse(await readFile(filePath, 'utf8'))
      : await getJson(`${API_BASE}/${certId}`);
  } catch (e) {
    fail(3, `could not read the certificate: ${e.message}`);
  }

  const cert = body.certificate ?? body;
  const serverSaid = body.verification ?? {};
  if (!cert || typeof cert.certId !== 'string') {
    fail(3, 'the response does not contain a certificate');
  }

  // 2. the signed message — rebuilt locally, then cross-checked against the server's copy
  const localPayload = canonicalPayloadFrom(cert);
  const payloadMatches =
    typeof serverSaid.canonicalPayload !== 'string' ||
    serverSaid.canonicalPayload === localPayload;

  if (!cert.signature) {
    const out = {
      certId: cert.certId,
      signatureValid: null,
      note: 'This certificate carries no signature and cannot be verified by a third party.',
    };
    process.stdout.write(asJson ? `${JSON.stringify(out, null, 2)}\n` : `${out.note}\n`);
    process.exit(2);
  }

  // 3. the public key
  let keyDoc;
  try {
    keyDoc = keyPath ? JSON.parse(await readFile(keyPath, 'utf8')) : await getJson(KEY_URL);
  } catch (e) {
    fail(3, `could not read the public key document: ${e.message}`);
  }

  const keys = Array.isArray(keyDoc.keys) ? keyDoc.keys : [keyDoc];
  const entry = cert.signatureKeyId
    ? keys.find((k) => k.kid === cert.signatureKeyId)
    : keys[0];
  if (!entry) {
    fail(
      2,
      `no published key matches signatureKeyId '${cert.signatureKeyId}'. ` +
        'Either the key was rotated without publishing, or this certificate did not come from AIO.',
    );
  }

  // 4. Ed25519 verification against the canonical payload, byte for byte
  let signatureValid = false;
  try {
    signatureValid = edVerify(
      null,
      Buffer.from(localPayload, 'utf8'),
      publicKeyFromJwk(entry),
      fromBase64url(cert.signature),
    );
  } catch (e) {
    fail(2, `verification could not be performed: ${e.message}`);
  }

  // 5. expiry / revocation — independent of the signature
  const now = new Date();
  const expired = new Date(cert.expiresAt).getTime() < now.getTime();
  const revoked = cert.status === 'revoked';
  const effectiveStatus = !signatureValid
    ? 'invalid-signature'
    : revoked
      ? 'revoked'
      : expired
        ? 'expired'
        : 'valid';

  const result = {
    certId: cert.certId,
    signatureValid,
    payloadMatchesServer: payloadMatches,
    keyId: entry.kid,
    algorithm: 'Ed25519',
    effectiveStatus,
    model: `${cert.modelName} ${cert.modelVersion}`,
    operator: cert.operator?.name ?? null,
    basis: `${cert.packId}@${cert.packVersion}`,
    basisStatus: cert.basisStatus ?? 'unknown',
    score: cert.score,
    issuedAt: cert.issuedAt,
    expiresAt: cert.expiresAt,
    checkedAt: now.toISOString(),
  };

  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    const mark = signatureValid ? 'OK  ' : 'FAIL';
    const lines = [
      `${mark} signature   ${signatureValid ? 'verified' : 'DOES NOT MATCH — treat as invalid'} (Ed25519, key ${entry.kid})`,
      `     status      ${effectiveStatus}`,
      `     model       ${result.model}`,
      `     operator    ${result.operator ?? '—'}`,
      `     basis       ${result.basis} (pack status at issue: ${result.basisStatus})`,
      `     score       ${typeof cert.score === 'number' ? cert.score.toFixed(3) : cert.score}`,
      `     valid until ${cert.expiresAt}`,
    ];
    if (!payloadMatches) {
      lines.push(
        '     WARNING     the server\'s canonicalPayload differs from the one rebuilt from the certificate fields.',
      );
    }
    if (result.basisStatus !== 'active') {
      lines.push(
        '     NOTE        the standards pack was not yet ratified when this certificate was issued.',
      );
    }
    lines.push(
      '',
      '     A verified signature attests only that AIO issued this record. AIO certifies conformance',
      "     to AIO's own formalization of a reference norm — not an endorsement by the body that issued",
      '     that norm, not a legal conformity assessment, and no guarantee of safety in real use.',
    );
    process.stdout.write(`${lines.join('\n')}\n`);
  }

  if (!signatureValid || !payloadMatches) process.exit(2);
  process.exit(effectiveStatus === 'valid' ? 0 : 1);
}

main().catch((e) => fail(3, `unexpected error: ${e.stack ?? e.message}`));
