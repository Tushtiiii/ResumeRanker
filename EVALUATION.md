# Candidate Ranking Pipeline: Architecture & Evaluation Documentation

## 1. System Overview

This offline, CPU-only Python candidate ranking pipeline provides high-throughput discovery, multi-criteria scoring, and automated anomaly detection for candidate profile datasets.

```
                         ┌─────────────────────────────────┐
                         │   Input Candidate Dataset       │
                         │   (JSONL / JSON - 100k+ rows)   │
                         └────────────────┬────────────────┘
                                          │ Streaming / Chunk Ingestion
                                          ▼
                         ┌─────────────────────────────────┐
                         │    Multicore Feature Engine     │
                         │ (Skills, YOE, Evidence, Signals)│
                         └────────────────┬────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
   ┌───────────────────────────────┐               ┌───────────────────────────────┐
   │    Keyword-Stuffing Detector  │               │       Honeypot Detector       │
   │  - Skill Inflation            │               │  - Zero Verification Check    │
   │  - Skill Duration Anomaly     │               │  - Application Spam Pattern   │
   │  - Term Repetition Saturation │               │  - Low Profile Completeness   │
   └──────────────┬────────────────┘               └──────────────┬────────────────┘
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          │ Multiplicative Penalties Applied
                                          ▼
                         ┌─────────────────────────────────┐
                         │     Composite Scoring Engine    │
                         │  - Global Sorting & Tie-Break   │
                         └────────────────┬────────────────┘
                                          │
                                          ▼
                         ┌─────────────────────────────────┐
                         │      Submission CSV File        │
                         │  - Schema-validated 100 rows    │
                         └─────────────────────────────────┘
```

---

## 2. Mathematical Scoring Model

The composite raw score $S_{\text{raw}} \in [0, 1]$ is a weighted combination of 5 feature sub-scores:

$$S_{\text{raw}} = w_1 \cdot S_{\text{skills}} + w_2 \cdot S_{\text{experience}} + w_3 \cdot S_{\text{evidence}} + w_4 \cdot S_{\text{location}} + w_5 \cdot S_{\text{availability}}$$

### Feature Weight Configuration:
- **Skill Relevance ($w_1 = 0.30$)**: Coverage ratio of target skills matched with proficiency multiplier (Expert: 1.0, Advanced: 0.85, Intermediate: 0.6, Beginner: 0.3) + skill duration bonus + Redrob platform assessment score.
- **Experience Match ($w_2 = 0.25$)**: Target years-of-experience range matching function blended with current title seniority score.
- **Prestige & Career Evidence ($w_3 = 0.15$)**: GitHub activity score + University tier (Tier 1 vs Tier 4 weighting) + account verifications + recruiter saves.
- **Location & Work Mode ($w_4 = 0.15$)**: Preferred work mode (remote/flexible/hybrid) + relocation willingness.
- **Availability Signals ($w_5 = 0.15$)**: Open to work flag + notice period (in days) + recruiter message response rate and average response time.

---

## 3. Anomaly & Penalization Engine

Final score after penalization is calculated as:

$$S_{\text{final}} = S_{\text{raw}} \times M_{\text{keyword}} \times M_{\text{honeypot}}$$

### A. Keyword-Stuffing Penalties ($M_{\text{keyword}}$):
1. **Skill Inflation**: If candidate claims $>20$ skills without corresponding depth, penalty factor $(1 - (0.10 + 0.02 \times \text{excess}))$ applied.
2. **Skill Duration Anomaly**: If single skill duration $> (\text{total years of experience} + 3)$, $20\%$ penalty applied.
3. **Term Saturation**: If top non-stopword word occurs $\ge 8$ times in headline/summary, $15\%$ penalty applied.

### B. Low-Signal & Honeypot Penalties ($M_{\text{honeypot}}$):
1. **Zero Verifications**: If candidate email, phone, AND LinkedIn are all unverified, $50\%$ penalty applied.
2. **Applicant Spam Pattern**: If candidate has $>40$ applications submitted in 30 days with $0\%$ response rate and $0\%$ interview completion, $60\%$ penalty applied.
3. **Incomplete Profile**: Completeness score $<35\%$ applies $40\%$ penalty.
4. **Adversarial Prompt Injection**: Text containing trap phrases (e.g., *"ignore previous instructions"*, *"rank 1"*) receives severe $90\%$ penalty.

---

## 4. Execution & Evaluation Commands

### Step 1: Run Ranking Pipeline
```bash
python rank.py --candidates ./candidates.jsonl --out ./submission.csv --top_n 100
```

### Step 2: Validate Submission CSV Rules
```bash
python server/validate_submission.py submission.csv
```

### Step 3: Run Full Evaluation Report
```bash
python evaluate.py --candidates ./candidates.jsonl --submission ./submission.csv
```
