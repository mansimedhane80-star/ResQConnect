import json
from urllib.request import urlopen
from urllib.parse import urlencode


def get_weather_data(latitude, longitude):
    base_url = "https://api.open-meteo.com/v1/forecast"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,"
            "precipitation,"
            "rain,"
            "wind_speed_10m,"
            "wind_gusts_10m,"
            "soil_moisture_0_to_1cm"
        ),
        "timezone": "auto"
    }

    url = base_url + "?" + urlencode(params)

    with urlopen(url, timeout=10) as response:
        data = json.loads(response.read().decode("utf-8"))

    current = data["current"]

    return {
        "temperature_c": current["temperature_2m"],
        "precipitation_mm": current["precipitation"],
        "rain_mm": current["rain"],
        "wind_speed_kmh": current["wind_speed_10m"],
        "wind_gusts_kmh": current["wind_gusts_10m"],
        "soil_moisture": current["soil_moisture_0_to_1cm"]
    }


# Temporary test
if __name__ == "__main__":
    weather = get_weather_data(19.9975, 73.7898)

    print("Current Weather Data")
    print("--------------------")
    print("Temperature:", weather["temperature_c"], "°C")
    print("Precipitation:", weather["precipitation_mm"], "mm")
    print("Rain:", weather["rain_mm"], "mm")
    print("Wind Speed:", weather["wind_speed_kmh"], "km/h")
    print("Wind Gusts:", weather["wind_gusts_kmh"], "km/h")
    print("Soil Moisture:", weather["soil_moisture"], "m³/m³")