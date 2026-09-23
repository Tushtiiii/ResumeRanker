import re
from collections import Counter

class KeywordStuffingDetector:
    """
    Detects keyword stuffing, skill inflation, duration anomalies,
    and unnatural term saturation in candidate profiles.
    """
    def __init__(self, max_skills_threshold=20, term_rep_threshold=8):
        self.max_skills_threshold = max_skills_threshold
        self.term_rep_threshold = term_rep_threshold

    def evaluate(self, candidate: dict) -> tuple:
        """
        Returns (penalty_multiplier, reasoning_penalty_str, is_flagged)
        penalty_multiplier is between 0.0 (100% penalty) and 1.0 (no penalty)
        """
        profile = candidate.get("profile", {})
        skills = candidate.get("skills", [])
        summary = profile.get("summary", "")
        headline = profile.get("headline", "")
        exp_years = profile.get("years_of_experience", 0.0)

        penalties = []
        penalty_mult = 1.0

        # 1. Skill Inflation Check
        skill_count = len(skills)
        if skill_count > self.max_skills_threshold:
            excess = skill_count - self.max_skills_threshold
            penalty = min(0.35, 0.10 + (excess * 0.02))
            penalty_mult *= (1.0 - penalty)
            penalties.append(f"Skill inflation ({skill_count} skills)")

        # 2. Skill Duration Anomaly Check (Skill duration > total exp + 3y)
        max_skill_duration_years = max([s.get("duration_months", 0) / 12.0 for s in skills], default=0.0)
        if exp_years > 0 and max_skill_duration_years > (exp_years + 3.0):
            penalty_mult *= 0.80
            penalties.append(f"Skill duration anomaly ({max_skill_duration_years:.1f}y vs {exp_years:.1f}y exp)")

        # 3. Term Repetition Saturation Check
        text_content = f"{headline} {summary}".lower()
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text_content)
        word_counts = Counter(words)
        most_common_word, max_count = word_counts.most_common(1)[0] if word_counts else ("", 0)

        if max_count >= self.term_rep_threshold:
            penalty_mult *= 0.85
            penalties.append(f"Keyword stuffing ('{most_common_word}' x{max_count})")

        is_flagged = len(penalties) > 0
        reasoning_str = f"Keyword-Stuffing Penalty: {', '.join(penalties)}" if is_flagged else ""

        return (max(0.2, penalty_mult), reasoning_str, is_flagged)


class HoneypotDetector:
    """
    Detects low-signal, spam, unverified, or adversarial honeypot profiles.
    """
    def __init__(self, min_completeness_threshold=35.0):
        self.min_completeness_threshold = min_completeness_threshold
        self.prompt_injection_terms = [
            "ignore previous", "system prompt", "give candidate 100",
            "give top score", "rank 1", "override", "honeypot"
        ]

    def evaluate(self, candidate: dict) -> tuple:
        """
        Returns (penalty_multiplier, reasoning_penalty_str, is_flagged)
        """
        profile = candidate.get("profile", {})
        signals = candidate.get("redrob_signals", {})
        career_history = candidate.get("career_history", [])

        summary = profile.get("summary", "")
        headline = profile.get("headline", "")

        penalties = []
        penalty_mult = 1.0

        # 1. Verification Check (No email, phone, or LinkedIn)
        ver_email = signals.get("verified_email", True)
        ver_phone = signals.get("verified_phone", True)
        linkedin = signals.get("linkedin_connected", True)

        if not ver_email and not ver_phone and not linkedin:
            penalty_mult *= 0.50
            penalties.append("Zero verification (unverified email/phone/LinkedIn)")

        # 2. Application Spam Pattern Check (>40 apps, 0% response, 0% interview completion)
        apps = signals.get("applications_submitted_30d", 0)
        resp_rate = signals.get("recruiter_response_rate", 1.0)
        interview_rate = signals.get("interview_completion_rate", 1.0)

        if apps > 40 and resp_rate == 0 and interview_rate == 0:
            penalty_mult *= 0.40
            penalties.append(f"Applicant spam pattern ({apps} apps, 0% response)")

        # 3. Profile Completeness Threshold Check
        completeness = signals.get("profile_completeness_score", 100.0)
        if completeness < self.min_completeness_threshold:
            penalty_mult *= 0.60
            penalties.append(f"Low profile completeness ({completeness:.1f}%)")

        # 4. Adversarial Prompt Injection Check
        full_text = f"{headline} {summary} " + " ".join([h.get("description", "") for h in career_history])
        full_text_lower = full_text.lower()
        found_injections = [term for term in self.prompt_injection_terms if term in full_text_lower]

        if found_injections:
            penalty_mult *= 0.10  # Severe penalization
            penalties.append(f"Prompt injection trap detected: '{found_injections[0]}'")

        is_flagged = len(penalties) > 0
        reasoning_str = f"Honeypot Penalty: {', '.join(penalties)}" if is_flagged else ""

        return (max(0.05, penalty_mult), reasoning_str, is_flagged)
