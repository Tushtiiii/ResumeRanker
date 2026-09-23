import csv
import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor

try:
    import orjson
    def parse_json(line):
        return orjson.loads(line)
except ImportError:
    def parse_json(line):
        return json.loads(line)

from src.scorer import CandidateScorer

DEFAULT_TARGET_PROFILE = {
    "title": "Senior AI / Backend Engineer",
    "required_skills": [
        "python", "machine learning", "ai", "embeddings", "vector databases",
        "data pipelines", "spark", "sql", "pytorch", "llm", "nlp", "microservices",
        "system design", "rest apis", "docker", "aws", "cloud", "fastapi"
    ],
    "target_yoe_min": 5.0,
    "target_yoe_max": 10.0,
    "ideal_notice_period_days": 30
}


def process_chunk(lines_chunk: list, target_profile: dict, top_k: int = 300) -> list:
    """Processes a chunk of candidate JSON/JSONL lines and returns candidate scores."""
    scorer = CandidateScorer()
    results = []
    for line in lines_chunk:
        if not line or not line.strip():
            continue
        try:
            cand = parse_json(line)
            score, cid, reasoning = scorer.score_candidate(cand, target_profile)
            results.append((score, cid, reasoning))
        except Exception:
            continue

    results.sort(key=lambda x: (-x[0], x[1]))
    return results[:top_k]


def run_ranking_pipeline(candidates_path: str, out_path: str, top_n: int = 100, validate: bool = True) -> dict:
    """
    Runs the full offline CPU candidate ranking pipeline.
    """
    if not os.path.exists(candidates_path):
        raise FileNotFoundError(f"Candidate dataset '{candidates_path}' does not exist.")

    t0 = time.time()
    num_workers = min(os.cpu_count() or 4, 16)
    chunk_size = 10000

    chunks = []
    current_chunk = []

    # Check if JSON array vs JSONL
    is_json_array = candidates_path.endswith('.json') and not candidates_path.endswith('.jsonl')

    if is_json_array:
        with open(candidates_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                current_chunk.append(json.dumps(item))
                if len(current_chunk) >= chunk_size:
                    chunks.append(current_chunk)
                    current_chunk = []
            if current_chunk:
                chunks.append(current_chunk)
    else:
        with open(candidates_path, "r", encoding="utf-8") as f:
            for line in f:
                current_chunk.append(line)
                if len(current_chunk) >= chunk_size:
                    chunks.append(current_chunk)
                    current_chunk = []
            if current_chunk:
                chunks.append(current_chunk)

    total_candidates = sum(len(c) for c in chunks)
    print(f"[*] Ingested {total_candidates:,} candidates across {len(chunks)} chunks using {num_workers} CPU workers.")

    all_top_candidates = []
    with ProcessPoolExecutor(max_workers=num_workers) as executor:
        futures = [
            executor.submit(process_chunk, chunk, DEFAULT_TARGET_PROFILE, 300)
            for chunk in chunks
        ]
        for fut in futures:
            all_top_candidates.extend(fut.result())

    # Sort globally: score descending (-score), then candidate_id ascending for tie-breaking
    all_top_candidates.sort(key=lambda x: (-x[0], x[1]))

    # Slice top N
    top_candidates = all_top_candidates[:top_n]

    # Write output CSV
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    scored_rows = []
    for rank_idx, (score, cid, reasoning) in enumerate(top_candidates, start=1):
        scored_rows.append((cid, rank_idx, score, reasoning))

    with open(out_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["candidate_id", "rank", "score", "reasoning"])
        for cid, rank, score, reasoning in scored_rows:
            writer.writerow([cid, rank, f"{score:.4f}", reasoning])

    elapsed = time.time() - t0
    print(f"[OK] Generated '{out_path}' in {elapsed:.2f}s.")

    validation_errors = []
    if validate:
        val_script = os.path.join(os.path.dirname(__file__), "..", "server", "validate_submission.py")
        val_script = os.path.abspath(val_script)
        if os.path.exists(val_script):
            sys.path.insert(0, os.path.dirname(val_script))
            try:
                from validate_submission import validate_submission
                validation_errors = validate_submission(out_path)
                if validation_errors:
                    print(f"[WARNING] Validation errors found ({len(validation_errors)}):")
                    for err in validation_errors:
                        print(f"  - {err}")
                else:
                    print("[OK] Submission file passed 100% of schema validation checks!")
            except Exception as e:
                print(f"[WARNING] Could not execute validator: {e}")

    return {
        "total_candidates": total_candidates,
        "top_n": top_n,
        "elapsed_seconds": round(elapsed, 2),
        "validation_errors": validation_errors
    }
