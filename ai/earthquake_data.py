import json
from urllib.request import urlopen
from urllib.parse import urlencode
from datetime import datetime, timedelta, timezone
from math import radians, sin, cos, sqrt, atan2


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
def calculate_distance(lat1, lon1, lat2, lon2):
    earth_radius_km = 6371

    lat1 = radians(lat1)
    lon1 = radians(lon1)
    lat2 = radians(lat2)
    lon2 = radians(lon2)

    difference_lat = lat2 - lat1
    difference_lon = lon2 - lon1

    a = (
        sin(difference_lat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(difference_lon / 2) ** 2
    )

    c = 2 * atan2(
        sqrt(a),
        sqrt(1 - a)
    )

    return earth_radius_km * c

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