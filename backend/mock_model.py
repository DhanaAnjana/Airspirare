"""
mock_model.py
-------------
A single function, run_inference(), that mimics what a trained ML model would
do: it takes a sensor payload dict and returns (aqi, source_scores).

Every piece of logic here is a placeholder.  In production each section
marked # MOCK would be replaced by a real model prediction.
"""

# MOCK — The 15 pollutant sources the system tracks.
SOURCES = [
    "Traffic Emissions",
    "Construction Dust",
    "Industrial Emissions",
    "Biomass Burning",
    "Crop Residue Burning",
    "Waste Burning",
    "Diesel Generators",
    "Road Dust",
    "Coal Combustion",
    "Chemical Plants",
    "Brick Kilns",
    "Firecrackers",
    "Paint and Solvent Fumes",
    "Garbage Dumps",
    "Power Plants",
]


def run_inference(sensor: dict) -> tuple[int, dict[str, float]]:
    """
    MOCK — would be replaced by a real trained model in production.

    Returns
    -------
    aqi : int
        A single Air Quality Index value (0-500 scale).
    source_scores : dict[str, float]
        Confidence % for each of the 15 sources, summing to 100.
    """

    pm2_5 = sensor.get("pm2_5", 0)
    pm10 = sensor.get("pm10", 0)
    co_ppm = sensor.get("co_ppm", 0)
    mq135 = sensor.get("mq135_air_quality", 0)
    gas_res = sensor.get("gas_resistance", 50000)

    # ---- MOCK AQI calculation ----
    # Simple weighted formula; a real model would use a trained regressor.
    aqi = int(pm2_5 * 2.5 + pm10 * 0.8 + co_ppm * 10)
    aqi = max(0, min(aqi, 500))  # clamp to 0-500

    # ---- MOCK source confidence scores ----
    # Each source starts with a small base weight.  Sensor values push
    # certain sources higher.  Weights are then normalised to sum to 100%.
    raw = {s: 1.0 for s in SOURCES}  # base weight for every source

    # High CO + PM2.5 → traffic / diesel generators
    if co_ppm > 4:
        raw["Traffic Emissions"] += co_ppm * 3
        raw["Diesel Generators"] += co_ppm * 1.5

    # High PM10 → construction dust / road dust
    if pm10 > 80:
        raw["Construction Dust"] += pm10 * 0.4
        raw["Road Dust"] += pm10 * 0.3

    # High MQ-135 reading → industrial / chemical sources
    if mq135 > 200:
        raw["Industrial Emissions"] += mq135 * 0.1
        raw["Chemical Plants"] += mq135 * 0.08

    # Low gas resistance → biomass / waste burning (VOC-heavy)
    if gas_res < 30000:
        raw["Biomass Burning"] += (30000 - gas_res) * 0.001
        raw["Waste Burning"] += (30000 - gas_res) * 0.0008

    # High PM2.5 alone → crop residue burning / coal combustion
    if pm2_5 > 100:
        raw["Crop Residue Burning"] += pm2_5 * 0.15
        raw["Coal Combustion"] += pm2_5 * 0.1

    # Moderate pollution bump for remaining sources so they aren't all zero.
    if aqi > 150:
        raw["Brick Kilns"] += 3
        raw["Firecrackers"] += 2
        raw["Paint and Solvent Fumes"] += 2
        raw["Garbage Dumps"] += 2
        raw["Power Plants"] += 3

    # ---- Normalise to exactly 100% ----
    total = sum(raw.values())
    source_scores = {s: round(w / total * 100, 2) for s, w in raw.items()}

    # Fix floating-point drift so the sum is exactly 100.
    diff = 100.0 - sum(source_scores.values())
    top_source = max(source_scores, key=source_scores.get)
    source_scores[top_source] = round(source_scores[top_source] + diff, 2)

    return aqi, source_scores
