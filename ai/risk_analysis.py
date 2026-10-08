from urllib.error import URLError

from weather_data import get_weather_data
from flood_data import get_flood_data, analyze_discharge_trend
from landslide_data import get_landslide_factors, analyze_landslide_signal
from earthquake_data import (
    get_earthquake_data,
    calculate_distance
)


# --------------------------------------------------
# WEATHER-BASED RISK ANALYSIS
# --------------------------------------------------

def analyze_weather_risk(disaster_type, weather):

    disaster_type = disaster_type.lower()

    # Heavy Rainfall
    if disaster_type == "heavy_rainfall":

        rainfall = weather["daily_rainfall_mm"]

        if rainfall >= 150:
            return "high"

        elif rainfall >= 70:
            return "medium"

        else:
            return "low"

    # Heatwave
    elif disaster_type == "heatwave":

        temperature = weather["daily_max_temperature_c"]

        if temperature >= 45:
            return "high"

        elif temperature >= 40:
            return "medium"

        else:
            return "low"

    # Cyclone / Strong Wind
    elif disaster_type == "cyclone":

        wind_speed = weather["wind_speed_kmh"]
        wind_gusts = weather["wind_gusts_kmh"]

        if wind_speed >= 120 or wind_gusts >= 150:
            return "high"

        elif wind_speed >= 60 or wind_gusts >= 90:
            return "medium"

        else:
            return "low"

    return "unknown"


# --------------------------------------------------
# CENTRAL RISK ANALYSIS FUNCTION
# --------------------------------------------------

def analyze_risk(disaster_type, latitude, longitude):

    disaster_type = disaster_type.lower()

    try:

        # ------------------------------------------
        # WEATHER-BASED DISASTERS
        # ------------------------------------------

        if disaster_type in [
            "heavy_rainfall",
            "heatwave",
            "cyclone"
        ]:

            weather = get_weather_data(
                latitude,
                longitude
            )

            return analyze_weather_risk(
                disaster_type,
                weather
            )

        # ------------------------------------------
        # FLOOD
        # ------------------------------------------

        elif disaster_type == "flood":

            flood_data = get_flood_data(
                latitude,
                longitude
            )

            trend = analyze_discharge_trend(
                flood_data["river_discharge"]
            )

            if trend == "rising":
                return "medium"

            elif trend in ["stable", "falling"]:
                return "low"

            else:
                return "unknown"

        # ------------------------------------------
        # LANDSLIDE
        # ------------------------------------------

        elif disaster_type == "landslide":

            factors = get_landslide_factors(
                latitude,
                longitude
            )

            return analyze_landslide_signal(
                factors["rainfall_mm"],
                factors["soil_moisture"]
            )

        # ------------------------------------------
        # EARTHQUAKE
        # ------------------------------------------

        elif disaster_type == "earthquake":

            earthquakes = get_earthquake_data(
                latitude,
                longitude
            )

            if len(earthquakes) == 0:
                return "low"

            highest_risk = "low"

            for earthquake in earthquakes:

                magnitude = earthquake["magnitude"]

                if magnitude is None:
                    continue

                distance = calculate_distance(
                    latitude,
                    longitude,
                    earthquake["latitude"],
                    earthquake["longitude"]
                )

                # Prototype magnitude + distance logic
                if magnitude >= 6.0 and distance <= 300:
                    return "high"

                elif magnitude >= 4.0 and distance <= 150:
                    highest_risk = "medium"

            return highest_risk

        # Invalid disaster type
        return "unknown"


    # --------------------------------------------------
    # API / INTERNET FAILURE HANDLING
    # --------------------------------------------------

    except (URLError, TimeoutError) as error:

        print(
            f"[WARNING] Data source unavailable for "
            f"{disaster_type}: {error}"
        )

        return "data_unavailable"


    except Exception as error:

        print(
            f"[ERROR] Could not analyze "
            f"{disaster_type}: {error}"
        )

        return "data_unavailable"


# --------------------------------------------------
# TEST ALL SIX DISASTER TYPES
# --------------------------------------------------

if __name__ == "__main__":

    # Temporary test coordinates
    latitude = 19.9975
    longitude = 73.7898

    disaster_types = [
        "flood",
        "landslide",
        "cyclone",
        "heatwave",
        "heavy_rainfall",
        "earthquake"
    ]

    print("RES-Q CONNECT AI RISK ANALYSIS")
    print("--------------------------------")

    for disaster in disaster_types:

        risk = analyze_risk(
            disaster,
            latitude,
            longitude
        )

        print(
            disaster,
            "->",
            risk
        )