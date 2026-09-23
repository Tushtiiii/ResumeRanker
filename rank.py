#!/usr/bin/env python3
"""
Offline, CPU-Only Candidate Discovery & Ranking Pipeline.
Detects keyword-stuffing and low-signal honeypot profiles.
Generates schema-validated CSV outputs.
"""

import argparse
import sys
import os

# Add root directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.pipeline import run_ranking_pipeline

def main():
    parser = argparse.ArgumentParser(description="Offline CPU Candidate Ranking Pipeline")
    parser.add_argument("--candidates", type=str, default="./candidates.jsonl", help="Path to input candidates dataset (JSON/JSONL)")
    parser.add_argument("--out", type=str, default="./submission.csv", help="Path to output submission CSV")
    parser.add_argument("--top_n", type=int, default=100, help="Number of top ranked candidates to output (default: 100)")
    parser.add_argument("--no-validate", action="store_true", help="Disable automatic CSV schema validation")

    args = parser.parse_args()

    try:
        results = run_ranking_pipeline(
            candidates_path=args.candidates,
            out_path=args.out,
            top_n=args.top_n,
            validate=not args.no_validate
        )
        print(f"[*] Done: Processed {results['total_candidates']:,} candidates in {results['elapsed_seconds']}s.")
    except Exception as e:
        print(f"[ERROR] Ranking pipeline failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
