from weather_data import get_weather_data


def analyze_risk(disaster_type, weather):
    disaster_type = disaster_type.lower()

    # Heavy Rainfall Risk
    if disaster_type == "heavy_rainfall":
        rainfall = weather["precipitation_mm"]

        if rainfall >= 150:
            return "high"
        elif rainfall >= 70:
            return "medium"
        else:
            return "low"

    # Heatwave Risk
    elif disaster_type == "heatwave":
        temperature = weather["temperature_c"]

        if temperature >= 45:
            return "high"
        elif temperature >= 40:
            return "medium"
        else:
            return "low"

    # Cyclone Risk
    elif disaster_type == "cyclone":
        wind_speed = weather["wind_speed_kmh"]

        if wind_speed >= 120:
            return "high"
        elif wind_speed >= 60:
            return "medium"
        else:
            return "low"

    return "unknown"


if __name__ == "__main__":

    # Temporary test coordinates
    latitude = 19.9975
    longitude = 73.7898

    weather = get_weather_data(latitude, longitude)

    print("Weather:", weather)

    print("\nRisk Analysis")
    print("--------------------")

    print("Heavy Rainfall:", analyze_risk("heavy_rainfall", weather))
    print("Heatwave:", analyze_risk("heatwave", weather))
    print("Cyclone:", analyze_risk("cyclone", weather))