"""
Google Maps integration for UstaadJee.
Uses Google Maps Geocoding API to convert area names to coordinates.
Falls back to a local lookup table if API key is not set or API fails.
"""

import os
import httpx
from typing import Optional

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Fallback coordinates for common Islamabad/Lahore areas
# Used when Google Maps API is not available
AREA_COORDINATES = {
    # Islamabad F-sectors
    "f-6": {"lat": 33.7294, "lng": 73.0731},
    "f-7": {"lat": 33.7200, "lng": 73.0600},
    "f-8": {"lat": 33.7104, "lng": 73.0534},
    "f-10": {"lat": 33.6950, "lng": 73.0120},
    "f-11": {"lat": 33.6850, "lng": 73.0250},
    # Islamabad G-sectors
    "g-9": {"lat": 33.6932, "lng": 73.0356},
    "g-10": {"lat": 33.6800, "lng": 73.0100},
    "g-11": {"lat": 33.6700, "lng": 73.0000},
    "g-12": {"lat": 33.6500, "lng": 72.9900},
    "g-13": {"lat": 33.6312, "lng": 72.9765},
    "g-14": {"lat": 33.6180, "lng": 72.9650},
    "g-15": {"lat": 33.6050, "lng": 72.9500},
    # Islamabad other
    "i-8": {"lat": 33.6650, "lng": 73.0750},
    "i-9": {"lat": 33.6580, "lng": 73.0650},
    "i-10": {"lat": 33.6450, "lng": 73.0550},
    "e-7": {"lat": 33.7300, "lng": 73.0700},
    "h-13": {"lat": 33.6400, "lng": 72.9700},
    "blue area": {"lat": 33.7380, "lng": 73.0844},
    # Lahore
    "gulberg": {"lat": 31.5204, "lng": 74.3587},
    "dha": {"lat": 31.4800, "lng": 74.3700},
    "model town": {"lat": 31.4804, "lng": 74.3239},
    "johar town": {"lat": 31.4697, "lng": 74.2728},
    "garden town": {"lat": 31.5120, "lng": 74.3400},
    "bahria town": {"lat": 31.3685, "lng": 74.1800},
    "faisal town": {"lat": 31.4900, "lng": 74.2900},
    "cantt": {"lat": 31.5200, "lng": 74.3800},
}


async def geocode_area(area: str, city: str = "Islamabad") -> Optional[dict]:
    """
    Convert an area name to lat/lng coordinates.
    
    Strategy:
    1. Try Google Maps Geocoding API if API key is set
    2. Fall back to local lookup table
    
    Returns: {"lat": float, "lng": float} or None
    """
    
    # Strategy 1: Try Google Maps API
    if GOOGLE_MAPS_API_KEY:
        try:
            coords = await _google_geocode(f"{area}, {city}, Pakistan")
            if coords:
                return coords
        except Exception:
            pass  # Fall through to local lookup
    
    # Strategy 2: Local lookup
    area_key = area.lower().strip()
    if area_key in AREA_COORDINATES:
        return AREA_COORDINATES[area_key]
    
    # Try partial match (e.g., "G-13/1" should match "G-13")
    for key, coords in AREA_COORDINATES.items():
        if key in area_key or area_key in key:
            return coords
    
    return None


async def _google_geocode(address: str) -> Optional[dict]:
    """Call Google Maps Geocoding API."""
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": address,
        "key": GOOGLE_MAPS_API_KEY,
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()
        
        if data["status"] == "OK" and data["results"]:
            location = data["results"][0]["geometry"]["location"]
            return {"lat": location["lat"], "lng": location["lng"]}
    
    return None
