# --------------------------------------------------
# RES-Q CONNECT SOS MESSAGE CLASSIFIER
# --------------------------------------------------


def classify_disaster(message):

    message = message.lower()

    disaster_keywords = {

        "flood": [
            "flood",
            "flooding",
            "water entered",
            "water rising",
            "submerged",
            "overflow"
        ],

        "landslide": [
            "landslide",
            "mudslide",
            "soil sliding",
            "rocks falling",
            "hill collapsed"
        ],

        "cyclone": [
            "cyclone",
            "strong wind",
            "heavy wind",
            "storm wind",
            "roof blown"
        ],

        "heatwave": [
            "heatwave",
            "extreme heat",
            "very hot",
            "heat stroke",
            "heatstroke"
        ],

        "heavy_rainfall": [
            "heavy rain",
            "heavy rainfall",
            "continuous rain",
            "raining heavily"
        ],

        "earthquake": [
            "earthquake",
            "tremor",
            "ground shaking",
            "building shaking"
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


    detected_disaster = max(
        scores,
        key=scores.get
    )

    return detected_disaster
# --------------------------------------------------
# URGENCY DETECTION
# --------------------------------------------------

def detect_urgency(message):

    message = message.lower()

    high_urgency_keywords = [
        "trapped",
        "injured",
        "unconscious",
        "bleeding",
        "can't breathe",
        "cannot breathe",
        "collapsed",
        "drowning",
        "life threatening",
        "immediate help"
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
        "power cut"
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

    message = message.lower()

    vulnerability_keywords = {

        "child": [
            "child",
            "children",
            "baby",
            "infant"
        ],

        "elderly": [
            "elderly",
            "old person",
            "grandmother",
            "grandfather"
        ],

        "pregnant": [
            "pregnant",
            "pregnancy"
        ],

        "injured": [
            "injured",
            "bleeding",
            "wounded"
        ],

        "trapped": [
            "trapped",
            "stuck"
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

    message = message.lower()

    help_keywords = {

        "medical": [
            "medical",
            "ambulance",
            "injured",
            "bleeding",
            "unconscious",
            "collapse",
            "collapsed"
        ],

        "rescue": [
            "rescue",
            "trapped",
            "stuck",
            "drowning"
        ],

        "food": [
            "food",
            "hungry"
        ],

        "water": [
            "drinking water",
            "no water",
            "thirsty"
        ],

        "shelter": [
            "shelter",
            "homeless",
            "house destroyed",
            "home destroyed"
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

        "There was an earthquake. A person is injured "
        "and needs an ambulance.",

        "Continuous heavy rain since morning and "
        "the road is blocked.",

        "Strong winds have damaged our house "
        "and we need shelter.",

        "A landslide has blocked the road. "
        "Several people are stuck.",

        "An elderly man collapsed because of extreme heat.",

        "Please help us, we are trapped."
    ]

    print("RES-Q CONNECT SOS CLASSIFIER TEST")
    print("================================")

    for number, message in enumerate(
        test_messages,
        start=1
    ):

        result = analyze_sos(message)

        print(f"\nTEST {number}")
        print("--------------------------------")
        print("Message:", message)
        print(
            "Disaster Type:",
            result["disaster_type"]
        )
        print(
            "Urgency:",
            result["urgency"]
        )
        print(
            "Vulnerability:",
            result["vulnerability"]
        )
        print(
            "Required Help:",
            result["required_help"]
        )