import json
from urllib.request import urlopen
from urllib.parse import urlencode


def get_flood_data(latitude, longitude):
    base_url = "https://flood-api.open-meteo.com/v1/flood"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "river_discharge",
        "forecast_days": 7
    }

    url = base_url + "?" + urlencode(params)

    with urlopen(url, timeout=10) as response:
        data = json.loads(response.read().decode("utf-8"))

    dates = data["daily"]["time"]
    discharge = data["daily"]["river_discharge"]

    return {
        "dates": dates,
        "river_discharge": discharge,
        "unit": "m³/s"
    }

def analyze_discharge_trend(discharge_values):
    valid_values = [
        value for value in discharge_values
        if value is not None
    ]

    if len(valid_values) < 2:
        return "unknown"

    first_value = valid_values[0]
    last_value = valid_values[-1]

    if last_value > first_value * 1.20:
        return "rising"

    elif last_value < first_value * 0.80:
        return "falling"

    else:
        return "stable"

# Temporary test
if __name__ == "__main__":

    latitude = 19.9975
    longitude = 73.7898

    flood_data = get_flood_data(latitude, longitude)

    print("Flood / River Data")
    print("--------------------")

    for date, discharge in zip(
        flood_data["dates"],
        flood_data["river_discharge"]
    ):
        print(date, ":", discharge, flood_data["unit"])

trend = analyze_discharge_trend(
    flood_data["river_discharge"]
)

print("\nRiver Discharge Trend:", trend)        