# RecruitIQ AI — Final System Design
**Evidence-Based Hybrid Candidate Ranking System for the Redrob Hackathon**

---

## 1. Vision

RecruitIQ AI ranks the 100,000-candidate pool against the Redrob JD the way a sharp senior recruiter would — by weighing demonstrated evidence (career history, verified skill assessments, behavioral activity, internal consistency) instead of counting keyword hits.

We are explicitly *not* building:
- A keyword-matching ATS filter (the dataset's keyword-stuffer trap exists specifically to catch this)
- A chatbot or per-candidate LLM call (the 5-minute / CPU-only / no-network constraint forbids it, and it wouldn't scale to 100K+ candidates in a real product anyway)
- A "Learning-to-Rank model" in the strict supervised sense — there is no ground truth or leaderboard feedback during the competition, so anything calling itself "trained" must be honest about *what* it was trained on (see §3.4)

What we *are* building: a **transparent, feature-engineered, hybrid retrieval + rule-based reasoning pipeline** that produces an explainable score and a defensible, fact-grounded justification for every one of the top 100 candidates.

---

## 2. Guiding Approach

Five commitments shape every design decision below:

1. **Evidence over keywords.** Every score component must trace back to a specific field in the candidate's profile — never to a raw keyword count.
2. **JD intent, parsed once, used everywhere.** The JD is fixed for the whole competition. We parse it into a structured `jd_profile.yaml` *once*, by hand (assisted by a keyword/phrase-extraction script, reviewed by a human) — not at ranking time. This keeps ranking deterministic, reproducible, and network-free.
3. **Heavy lifting happens offline; ranking time is just assembly.** Cleaning, feature engineering, embeddings, BM25 indexing, and rule evaluation all run with no time limit, *before* the timed step. `rank.py` only loads cached artifacts, applies the scoring formula, sorts, and writes the CSV. This makes the 5-minute / 16GB / CPU-only constraint trivial to satisfy and removes almost all Stage-3 reproduction risk.
4. **Explicit, named rules for every trap and every JD disqualifier.** "Detect suspicious patterns" is not a rule. A rule is: *"flag if any skill has proficiency='expert' and duration_months < 6."* Every honeypot check and every JD-stated disqualifier gets its own named, testable function.
5. **Explainability is generated from the same evidence used to score** — never written independently of the rank, which is exactly what Stage 4 reviewers are trained to catch ("rank-5 candidate with critical reasoning" is a flagged failure mode).

---

## 3. Architecture

### 3.1 Two-phase split (this is the most important structural decision)

| Phase | When it runs | Time budget | What happens |
|---|---|---|---|
| **A. Precompute** | Once, during development, re-run whenever code/config changes | Unlimited | JD parsing, data cleaning, feature engineering, embeddings, BM25 index, honeypot/disqualifier rule evaluation, (optional) calibration model training |
| **B. Ranking (`rank.py`)** | The single command graded at Stage 3 | ≤5 min, ≤16GB RAM, CPU-only, no network | Load cached feature table → apply composite formula from `weights.yaml` → sort → generate reasoning strings → write `submission.csv` |

Everything expensive (embedding 100K profiles, building a BM25 index, running ~15 rule checks per candidate) lives in Phase A. Phase B is a few seconds of vectorized pandas work. This is the single biggest risk-reduction move relative to the earlier draft.

### 3.2 Phase A — Precompute Pipeline

**Stage 0 — JD Understanding (manual, one-time)**
Read `job_description.docx` and hand-author `configs/jd_profile.yaml`:
```yaml
mandatory_skills: [sentence-transformers, embeddings, vector-db, retrieval, ranking, python, evaluation-ndcg-mrr-map]
preferred_skills: [lora, qlora, peft, learning-to-rank, xgboost, distributed-systems, open-source]
negative_signals:
  pure_research_only: true
  langchain_only_recent: true
  architecture_no_recent_code: true
  cv_speech_robotics_without_nlp: true
  consulting_only_career: true
  closed_source_no_external_validation: true
  title_chaser: true
location_preference: {ideal: [Pune, Noida], acceptable: [Hyderabad, Mumbai, Bangalore, "Delhi NCR", Gurgaon], outside_india: "case_by_case_no_visa"}
notice_period_preference: {ideal_max_days: 30, buyout_max_days: 30}
ideal_profile_text: "6-8 years total, 4-5 in applied ML/AI at product companies, shipped an end-to-end ranking/search/recommendation system to real users at scale, opinionated about hybrid vs dense retrieval and offline vs online eval, defends choices with reference to real systems built."
```
This file is the single source of truth for everything downstream. (Using an LLM to help draft this file offline is fine and should be declared honestly — it's not used at ranking time, so it doesn't violate the no-network rule.)

**Stage 1 — Data Cleaning & Normalization**
- Skill name normalization via `rapidfuzz` + `configs/skill_aliases.yaml` (e.g., "LLM Fine-tuning" / "Fine-tuning LLMs" / "LoRA fine-tuning" → canonical tags)
- Title normalization via `configs/title_mapping.yaml` (maps raw titles to a seniority ladder + functional category)
- Company classification via `configs/company_mapping.yaml`: explicit list of consulting firms named in the JD (TCS, Infosys, Wipro, Accenture, Cognizant, Capgemini, + a few obvious others) tagged `consulting`; everything else classified `product` / `enterprise` / `unknown` using `current_industry` + `current_company_size` heuristics
- Date parsing and basic sanity coercion (not the honeypot logic itself — just type/format cleanup)

**Stage 2 — Feature Engineering**
Every candidate becomes one row in `artifacts/candidate_features.parquet`. Alongside the numerical feature values, each important feature retains the underlying evidence it was derived from (which roles, which skill entries, which assessment scores) so that scoring and reasoning never drift apart — the same fields back both. Feature groups:

*Career*
- `years_of_experience` (raw)
- `ai_ml_years` — sum of `duration_months` across `career_history` entries whose `title`/`description` match an AI/ML/retrieval/ranking keyword set, /12
- `retrieval_ranking_years` — narrower subset specifically matching retrieval/search/recsys/ranking terms (this is the JD's #1 "absolutely need")
- `product_company_ratio` — fraction of total career months at `product`-classified companies
- `career_stability` — average tenure per role; flags very short stints
- `title_chaser_score` — rate of seniority-title escalation per company switch, weighted against tenure length

*Skills*
- `mandatory_skill_coverage`, `preferred_skill_coverage` (count + which ones, kept for reasoning)
- `skill_trust_score` per matched skill = function of (proficiency, `duration_months`, `endorsements`, `skill_assessment_scores[skill]`) — this is the direct counter to keyword-stuffing: a skill claimed "expert" with near-zero duration and a low platform assessment score scores low trust regardless of how impressive it reads
- `skill_freshness` — recency-weighted

*Semantic / Lexical*
- `embedding_similarity` — cosine similarity between candidate (`headline` + `summary` + all `career_history.description`) and `jd_profile.ideal_profile_text`, using a single committed sentence-transformer model (see §6)
- `bm25_score` — BM25 of candidate text against the JD's mandatory + preferred skill terms
- Both signals are treated as relevance *evidence*, not as the final decision on their own — they feed into `semantic_lexical_fit` as one weighted component (15%) alongside technical, career, location, behavioral, and trust signals, and are explicitly the input the honeypot logic is built to keep in check (see §4, check 9)

*Behavioral* (direct from `redrob_signals`, with sane handling of sentinel values: `-1` on `github_activity_score` / `offer_acceptance_rate` means "no data," treated as neutral, not penalized)
- `recruiter_response_rate`, `recency = days since last_active_date`, `interview_completion_rate`, `open_to_work_flag`, `saved_by_recruiters_30d`, `search_appearance_30d`

*Trust / Consistency* — feeds both honeypot detection (§4) and JD disqualifiers (§5)

*Location & Logistics*
- `location_fit_score` per `jd_profile.location_preference`
- `notice_period_score` — smooth decay (≤30 days = 1.0, scaling down through 180), not a hard cutoff, matching the JD's own "still in scope but higher bar" language

**Stage 3 — Hybrid Retrieval Index**
- Sentence-transformer embeddings for all 100K candidates → `artifacts/candidate_embeddings.npy`
- BM25 index over normalized candidate text → `artifacts/bm25_index.pkl`
- Both are precomputed against the *fixed* JD, so the per-candidate semantic/lexical scores are just a column in the feature table by the time `rank.py` runs — no retrieval computation happens at ranking time at all.

**Stage 4 — (Optional, Phase 2 only) Weak-Supervision Calibration**
If time permits, instead of hand-tuning every weight in `weights.yaml`:
1. Manually read and label ~150–300 candidates across relevance tiers (use the self-eval set from §7 — same set, dual purpose)
2. Train a small LightGBM ranker on the engineered features (Stage 2 output) against these labels
3. Use it to *learn relative feature weights*, not to replace the rule-based disqualifiers/honeypot logic, which stay hard-coded regardless

This must be documented precisely in the README and `methodology_summary`: state plainly that labels are self-constructed by the team (not ground truth), how many, and how they were chosen — this is the difference between a credible Stage-5 interview answer and a "show me your training labels" failure. **If you can't defend the labeling process clearly under questioning, skip this stage** and ship the pure rule-based version — it is fully legitimate on its own. (For this reason, the calibration model is treated as optional and deferred — see §11, Future Improvements — rather than load-bearing in the core pipeline below.)

### 3.3 Phase B — Ranking (`rank.py`, the timed step)

```
load candidate_features.parquet
load weights.yaml, rules.yaml
composite_score = combine(features, weights)        # vectorized, all 100K rows
composite_score *= disqualifier_multiplier(features) # §5 — soft/hard down-weighting
composite_score *= (1 - honeypot_risk(features))     # §4
top100 = composite_score.nlargest(100)
reasoning = generate_reasoning(top100, evidence)      # §8
write submission.csv (validated against validate_submission.py logic before exiting)
```

Starting composite formula (tune against §7's gold set — these are defensible defaults, not final). Note this is a **weighted sum of independent components** — deliberately simple and auditable rather than modeling cross-feature interactions, which keeps every term traceable to a single evidence source and avoids claims the formula can't back up:

```
composite = 0.30 * technical_fit        (mandatory/preferred skill coverage + skill_trust_score + retrieval_ranking_years)
          + 0.15 * semantic_lexical_fit (0.6 * embedding_similarity + 0.4 * bm25_score, both min-max normalized)
          + 0.20 * career_quality       (product_company_ratio, career_stability, anti-title-chaser)
          + 0.10 * location_fit
          + 0.10 * behavioral_readiness
          + 0.15 * trust_score          (1 − consistency-risk penalties)
```

#### Technical Fit vs. Recruitability

It's worth calling out explicitly that the formula above separates two things that are easy to conflate:

- **Technical fit** (`technical_fit` + `semantic_lexical_fit` + part of `career_quality`) measures whether the candidate *can do the job* — skills, experience, demonstrated retrieval/ranking work.
- **Recruitability** (`behavioral_readiness` + `location_fit`, plus notice period inside `career_quality`) measures whether the candidate can *realistically be hired* right now — recruiter response rate, interview completion rate, open-to-work status, notice period, recent activity.

The JD explicitly asks for candidates the team "can actually talk to," so a technically strong candidate who is unresponsive, far outside the notice-period window, or not currently reachable should not automatically outrank a slightly less decorated candidate who is realistically hirable. Keeping these as separate, explicitly-named weighted groups (rather than one blended "fit" number) makes this trade-off visible and tunable in `weights.yaml`, instead of being buried inside a single opaque score.

### 3.4 Architecture Diagram

```
                    job_description.docx
                            │  (one-time, manual + assisted parsing)
                            ▼
                    jd_profile.yaml ───────────────┐
                            │                       │
   ════════════ PHASE A: PRECOMPUTE (unlimited time) ════════════
                            │                       │
                  candidates.jsonl (100K)            │
                            │                       │
                  Data Cleaning & Normalization       │
                            │                       │
                  Feature Engineering ◄───────────────┘
                  (career / skill / semantic / behavioral / trust / location)
                            │
              ┌─────────────┼─────────────┐
              ▼              ▼             ▼
      Embeddings (.npy)  BM25 Index (.pkl)  Honeypot + Disqualifier
                                              rule flags (per candidate)
              │              │             │
              └─────────────┴─────────────┘
                            ▼
              candidate_features.parquet   (everything cached)
                            │
   ════════════ PHASE B: rank.py (≤5 min, 16GB, CPU, no network) ════════════
                            ▼
                  Composite Scoring (weights.yaml)
                            ▼
                  Honeypot / Disqualifier Multipliers
                            ▼
                      Top-100 Selection
                            ▼
                  Evidence-Based Reasoning Generator
                            ▼
                      submission.csv
```

---

## 4. Honeypot & Trust-Risk Detection (explicit checklist)

Every check is independently testable and traces to a specific schema field — no memorized ID lists, ever:

| # | Check | Logic |
|---|---|---|
| 1 | Expert-with-no-duration | `skills[].proficiency == "expert"` AND `duration_months < 6` |
| 2 | Experience-sum mismatch | `sum(career_history.duration_months)/12` deviates from `profile.years_of_experience` by >25% |
| 3 | Overlapping/impossible timeline | More than one `career_history` entry with `is_current=true`; or any entry with `end_date < start_date`; or unexplained overlapping full-time date ranges |
| 4 | Education-career impossibility | `education.end_year` after the `start_date` year of the *first* career entry, or `end_year < start_year` |
| 5 | Skill-duration exceeds career | Any skill `duration_months` exceeding `years_of_experience * 12` by a wide margin |
| 6 | Assessment-claim mismatch | Skill listed `advanced`/`expert` but `skill_assessment_scores[skill] < 35` |
| 7 | Stacked-stuffing pattern | ≥4 skills simultaneously triggering checks 1 and 6 |
| 8 | Profile completeness vs. polish | Very high claimed skill count/proficiency combined with `profile_completeness_score` well below typical |
| 9 | Sparse evidence behind high similarity | `embedding_similarity` in the top decile AND (`mandatory_skill_coverage` is low OR `skill_trust_score` is low across matched skills) | High semantic similarity to the JD with little supporting career/skill evidence underneath it is the embedding-space equivalent of keyword stuffing — text that *reads* relevant without the substance to back it up — and is checked separately from checks 1–8, which focus on internal contradictions rather than relevance-without-substance |

Combine into a single `honeypot_risk` score (0–1) rather than a binary flag — this gives a smooth down-weight instead of a hard cliff, consistent with the spec's "you don't need to special-case them, a good system naturally avoids them."

---

## 5. JD-Specific Disqualifier & Booster Rules

The JD lists five very specific negative signals — these get named, individually-testable rules, not a vague "consulting ratio" feature:

| Rule | Trigger | Effect |
|---|---|---|
| `pure_research_only` | Entire `career_history` industry/description set is academic/research lab terms, zero production-deployment language anywhere | Strong down-weight (stated as a hard "will not move forward" in the JD) |
| `langchain_only_recent` | AI-related skills concentrated in the last 12 months AND no pre-2022 ML/production experience present | Strong down-weight unless `retrieval_ranking_years` pre-dates this window |
| `architecture_stale_code` | `current_title` matches architect/lead/head/director AND current role `duration_months > 18` AND description lacks hands-on/coding language | Moderate down-weight |
| `cv_speech_robotics_only` | Skill/industry set dominated by computer-vision/speech/robotics terms with no NLP/IR/retrieval terms | Moderate down-weight |
| `consulting_only_career` | 100% of `career_history` companies classified `consulting` (via `company_mapping.yaml`), no product-company exposure ever | Strong down-weight (explicit JD exclusion) |
| `closed_source_no_validation` | 5+ years entirely at private companies, `github_activity_score == -1`, no certifications, no public profile signal | Mild down-weight |
| `title_chaser` | Rapid title escalation across short (<18mo) tenures | Mild–moderate down-weight |

Boosters (positive, matching the JD's "ideal candidate" description):
- High `retrieval_ranking_years` + `embedding_similarity` to `ideal_profile_text`
- Strong `product_company_ratio`
- Location in Pune/Noida or `willing_to_relocate=true`
- `notice_period_score` high
- `open_to_work_flag=true` with decent `recruiter_response_rate` (the JD literally asks for candidates "we can actually talk to")

---

## 6. Reasoning Generation (avoiding the "templated" Stage-4 penalty)

For every top-100 candidate, the pipeline already has an **evidence object** from Stage 2/4/5 (top matched skills with their trust scores, strongest career-history evidence line, any triggered concern flag, a standout or weak behavioral signal). Reasoning text is assembled from this evidence using a pool of varied sentence frames per evidence type, selected deterministically (seeded on `candidate_id`) so phrasing structure differs across candidates even when evidence categories repeat. Two hard rules:
- Every reasoning string includes at least one concrete number pulled from the candidate's actual record (years, %, a named skill, a response rate) — satisfies the "specific facts" and "no hallucination" checks.
- For lower-ranked candidates in the top 100 (roughly rank 40+), the generator must surface at least one genuine concern/caveat already computed in Stage 4/5 — satisfies "honest concerns" and "rank consistency."

---

## 7. Self-Evaluation Methodology (do this before spending any of your 3 submissions)

There's no live leaderboard, so build your own ground truth in miniature:

1. **Built-in negative test**: score the candidates listed in `sample_submission.csv`. That file is the canonical example of the keyword-stuffer trap (HR Managers / Content Writers ranked top on AI-skill count) — your system must rank these candidates *low*. If it doesn't, something in technical_fit or skill_trust_score is broken.
2. **Manual gold set**: hand-label ~30–50 candidates pulled from `sample_candidates.json` plus a stratified sample from the full pool, across rough tiers (strong fit / borderline / clear no / suspected honeypot), using your own read of the JD. Check your composite score's rank order against this set (Spearman correlation is enough — you don't need formal NDCG without real labels).
3. **Targeted trap tests**: pull candidates matching each disqualifier rule in §5 individually and confirm down-weighting fires as intended; pull a few honeypot-suspects and confirm `honeypot_risk` flags them.
4. **Format check**: run `validate_submission.py` locally before every submission, every time, no exceptions.
5. **Submission discipline**: given the 3-submission cap and no feedback, treat submission 1 as your validated best effort, not a draft — reserve submission 3 only for a genuine late fix, not iteration-by-trial.

---

## 8. Technology Stack (trimmed and justified)

| Layer | Choice | Why |
|---|---|---|
| Language | Python 3.11 | — |
| Data | pandas, numpy, pyarrow | parquet for cached feature table |
| Normalization | rapidfuzz, regex | skill/title/company normalization; no spaCy/NLTK unless a specific extraction need actually arises during build |
| Semantic retrieval | sentence-transformers, **`BAAI/bge-base-en-v1.5`** (single committed model) | BGE is explicitly named in the JD as an acceptable production embedding model — a genuine, defensible choice, not just a coincidence worth mentioning in the interview |
| Lexical retrieval | `rank-bm25` only | dropped redundant TF-IDF — BM25 alone covers the lexical/keyword-match role |
| Feature scaling / optional calibration | scikit-learn; `lightgbm` only if Phase 2 (§3.2 Stage 4) is attempted | keep the dependency list honest about what's actually load-bearing |
| Config | YAML: `weights.yaml`, `rules.yaml`, `skill_aliases.yaml`, `title_mapping.yaml`, `company_mapping.yaml` | every tunable lives outside code |
| Artifacts | `.parquet` (features), `.npy` (embeddings), `.pkl` (BM25 index, optional calibration model) | |
| Testing | `pytest` — unit tests per honeypot rule (§4) and per disqualifier rule (§5) | reviewers can run these directly to verify the logic does what the README claims |
| Version control | Git / GitHub, real incremental commit history | Stage 4 explicitly checks for "real iteration vs. single dump" |
| Sandbox (Section 10.5) | **One** Streamlit app on HuggingFace Spaces — accepts a small candidate sample, runs the pipeline end-to-end, outputs a ranked CSV | satisfies the requirement directly with a fraction of the effort of a separate frontend/backend deployment |
| Reproducibility insurance | A `Dockerfile` matching the 16GB/CPU/no-network constraints | doubles as the HF Spaces environment and as a safety net for Stage 3 reproduction |

**Deliberately dropped from the earlier draft**: separate React/TypeScript/Vite/Tailwind/Recharts frontend, FastAPI backend, split Railway+Vercel deployment, duplicate TF-IDF, a second "benchmark" embedding model, NLTK alongside spaCy. None of these move NDCG@10/50, MAP, P@10, reasoning quality, or honeypot rate — the metrics that are actually graded — and each adds surface area you'd have to defend in the Stage 5 interview without scoring benefit.

---

## 9. Repository Structure

```
repo/
├── README.md                     # setup + the single reproduce command
├── submission_metadata.yaml
├── requirements.txt
├── Dockerfile
├── rank.py                       # ← THE timed command
├── configs/
│   ├── jd_profile.yaml
│   ├── weights.yaml
│   ├── rules.yaml
│   ├── skill_aliases.yaml
│   ├── title_mapping.yaml
│   └── company_mapping.yaml
├── src/
│   ├── data_cleaning.py
│   ├── feature_engineering.py
│   ├── retrieval.py              # embeddings + bm25
│   ├── honeypot_rules.py         # §4, one function per check
│   ├── disqualifier_rules.py     # §5, one function per rule
│   ├── scoring.py                # composite formula
│   └── reasoning.py              # evidence → text
├── scripts/
│   ├── precompute.py             # Phase A entry point — run once
│   └── build_eval_set.py         # builds your hand-labeled gold set
├── artifacts/                    # generated by precompute.py
│   ├── candidate_features.parquet
│   ├── candidate_embeddings.npy
│   ├── bm25_index.pkl
│   └── calibration_model.pkl     # optional, Phase 2 only
├── tests/
│   ├── test_honeypot_rules.py
│   ├── test_disqualifier_rules.py
│   └── test_format_validator.py
└── app/
    └── streamlit_app.py          # HF Spaces sandbox
```

README must state, explicitly: precompute time (unbounded, document roughly how long it actually takes), and the single command — `python rank.py --candidates ./candidates.jsonl --out ./submission.csv` — that is the only step subject to the 5-minute/16GB/CPU/no-network limit.

---

## 10. Submission Checklist (mapped to the spec)

- [ ] `validate_submission.py` passes locally, zero errors
- [ ] Exactly 100 rows, ranks 1–100 each exactly once, scores non-increasing, ties broken by `candidate_id` ascending
- [ ] Honeypot rate on your own top 100 manually sanity-checked against §4 logic
- [ ] `rank.py` timed on a clean machine — confirm comfortably under 5 minutes (should be seconds, given Phase A/B split)
- [ ] No network calls, no GPU usage, anywhere in `rank.py`
- [ ] GitHub repo: clean incremental commit history, README with exact reproduce command, `requirements.txt`, `submission_metadata.yaml` at root
- [ ] Streamlit sandbox live on HF Spaces, tested end-to-end on a ≤100-candidate sample
- [ ] `methodology_summary` (≤200 words) written honestly — if Phase 2 calibration was used, say so and describe the labels precisely
- [ ] AI tools declaration filled out honestly
- [ ] Every team member can explain every rule in §4 and §5 without looking at the code — this is the actual Stage 5 test

---

## 11. Future Improvements

If additional labeled recruiter feedback becomes available, RecruitIQ AI could incorporate a lightweight calibration model (e.g., LightGBM, per §3.2 Stage 4) to *learn relative feature weights* while keeping the existing rule-based disqualifier and honeypot logic hard-coded and unchanged.

The competition version intentionally treats this as optional and out of the core pipeline: there are no official training labels provided, so any self-constructed labels must be disclosed precisely (count, source, selection method) if used at all. Keeping calibration as a clearly-separated, optional Phase 2 step — rather than a load-bearing part of the main architecture — makes the core system fully defensible on rules and evidence alone, and avoids having to answer "where did your labels come from?" with anything less than a precise, honest account.