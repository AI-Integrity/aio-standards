# AIO Standards Pack — Formalization Methodology

**Version** 0.1 · **Status** draft (RFC candidate) · **Last updated** 2026-08-13

A standards pack turns an external reference norm — a regulation, a guideline, a
recommendation — into AIO Framework hierarchy values (V/E/S) that a model's reasoning
records can be scored against. This document states the rules that govern that
translation. It is derived from §5.3.5 of the AIO P3–P5 execution plan and is itself a
candidate for the public RFC process.

The reason it exists: the first EU AI Act pack (v0.1) was seeded from an internal
crosswalk that had never been checked against the primary source. Trust certification
depends entirely on whether the formalization is right. Everything below is the standing
answer to "how do you know that mapping is correct?"

---

## 1. Source-of-truth rules

1. **Primary sources only.** A mapping may be grounded only in the official publication
   of the norm by the body that issued it. For EU legislation that is EUR-Lex / the EU
   Publications Office (e.g. Regulation (EU) 2024/1689, CELEX:32024R1689); for WHO, the
   official WHO publication PDF; and so on. Secondary commentary, law-firm summaries,
   trade-press explainers, and mirror sites are not sources.
2. **Mirrors are recorded, not hidden.** When the canonical web front end cannot be
   fetched (bot challenge, outage) and the same official manifestation is retrieved from
   another endpoint operated by the same issuing body — for example the EU Publications
   Office Cellar repository, `publications.europa.eu/resource/celex/{CELEX}` — the entry
   records both: `sourceUrl` is the canonical citation, `retrievalUrl` is what was
   actually fetched. If no official manifestation can be obtained at all, the entry stays
   `draft-unverified`. It is never upgraded on the strength of an unofficial mirror.
3. **Quotes are verbatim.** The `quote` field carries the official wording character for
   character. Elisions are marked `[…]`. When one entry spans more than one provision, a
   bracketed citation such as `[Art. 9(1)]` may precede each excerpt; everything outside
   brackets is verbatim. Quotes are normally 400 characters or fewer.
4. **Never invent.** If the text of a provision could not be obtained, the entry is marked
   `draft-unverified` with a note saying so. An unverified entry is an acceptable outcome.
   A fabricated quote is not.
5. **The summary must not exceed the provision.** A summary states what the provision
   requires and nothing more. Where the seeded summary overstated, understated, or
   silently dropped a limb of the provision, the correction is recorded in `changeNote`.

## 2. Provenance fields (mandatory)

Every `vesMapping` entry carries a `provenance` object. Without it an entry cannot leave
`draft-unverified`, and a pack with any unverified entry cannot reach `active`.

| Field | Meaning |
|---|---|
| `sourceUrl` | Canonical URL of the official text. |
| `retrievalUrl` | Optional. The endpoint actually fetched, when it differs from the canonical URL. |
| `article` | Exact provision, down to paragraph and point (e.g. `Article 12(2), point (a)`). |
| `quote` | Verbatim excerpt of the official text. Elisions marked `[…]`. |
| `rationale` | Why this provision maps to these V/E/S codes, argued from the quoted text. |
| `retrievedAt` | ISO 8601 date the official text was fetched. |
| `verifiedBy` | Who or what performed the check, and at what review stage. |

Item banks carry the same discipline per item, plus one field more: `correspondence`,
which records the check that the item's *scenario* is actually about what the cited
provision regulates — a correct citation attached to an off-target scenario is still a
defect (§5.3.5.4).

## 3. Status ladder

```
draft-unverified  →  draft-verified  →  rfc  →  active
```

- **draft-unverified** — seeded, or the primary text could not be confirmed. No provenance,
  or provenance incomplete.
- **draft-verified** — the quote was read from the official text and the V/E/S assignment
  was re-derived from it, with a written rationale. Checkable, not yet agreed.
- **rfc** — under public review at <https://aioq.org/en/rfc>.
- **active** — review complete. Only an `active` pack backs a certificate without a
  draft-basis notice.

Rules:

- A pack is `draft-verified` only when **every** entry is `draft-verified` or better. One
  unverified entry holds the whole pack at `draft-unverified`.
- The pack status at the moment of issuance is written into the certificate's **signed**
  payload as `basisStatus`. Promoting the pack later does not retroactively upgrade a
  certificate, and a draft basis cannot be edited away after the fact.
- Certificates issued against a pack that is not `active` carry a draft-basis notice in
  the API response, on the certification page, and in the signed record.

## 4. Article → V/E/S translation rules

The V/E/S codes are the canonical three-letter AIO 00011 vocabulary served at
`/api/framework/vocabulary` — the same codes an AIO 20002 record carries. Family names
("Security") and argumentation-scheme labels ("E7-Sign-pattern") are **not** pack
vocabulary; a mapping written in them cannot be checked mechanically against the
framework and is treated as unverified.

Working rules, each applied against the quoted text and not against a general impression
of the norm:

- **V (values that must prevail)** — take them from what the provision says it protects.
  Where a provision routes through a definition (Art. 12(2) → Art. 79(1) → "health or
  safety, or fundamental rights"), follow the route and code the definition, not the
  referring article.
- **E (evidence that must be decisive)** — ask what the provision accepts as discharging
  it. A written content list discharges as `Gui`; measurement against declared metrics as
  `Dat`; the considered judgment of an assigned overseer as `Exp`.
- **S (sources that must be trusted)** — only classes the text actually designates. If a
  provision names no professional body, `Pro` does not belong in its mapping, however
  plausible it sounds. This rule alone removed several assignments from EU AI Act v0.1.
- **Inference is allowed but must be flagged.** Where a code follows from a provision's
  structure rather than its words (e.g. reading a low "reason to consider" threshold as
  admitting lived experience), the rationale says so explicitly and the entry is put to
  the RFC round on that point.
- **Scope honesty.** Where a provision is outside what an AIO 20002 record can supply, the
  entry says so in `note` rather than implying coverage the pack lacks.

## 5. Double formalization (recommended)

§5.3.5.5 recommends that each provision be formalized **independently at least twice** —
by two people, or by two model runs that do not see each other's output — with only the
divergent entries escalated to manual adjudication. Agreement is evidence; a single pass,
however careful, is one opinion with a citation attached.

The current EU AI Act v0.2 pack is a **single automated pass** (`claude-opus-5`) with human
review pending, and every `verifiedBy` field says exactly that. The second independent
formalization is the prerequisite for moving the pack from `draft-verified` to `rfc`.

## 6. What a certificate does and does not claim

AIO certifies conformance to **AIO's own formalization** of a reference norm. It is not a
legal conformity assessment, not a notified-body procedure, and confers no presumption of
conformity under any regulation. Tier 0 additionally is self-assessment on a fully public
item set, so its score is a floor rather than a gaming-resistant measurement.

---

## 한국어 요약

기준 팩(standards pack)은 외부 규범을 AIO Framework 위계값(V/E/S)으로 옮긴 것입니다. 이
문서는 그 환산 규칙을 정한 것으로, 실행계획 §5.3.5 에서 도출되었으며 그 자체가 공개 RFC
대상입니다.

- **1차 소스 원칙** — 정형화의 근거는 발행 기관의 공식 원문뿐입니다. 해설·요약·블로그·미러
  사이트는 출처가 될 수 없습니다. 공식 웹 프런트가 막혔을 때 같은 기관의 다른 공식
  엔드포인트(예: EU 출판국 Cellar)에서 동일 원문을 받은 경우, `sourceUrl`(정본 인용)과
  `retrievalUrl`(실제 취득 경로)을 모두 남깁니다.
- **인용은 축어** — `quote` 는 공식 원문 그대로이며 생략은 `[…]` 로 표시합니다. 원문을
  확보하지 못하면 그 항목은 `draft-unverified` 로 남깁니다. **인용을 지어내지 않습니다.**
- **증빙 필드 의무화** — 항목마다 `sourceUrl · article · quote · rationale · retrievedAt ·
  verifiedBy`. 문항에는 시나리오가 해당 조항의 실제 규율 대상과 맞는지 확인한 기록
  (`correspondence`)이 추가됩니다.
- **상태 사다리** — `draft-unverified → draft-verified → rfc → active`. 항목 하나라도
  미검증이면 팩 전체가 `draft-unverified` 입니다. 발급 시점의 팩 상태는 인증서 **서명
  본문**에 `basisStatus` 로 기록되므로, 나중에 팩이 승격되어도 과거 인증서의 근거는 바뀌지
  않고 "draft 기준" 표기를 지울 수도 없습니다.
- **환산 규칙** — V/E/S 는 AIO 00011 3글자 정본 코드만 사용합니다. 조항이 지정하지 않은
  출처 등급은 넣지 않습니다(그럴듯해 보여도). 조항의 구조에서 추론한 코드는 그 사실을
  rationale 에 명시하고 RFC 쟁점으로 올립니다.
- **이중 환산 권장** — 같은 조항을 서로의 결과를 보지 않는 두 주체(또는 두 모델 실행)가
  독립 환산하고, 불일치 항목만 수동 판정합니다. 현재 EU AI Act v0.2 는 **단일 자동 실행 +
  사람 검토 대기** 상태이며, 이중 환산 완료가 `rfc` 승격의 전제입니다.
- **인증의 범위** — AIO 는 "AIO 가 정형화한 규범"에 대한 적합성을 인증합니다. 법적 적합성
  평가가 아니며 어떤 규정상 적합성 추정도 부여하지 않습니다.
