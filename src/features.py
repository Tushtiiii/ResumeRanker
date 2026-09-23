import math
import re

SENIORITY_MAP = {
    "cto": 5, "vp": 5, "director": 5, "head": 5, "principal": 4, "lead": 4, "staff": 4,
    "architect": 4, "senior": 3, "mid": 2, "engineer": 2, "developer": 2, "analyst": 2,
    "associate": 1, "junior": 1, "intern": 0
}

EDUCATION_TIER_WEIGHTS = {
    "tier_1": 1.0,
    "tier_2": 0.8,
    "tier_3": 0.6,
    "tier_4": 0.4,
    "unknown": 0.3
}

PROFICIENCY_MULTIPLIERS = {
    "expert": 1.0,
    "advanced": 0.85,
    "intermediate": 0.6,
    "beginner": 0.3
}


def extract_skills_score(candidate_skills: list, target_required_skills: list, skill_assessments: dict) -> tuple:
    """
    Computes candidate skill coverage and proficiency score.
    Returns (skill_score, matched_skills_list)
    """
    if not target_required_skills:
        return 1.0, []

    cand_skill_map = {}
    for s in candidate_skills:
        name = s.get("name", "").lower().strip()
        if name:
            cand_skill_map[name] = s

    matched_skills = []
    total_skill_weight = 0.0

    for req in target_required_skills:
        req_lower = req.lower().strip()
        matched_item = None

        if req_lower in cand_skill_map:
            matched_item = cand_skill_map[req_lower]
        else:
            for sname, sinfo in cand_skill_map.items():
                if req_lower in sname or sname in req_lower:
                    matched_item = sinfo
                    break

        if matched_item:
            matched_skills.append(req_lower)
            prof = matched_item.get("proficiency", "intermediate").lower()
            prof_mult = PROFICIENCY_MULTIPLIERS.get(prof, 0.5)
            duration_months = matched_item.get("duration_months", 0)
            dur_bonus = min(duration_months / 60.0, 0.5)
            total_skill_weight += (prof_mult + dur_bonus)

    skill_coverage = len(matched_skills) / max(len(target_required_skills), 1)
    avg_weighted_skill = (total_skill_weight / max(len(target_required_skills), 1))

    assessment_bonus = 0.0
    if skill_assessments:
        avg_score = sum(skill_assessments.values()) / max(len(skill_assessments), 1)
        assessment_bonus = (avg_score / 100.0) * 0.2

    final_skills_score = min(1.0, (skill_coverage * 0.7 + avg_weighted_skill * 0.3) + assessment_bonus)
    return final_skills_score, matched_skills


def extract_experience_score(profile: dict, target_yoe_min: float = 5.0, target_yoe_max: float = 10.0) -> float:
    """
    Calculates experience duration match and title seniority score.
    """
    yoe = profile.get("years_of_experience", 0.0)
    if target_yoe_min <= yoe <= target_yoe_max:
        yoe_score = 1.0
    elif yoe < target_yoe_min:
        yoe_score = max(0.0, 1.0 - (target_yoe_min - yoe) * 0.2)
    else:
        yoe_score = max(0.6, 1.0 - (yoe - target_yoe_max) * 0.04)

    curr_title = profile.get("current_title", "").lower()
    seniority_rank = 2
    for kw, rank in SENIORITY_MAP.items():
        if kw in curr_title:
            seniority_rank = rank
            break

    seniority_score = min(1.0, seniority_rank / 4.0)
    return yoe_score * 0.7 + seniority_score * 0.3


def extract_prestige_and_evidence_score(candidate: dict) -> float:
    """
    Aggregates education tier, github activity, verifications, and recruiter interest.
    """
    signals = candidate.get("redrob_signals", {})
    education_list = candidate.get("education", [])

    github_activity = signals.get("github_activity_score", -1)
    github_score = max(0.0, github_activity) / 100.0 if github_activity >= 0 else 0.4

    edu_score = 0.3
    if education_list:
        tiers = [EDUCATION_TIER_WEIGHTS.get(e.get("tier", "unknown"), 0.3) for e in education_list]
        edu_score = max(tiers)

    verifications = (
        (1.0 if signals.get("verified_email") else 0.0) +
        (1.0 if signals.get("verified_phone") else 0.0) +
        (1.0 if signals.get("linkedin_connected") else 0.0)
    ) / 3.0

    recruiter_interest = min(1.0, signals.get("saved_by_recruiters_30d", 0) / 10.0)
    interview_rate = signals.get("interview_completion_rate", 0.5)

    return (
        github_score * 0.35 +
        edu_score * 0.25 +
        verifications * 0.15 +
        recruiter_interest * 0.15 +
        interview_rate * 0.10
    )


def extract_availability_score(signals: dict) -> float:
    """
    Computes candidate availability, notice period, and recruiter response rates.
    """
    open_to_work = 1.0 if signals.get("open_to_work_flag", True) else 0.4
    notice_days = signals.get("notice_period_days", 30)
    notice_score = max(0.0, 1.0 - (notice_days / 90.0))

    response_rate = signals.get("recruiter_response_rate", 0.5)
    resp_time_hrs = signals.get("avg_response_time_hours", 24.0)
    resp_time_score = max(0.0, 1.0 - (resp_time_hrs / 72.0))

    return (
        open_to_work * 0.35 +
        notice_score * 0.30 +
        response_rate * 0.20 +
        resp_time_score * 0.15
    )
