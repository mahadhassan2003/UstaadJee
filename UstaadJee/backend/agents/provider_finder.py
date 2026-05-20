"""
Agent 2: Provider Finder
Searches the mock database for providers matching the extracted service and location.
Uses Google Maps geocoding (with fallback) to get user coordinates.
"""

import time
import json
import asyncio
from agents.state import UstaadState
from database import find_providers
from maps import geocode_area, AREA_COORDINATES


def find_providers_node(state: UstaadState) -> dict:
    """
    Agent 2 Node: Find matching providers from the database.
    """
    start = time.time()

    service_type = state["service_type"]
    city = state["location_city"]
    area = state["location_area"]

    # Get user coordinates for distance calculation
    # Run the async geocode function synchronously
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, use the fallback directly
            coords = AREA_COORDINATES.get(area.lower().strip())
        else:
            coords = loop.run_until_complete(geocode_area(area, city))
    except RuntimeError:
        coords = AREA_COORDINATES.get(area.lower().strip())

    # Default to Islamabad center if no coordinates found
    if not coords:
        coords = {"lat": 33.6844, "lng": 73.0479}

    user_lat = coords["lat"]
    user_lng = coords["lng"]

    # Search database
    providers = find_providers(service_type, city, area)

    # If no providers found in specific area, try city-wide
    if not providers:
        providers = find_providers(service_type, city)

    duration = int((time.time() - start) * 1000)

    return {
        "user_lat": user_lat,
        "user_lng": user_lng,
        "providers_found": providers,
        "current_step": "providers_found",
        "agent_trace": [{
            "agent": "ProviderFinder",
            "action": f"Searched for '{service_type}' in {area}, {city}",
            "duration_ms": duration,
            "output": f"Found {len(providers)} providers. User coords: ({user_lat}, {user_lng})",
        }],
    }
