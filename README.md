# aio-standards

Machine-readable mirror of the open standards published by **AIO — AI Integrity Organization**,
an international standards body established as a Swiss association in Geneva (UID CHE-469.997.903).

Everything here is also served live from <https://aioq.org>. This repository exists so the same
files can be read, diffed, cited, and vendored without depending on an HTTP endpoint staying up.

**License: [CC BY 4.0](LICENSE).** Attribution string:
`AIO — AI Integrity Organization, https://aioq.org, CC BY 4.0`

---

## What AIO measures

AI integrity, in AIO's framing, has three distinct failure modes, and AIO works on the first:

1. **The compromise problem** — the deliberate or structural compromise of training data and
   judgment criteria in pursuit of particular outcomes, at the stage where a response is produced.
2. **The use problem** — misinterpretation or irresponsible application of a response after it
   enters society.
3. **The error problem** — the system failing to work as intended.

The AIO Framework encodes one judgment as one line:

```
C:MED/IXi | V:Bec<Sda | E:Exp<Gui | S:Usr<Pro
```

Context, then the **value (V)**, **evidence (E)**, and **source (S)** hierarchies behind that
judgment, where `<` reads "outranked by". No user content is carried — the line records *why*, not
*what*.

---

## Contents

| Path | What it is |
|---|---|
| [`vocabulary/aio-00011.json`](vocabulary/aio-00011.json) | The AIO 00011 common vocabulary: 39 V/E/S codes, the context axes, and the AIO 20002 record grammar with its JSON Schema. Snapshot of `GET https://aioq.org/api/framework/vocabulary`. |
| `standards-packs/*-v0.1.json` (×10) | Wave 1 + Wave 2 formalization drafts (**draft-unverified** — single-pass seed, dual verification pending): NIST AI RMF, the Korean AI Framework Act (current consolidation 법률 제21311호), the CoE Framework Convention (not yet in force — EU sole ratification), the China Generative AI Interim Measures, the EU GPAI Code of Practice, the OECD AI Principles (2024 consolidation), California TFAIA (SB 53), the China AI-content labeling Measures, the G7 Hiroshima Code of Conduct, and the UNESCO Recommendation on the Ethics of AI (license-constrained: short-quote footprint only). Each entry carries verbatim, machine-checked provenance quotes. |
| [`standards-packs/eu-ai-act-v0.2.json`](standards-packs/eu-ai-act-v0.2.json) | The AIO **formalization** of the EU AI Act: per-provision V/E/S mapping, each entry carrying a verbatim quote from the official text, a rationale, a retrieval date, and its own verification status. |
| [`standards-packs/schema.json`](standards-packs/schema.json) | JSON Schema for a standards pack. A new norm is a data file, not code. |
| [`standards-packs/FORMALIZATION_METHODOLOGY.md`](standards-packs/FORMALIZATION_METHODOLOGY.md) | How a legal text becomes a pack, and what the status ladder means. |
| [`item-banks/eu-ai-act.public.json`](item-banks/eu-ai-act.public.json) | The Tier 0 **public** item bank — 12 items, **including their expected answers**. See the note below; this is deliberate. |
| [`item-banks/agent-track-v0.public.json`](item-banks/agent-track-v0.public.json) | The agent-submitted benchmark track item bank v0.2 — 315 forced-choice dilemmas (105 per layer: L2 sources, L3 evidence, L4 values). There is no answer key by design: each item is a forced choice between two variables, and the measurement is the choice distribution itself. The `review` block records the six-round quality review that produced v0.2; one item carries an explicit `reviewNote`. |
| [`item-banks/eu-ai-act.gateb-commitment.json`](item-banks/eu-ai-act.gateb-commitment.json) | Commitment hashes for the **private** Tier 0 Gate B item pool (96 items): per-item sha256 plus an Ed25519-signed snapshot hash. The items themselves are private by design (seeded-random serving); this file lets anyone verify post hoc that served items existed before their test. Retired items are disclosed at `/content/bench-items/eu-ai-act.gateb-retired.json` on aioq.org as the pool rotates. |
| [`verify/verify-certificate.mjs`](verify/verify-certificate.mjs) | Standalone Ed25519 verifier for an issued certificate. No npm dependencies. |

### Why the item bank ships with its answer key

Tier 0 is self-assessment on a fully public item set. Publishing the expected hierarchies is not a
leak — it is the design. A Tier 0 score is a **floor**, not a gaming-resistant measurement: it
records that a model *could* answer by the criteria it declared. Hiding the key would buy a false
sense of rigour while making the measurement unreproducible by anyone but AIO. Gaming resistance is
what higher, proctored tiers with private item banks are for.

The live API serves the same bank with the answer key stripped, so that a submission flow cannot
trivially read it back: `GET https://aioq.org/api/eval/items?pack=eu-ai-act`.

### What "formalization" means, and what it does not

A standards pack is **AIO's own formalization** of an external reference norm — a reading of a legal
text expressed in the AIO vocabulary, so that it can be measured. It is not the norm, not an
official reading of it, and not produced with the involvement of the body that issued it.

Every pack carries a `status` on a fixed ladder:

```
draft-unverified → draft-verified → rfc → active
```

The EU AI Act pack is currently `draft-verified`: every mapping entry has a verbatim quote from the
official text and a recorded retrieval date, but the pack has not yet been through the public RFC
process. Certificates issued on a pack that is not `active` carry that fact — the field
`basisStatus` sits **inside the signed payload**, so it cannot be reconstructed after the fact.

---

## Verifying a certificate

Certificates issued by AIO are signed with Ed25519. The public key is published at
<https://aioq.org/.well-known/aio-cert-key.json>, so verification never requires trusting — or even
reaching — an AIO server beyond fetching the record itself.

```bash
node verify/verify-certificate.mjs AIO-C0-XXXXXXXX
node verify/verify-certificate.mjs AIO-C0-XXXXXXXX --json
node verify/verify-certificate.mjs --file ./saved-response.json --key ./pinned-key.json
```

Exit codes: `0` verified and currently valid · `1` verified but expired or revoked ·
`2` signature missing or mismatched · `3` usage or network error.

The one rule that matters: take `verification.canonicalPayload` from the API response **verbatim**
as the signed message. Do not re-serialize it. It is already canonical — signed fields only, keys
sorted by code point, no whitespace — and re-serializing it is the usual cause of a false negative.
The script also rebuilds that payload from the certificate's own fields and compares, which catches
a server that shows you one thing and signs another.

**A verified signature proves only that AIO issued that exact record.** It says nothing about
whether the model is safe to deploy.

---

## Live endpoints

No authentication, CORS open, JSON, all CC BY 4.0.

| Endpoint | |
|---|---|
| <https://aioq.org/api/openapi.json> | OpenAPI 3.1 description of everything below |
| `GET /api/framework/vocabulary` | the vocabulary in this repo, live · `?layer=V\|E\|S` · `?format=schema` |
| `GET /api/standards-packs` · `/{id}` | packs with their full per-provision mapping |
| `GET /api/eval/items?pack=eu-ai-act` | Tier 0 items, answer key stripped, plus the scoring methodology |
| `POST /api/eval/submit` | submit answers; deterministic scoring, signed certificate on a pass |
| `GET /api/certifications/registry` | every certificate issued |
| `GET /api/certifications/{certId}` | one certificate, with its signature check and offline instructions |
| `GET /api/certifications/{certId}/badge.svg` | badge, drawn live so it cannot outlive its own truth |
| `GET /api/benchmarks/agent-track/items` | the agent-track item bank in this repo, live · `?layer=L2\|L3\|L4` |
| `POST /api/benchmarks/agent-track/submit` | submit a run (requires an agent key with the `bench:submit` scope) |
| `GET /.well-known/aio-cert-key.json` | Ed25519 public keys |
| `GET /.well-known/mcp/server.json` | MCP server metadata |

**MCP server** — `https://aioq.org/mcp`, Streamable HTTP, protocol `2025-06-18`, stateless, no auth.

```json
{ "mcpServers": { "aio": { "type": "http", "url": "https://aioq.org/mcp" } } }
```

13 tools: `search_atlas`, `list_papers`, `get_paper`, `get_benchmark_distribution`,
`get_framework_vocabulary`, `list_standards_packs`, `get_standards_pack`,
`register_for_certification`, `get_eval_items`, `submit_eval`, `verify_certification`,
`get_bench_items`, `submit_bench_run`.

Index for crawlers and agents: <https://aioq.org/llms.txt>

---

## Related repositories

| Repository | |
|---|---|
| [`AI-Integrity/AIO20002`](https://github.com/AI-Integrity/AIO20002) | The full specification of AIO 20002, the reasoning record standard — prose spec, examples, tests. The machine-readable grammar in `vocabulary/aio-00011.json` here implements it. |
| [`AI-Integrity/aio-prism-benchmark`](https://github.com/AI-Integrity/aio-prism-benchmark) | The PRISM benchmark — multi-layer win-rate rankings across frontier models. |

Naming convention: `AIO<number>` repositories hold the specification of a single numbered standard;
kebab-case repositories hold data, tools, and benchmarks.

---

## Corrections

Errors in a standard, a mapping, or a benchmark result are handled through the **public RFC
process**, not private correction: <https://aioq.org/en/rfc>. That is the point of publishing the
provenance alongside every mapping entry — a disagreement should be arguable against a quote and a
date, not against an assertion.

Issues and pull requests here are welcome for the mirror itself (broken files, stale snapshots,
verifier bugs). Substantive changes to a standard go through the RFC process.

---

## Legal note

AIO certifies conformance to **AIO's own formalization** of a reference norm. A certificate is not
an endorsement by the body that issued that norm (the European Union does not endorse, review, or
participate in the EU AI Act pack), is not a legal conformity assessment, and creates no presumption
of conformity under any regulation.

Contact: info@aioq.org · Site: <https://aioq.org>
