#!/usr/bin/env python3
"""
Evaluation and Benchmarking Script for Candidate Ranking Pipeline.
Measures execution performance, penalty distribution, rank monotonicity, and schema validity.
"""

import argparse
import csv
import json
import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.detectors import KeywordStuffingDetector, HoneypotDetector
from server.validate_submission import validate_submission


def run_evaluation(candidates_path: str, submission_path: str):
    print("=" * 70)
    print(" CANDIDATE RANKING PIPELINE EVALUATION REPORT")
    print("=" * 70)

    # 1. Submission File Validation
    print("\n[1] Schema & Rule Validation (validate_submission.py):")
    val_errors = validate_submission(submission_path)
    if val_errors:
        print(f"  [FAIL] Validation failed with {len(val_errors)} issue(s):")
        for err in val_errors:
            print(f"     - {err}")
    else:
        print("  [OK] PASSED 100% of submission schema and business logic rules.")

    # 2. Submission Score Distribution & Metrics
    print("\n[2] Output CSV Score Metrics:")
    ranks = []
    scores = []
    cids = []
    reasonings = []

    with open(submission_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cids.append(row["candidate_id"])
            ranks.append(int(row["rank"]))
            scores.append(float(row["score"]))
            reasonings.append(row["reasoning"])

    n_rows = len(scores)
    print(f"  Total Ranked Data Rows: {n_rows}")
    if n_rows > 0:
        print(f"  Score Max  : {max(scores):.4f}")
        print(f"  Score Min  : {min(scores):.4f}")
        print(f"  Score Mean : {sum(scores)/n_rows:.4f}")

    # Check monotonicity
    is_strictly_decreasing = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
    print(f"  Monotonic Non-Increasing Order: {'[YES]' if is_strictly_decreasing else '[NO]'}")

    # 3. Dataset Penalization Statistics
    print("\n[3] Anomaly & Penalty Audit on Input Dataset:")
    ks_detector = KeywordStuffingDetector()
    hp_detector = HoneypotDetector()

    total_evaluated = 0
    ks_flagged_count = 0
    hp_flagged_count = 0

    if os.path.exists(candidates_path):
        is_json_array = candidates_path.endswith('.json') and not candidates_path.endswith('.jsonl')
        if is_json_array:
            with open(candidates_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for cand in data:
                    total_evaluated += 1
                    _, _, ks_flag = ks_detector.evaluate(cand)
                    _, _, hp_flag = hp_detector.evaluate(cand)
                    if ks_flag: ks_flagged_count += 1
                    if hp_flag: hp_flagged_count += 1
        else:
            with open(candidates_path, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.strip(): continue
                    try:
                        cand = json.loads(line)
                        total_evaluated += 1
                        _, _, ks_flag = ks_detector.evaluate(cand)
                        _, _, hp_flag = hp_detector.evaluate(cand)
                        if ks_flag: ks_flagged_count += 1
                        if hp_flag: hp_flagged_count += 1
                    except Exception:
                        continue

        print(f"  Total Candidates Audited     : {total_evaluated:,}")
        print(f"  Keyword-Stuffing Flagged     : {ks_flagged_count:,} ({ks_flagged_count/max(total_evaluated,1)*100:.2f}%)")
        print(f"  Honeypot / Low-Signal Flagged: {hp_flagged_count:,} ({hp_flagged_count/max(total_evaluated,1)*100:.2f}%)")
    else:
        print(f"  [Skipped] Dataset '{candidates_path}' not found for penalization audit.")

    print("\n" + "=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Evaluate Candidate Ranking Pipeline Output")
    parser.add_argument("--candidates", type=str, default="./candidates.jsonl", help="Path to input candidates dataset")
    parser.add_argument("--submission", type=str, default="./submission.csv", help="Path to submission CSV file")
    args = parser.parse_args()

    if not os.path.exists(args.submission):
        print(f"Error: Submission CSV '{args.submission}' does not exist.")
        sys.exit(1)

    run_evaluation(args.candidates, args.submission)

if __name__ == "__main__":
    main()
