
# --------------------------------------------------
# RES-Q CONNECT SOS MESSAGE CLASSIFIER
# --------------------------------------------------


def normalize_message(message):
    """Convert the SOS message into searchable lowercase text."""
    if not message:
        return ""

    return " ".join(str(message).lower().split())


# --------------------------------------------------
# DISASTER CLASSIFICATION
# --------------------------------------------------

def classify_disaster(message):

    message = normalize_message(message)

    disaster_keywords = {

        "flood": [
            "flood",
            "flooding",
            "water entered",
            "water rising",
            "rising water",
            "water level is rising",
            "submerged",
            "overflow",
            "waterlogged"
        ],

        "landslide": [
            "landslide",
            "mudslide",
            "soil sliding",
            "rocks falling",
            "hill collapsed",
            "debris flow"
        ],

        "cyclone": [
            "cyclone",
            "strong wind",
            "strong winds",
            "heavy wind",
            "heavy winds",
            "storm wind",
            "roof blown",
            "roof blown away"
        ],

        "heatwave": [
            "heatwave",
            "extreme heat",
            "very hot",
            "heat stroke",
            "heatstroke",
            "dehydration due to heat"
        ],

        "heavy_rainfall": [
            "heavy rain",
            "heavy rainfall",
            "continuous rain",
            "raining heavily",
            "heavy rains",
            "continuous rainfall"
        ],

        "earthquake": [
            "earthquake",
            "tremor",
            "ground shaking",
            "building shaking",
            "earth tremor",
            "seismic activity"
        ]
    }

    scores = {}

    for disaster_type, keywords in disaster_keywords.items():

        score = 0

        for keyword in keywords:
            if keyword in message:
                score += 1

        scores[disaster_type] = score

    highest_score = max(scores.values())

    if highest_score == 0:
        return "unknown"

    return max(scores, key=scores.get)


# --------------------------------------------------
# URGENCY DETECTION
# --------------------------------------------------

def detect_urgency(message):

    message = normalize_message(message)

    high_urgency_keywords = [
        "trapped",
        "injured",
        "injury",
        "head injury",
        "leg injury",
        "unconscious",
        "bleeding",
        "cannot breathe",
        "can't breathe",
        "unable to breathe",
        "collapsed",
        "drowning",
        "life threatening",
        "life-threatening",
        "immediate help",
        "immediate danger",
        "urgent help",
        "urgently need",
        "urgently",
        "emergency rescue",
        "unable to escape",
        "cannot escape",
        "rapidly rising water",
        "water level is rising rapidly"
    ]

    medium_urgency_keywords = [
        "need help",
        "stuck",
        "stranded",
        "water rising",
        "road blocked",
        "road is blocked",
        "roads are blocked",
        "blocked road",
        "power cut",
        "unable to move",
        "cannot move",
        "cannot walk",
        "unable to walk",
        "evacuation required"
    ]

    for keyword in high_urgency_keywords:
        if keyword in message:
            return "high"

    for keyword in medium_urgency_keywords:
        if keyword in message:
            return "medium"

    return "low"


# --------------------------------------------------
# VULNERABILITY DETECTION
# --------------------------------------------------

def detect_vulnerability(message):

    message = normalize_message(message)

    vulnerability_keywords = {

        "child": [
            "child",
            "children",
            "baby",
            "babies",
            "infant",
            "infants",
            "toddler",
            "toddlers"
        ],

        "elderly": [
            "elderly",
            "old person",
            "old man",
            "old woman",
            "grandmother",
            "grandfather",
            "senior citizen",
            "senior citizens"
        ],

        "pregnant": [
            "pregnant",
            "pregnancy"
        ],

        "injured": [
            "injured",
            "injury",
            "injuries",
            "bleeding",
            "wounded",
            "hurt",
            "fracture",
            "fractured"
        ],

        "trapped": [
            "trapped",
            "stuck",
            "unable to escape",
            "cannot escape",
            "pinned under",
            "buried under"
        ],

        "mobility_limited": [
            "unable to move",
            "cannot move",
            "can't move",
            "unable to walk",
            "cannot walk",
            "can't walk",
            "mobility issues",
            "mobility problems",
            "limited mobility",
            "difficulty walking",
            "cannot stand",
            "unable to stand",
            "wheelchair"
        ],

        "disabled": [
            "person with a disability",
            "person with disabilities",
            "people with disabilities",
            "disabled person",
            "disabled people"
        ]
    }

    detected = []

    for vulnerability, keywords in vulnerability_keywords.items():

        for keyword in keywords:

            if keyword in message:
                detected.append(vulnerability)
                break

    return detected


# --------------------------------------------------
# REQUIRED HELP DETECTION
# --------------------------------------------------

def detect_required_help(message):

    message = normalize_message(message)

    help_keywords = {

        "medical": [
            "medical",
            "ambulance",
            "injured",
            "injury",
            "injuries",
            "bleeding",
            "unconscious",
            "head injury",
            "leg injury",
            "fracture",
            "first aid",
            "medical assistance",
            "medical help",
            "doctor",
            "hospital"
        ],

        "rescue": [
            "rescue",
            "trapped",
            "stuck",
            "drowning",
            "search and rescue",
            "search-rescue",
            "unable to escape",
            "cannot escape",
            "evacuation support"
        ],

        "food": [
            "food",
            "hungry",
            "food supplies",
            "food distribution"
        ],

        "water": [
            "drinking water",
            "no water",
            "thirsty",
            "water supplies"
        ],

        "shelter": [
            "shelter",
            "homeless",
            "house destroyed",
            "home destroyed",
            "temporary shelter",
            "evacuation shelter"
        ]
    }

    detected = []

    for help_type, keywords in help_keywords.items():

        for keyword in keywords:

            if keyword in message:
                detected.append(help_type)
                break

    return detected


# --------------------------------------------------
# COMPLETE SOS ANALYSIS
# --------------------------------------------------

def analyze_sos(message):

    return {
        "disaster_type": classify_disaster(message),
        "urgency": detect_urgency(message),
        "vulnerability": detect_vulnerability(message),
        "required_help": detect_required_help(message)
    }


# --------------------------------------------------
# TEST MULTIPLE SOS MESSAGES
# --------------------------------------------------

if __name__ == "__main__":

    test_messages = [

        "Flood water is rising inside our house. "
        "Two children are trapped upstairs.",

        "There was an earthquake. A person has a head injury "
        "and needs an ambulance.",

        "Continuous heavy rain since morning and "
        "the road is blocked.",

        "Strong winds have damaged our house "
        "and we need shelter.",

        "A landslide has blocked the road. "
        "Several people are stuck.",

        "An elderly man collapsed because of extreme heat.",

        "Please help us, we are trapped.",

        "A strong earthquake has struck our residential area. "
        "Part of a three-storey building has collapsed, and "
        "around 6 people are trapped under the damaged structure. "
        "One person has a head injury, and another person is "
        "unable to move due to a leg injury. We urgently need "
        "a search and rescue team, an ambulance, medical assistance "
        "and evacuation support."
    ]

    print("RES-Q CONNECT SOS CLASSIFIER TEST")
    print("================================")

    for number, message in enumerate(test_messages, start=1):

        result = analyze_sos(message)

        print(f"\nTEST {number}")
        print("--------------------------------")
        print("Message:", message)
        print("Disaster Type:", result["disaster_type"])
        print("Urgency:", result["urgency"])
        print("Vulnerability:", result["vulnerability"])
        print("Required Help:", result["required_help"])
