from src.features import (
    extract_skills_score,
    extract_experience_score,
    extract_prestige_and_evidence_score,
    extract_availability_score
)
from src.detectors import KeywordStuffingDetector, HoneypotDetector

class CandidateScorer:
    """
    Composite candidate scorer with integrated Keyword-Stuffing and Honeypot detectors.
    """
    def __init__(self, weights: dict = None):
        self.weights = weights or {
            "skills": 0.30,
            "experience": 0.25,
            "evidence": 0.15,
            "location": 0.15,
            "availability": 0.15
        }
        self.keyword_detector = KeywordStuffingDetector()
        self.honeypot_detector = HoneypotDetector()

    def score_candidate(self, candidate: dict, target_profile: dict) -> tuple:
        cid = candidate.get("candidate_id", "")
        profile = candidate.get("profile", {})
        signals = candidate.get("redrob_signals", {})
        skills_list = candidate.get("skills", [])
        assessments = signals.get("skill_assessment_scores", {})

        # 1. Feature Component Scores
        skills_score, matched_skills = extract_skills_score(
            skills_list,
            target_profile.get("required_skills", []),
            assessments
        )

        experience_score = extract_experience_score(
            profile,
            target_profile.get("target_yoe_min", 5.0),
            target_profile.get("target_yoe_max", 10.0)
        )

        evidence_score = extract_prestige_and_evidence_score(candidate)

        pref_mode = signals.get("preferred_work_mode", "flexible")
        mode_score = 1.0 if pref_mode in ["remote", "flexible", "hybrid"] else 0.7
        relocate_score = 1.0 if signals.get("willing_to_relocate", False) else 0.6
        location_score = mode_score * 0.6 + relocate_score * 0.4

        availability_score = extract_availability_score(signals)

        # 2. Raw Weighted Score (0.0 to 1.0)
        raw_score = (
            skills_score * self.weights["skills"] +
            experience_score * self.weights["experience"] +
            evidence_score * self.weights["evidence"] +
            location_score * self.weights["location"] +
            availability_score * self.weights["availability"]
        )

        # 3. Apply Detectors and Penalties
        ks_mult, ks_reason, ks_flag = self.keyword_detector.evaluate(candidate)
        hp_mult, hp_reason, hp_flag = self.honeypot_detector.evaluate(candidate)

        final_multiplier = ks_mult * hp_mult
        final_score = round(raw_score * final_multiplier, 4)

        # 4. Generate Transparent Reasoning
        curr_title = profile.get("current_title", "Engineer")
        yoe = profile.get("years_of_experience", 0.0)
        github_score = max(0.0, signals.get("github_activity_score", -1))
        notice_days = signals.get("notice_period_days", 30)
        resp_rate = signals.get("recruiter_response_rate", 0.5)

        reasoning_parts = [
            f"{curr_title} with {yoe:.1f} yrs exp",
            f"{len(matched_skills)} matching skills",
            f"response rate {resp_rate:.2f}"
        ]

        if ks_flag:
            reasoning_parts.append(f"[{ks_reason}]")
        if hp_flag:
            reasoning_parts.append(f"[{hp_reason}]")

        reasoning = "; ".join(reasoning_parts) + "."

        return (final_score, cid, reasoning)
