from weather_data import get_weather_data


def get_landslide_factors(latitude, longitude):
    weather = get_weather_data(latitude, longitude)

    return {
        "rainfall_mm": weather["precipitation_mm"],
        "soil_moisture": weather["soil_moisture"]
    }


def analyze_landslide_signal(rainfall_mm, soil_moisture):
    """
    Prototype decision-support logic.
    This is NOT an official landslide warning system.
    """

    if rainfall_mm >= 50 and soil_moisture >= 0.40:
        return "high"

    elif rainfall_mm >= 20 or soil_moisture >= 0.30:
        return "medium"

    else:
        return "low"


if __name__ == "__main__":

    # Temporary test coordinates
    latitude = 19.9975
    longitude = 73.7898

    factors = get_landslide_factors(
        latitude,
        longitude
    )

    signal = analyze_landslide_signal(
        factors["rainfall_mm"],
        factors["soil_moisture"]
    )

    print("Landslide Analysis")
    print("--------------------")
    print("Rainfall:", factors["rainfall_mm"], "mm")
    print(
        "Soil Moisture:",
        factors["soil_moisture"],
        "m³/m³"
    )
    print("Landslide Signal:", signal)