import json
from urllib.request import urlopen
from urllib.parse import urlencode
from datetime import datetime, timedelta, timezone


def get_earthquake_data(latitude, longitude, radius_km=500):
    base_url = "https://earthquake.usgs.gov/fdsnws/event/1/query"

    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=7)

    params = {
        "format": "geojson",
        "latitude": latitude,
        "longitude": longitude,
        "maxradiuskm": radius_km,
        "starttime": start_time.strftime("%Y-%m-%d"),
        "endtime": end_time.strftime("%Y-%m-%d"),
        "orderby": "time"
    }

    url = base_url + "?" + urlencode(params)

    with urlopen(url, timeout=30) as response:
        data = json.loads(response.read().decode("utf-8"))

    earthquakes = []

    for event in data["features"]:
        properties = event["properties"]
        coordinates = event["geometry"]["coordinates"]

        earthquakes.append({
            "magnitude": properties["mag"],
            "place": properties["place"],
            "longitude": coordinates[0],
            "latitude": coordinates[1],
            "depth_km": coordinates[2]
        })

    return earthquakes


if __name__ == "__main__":

    # Temporary test coordinates
    latitude = 19.9975
    longitude = 73.7898

    earthquakes = get_earthquake_data(
        latitude,
        longitude
    )

    print("Recent Earthquakes")
    print("--------------------")

    if len(earthquakes) == 0:
        print("No earthquakes found in the selected area.")

    else:
        for earthquake in earthquakes:

            print(
                "Magnitude:",
                earthquake["magnitude"]
            )

            print(
                "Location:",
                earthquake["place"]
            )

            print(
                "Depth:",
                earthquake["depth_km"],
                "km"
            )

            print("--------------------")