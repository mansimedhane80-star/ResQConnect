from sos_classifier import analyze_sos


# --------------------------------------------------
# PRIORITY SCORE CALCULATION
# --------------------------------------------------

def calculate_priority_score(sos_analysis):

    score = 0

    urgency = sos_analysis["urgency"]
    vulnerabilities = sos_analysis["vulnerability"]
    required_help = sos_analysis["required_help"]


    # --------------------------------------------------
    # 1. URGENCY SCORE
    # Maximum: 50 points
    # --------------------------------------------------

    if urgency == "high":
        score += 50

    elif urgency == "medium":
        score += 30

    elif urgency == "low":
        score += 10


    # --------------------------------------------------
    # 2. VULNERABILITY SCORE
    # Maximum contribution is capped at 30
    # --------------------------------------------------

    vulnerability_points = {
        "child": 10,
        "elderly": 10,
        "pregnant": 15,
        "injured": 15,
        "trapped": 20
    }

    vulnerability_score = 0

    for vulnerability in vulnerabilities:

        vulnerability_score += vulnerability_points.get(
            vulnerability,
            0
        )

    # Prevent vulnerability from dominating the score
    vulnerability_score = min(
        vulnerability_score,
        30
    )

    score += vulnerability_score


    # --------------------------------------------------
    # 3. REQUIRED HELP SCORE
    # Maximum contribution is capped at 20
    # --------------------------------------------------

    help_points = {
        "medical": 15,
        "rescue": 15,
        "shelter": 10,
        "food": 5,
        "water": 5
    }

    help_score = 0

    for help_type in required_help:

        help_score += help_points.get(
            help_type,
            0
        )

    help_score = min(
        help_score,
        20
    )

    score += help_score


    # Final score cannot exceed 100
    return min(score, 100)


# --------------------------------------------------
# PRIORITY LEVEL
# --------------------------------------------------

def get_priority_level(score):

    if score >= 80:
        return "critical"

    elif score >= 60:
        return "high"

    elif score >= 30:
        return "medium"

    else:
        return "low"


# --------------------------------------------------
# COMPLETE SOS PRIORITY ANALYSIS
# --------------------------------------------------

def analyze_sos_priority(message):

    sos_analysis = analyze_sos(message)

    priority_score = calculate_priority_score(
        sos_analysis
    )

    priority_level = get_priority_level(
        priority_score
    )

    return {
        "disaster_type": sos_analysis["disaster_type"],
        "urgency": sos_analysis["urgency"],
        "vulnerability": sos_analysis["vulnerability"],
        "required_help": sos_analysis["required_help"],
        "priority_score": priority_score,
        "priority_level": priority_level
    }


# --------------------------------------------------
# TEST
# --------------------------------------------------

if __name__ == "__main__":

    message = (
        "Flood water has entered our house. "
        "My grandmother is trapped upstairs "
        "and she is injured. We need help."
    )

    result = analyze_sos_priority(message)

    print("RES-Q CONNECT SOS PRIORITY ANALYSIS")
    print("------------------------------------")

    print("Message:", message)
    print("Disaster Type:", result["disaster_type"])
    print("Urgency:", result["urgency"])
    print("Vulnerability:", result["vulnerability"])
    print("Required Help:", result["required_help"])
    print("Priority Score:", result["priority_score"])
    print("Priority Level:", result["priority_level"])