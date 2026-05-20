"""
Mock database layer for UstaadJee.
Loads provider data from the local JSON file.
Can be swapped to Firestore later without changing any other code.
"""

import json
import os
import math
from typing import Optional

DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "mock_providers.json")

_data = None

def _load_data():
    global _data
    if _data is None:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            _data = json.load(f)
    return _data


def get_all_categories():
    """Return all service categories."""
    return _load_data()["service_categories"]


def get_all_providers():
    """Return all providers."""
    return _load_data()["providers"]


def find_providers(service_type: str, city: str, area: Optional[str] = None):
    """
    Find providers matching a service type and city.
    Optionally filter by area served.
    """
    providers = get_all_providers()
    results = []

    for p in providers:
        # Check if provider offers this service
        if service_type not in p["services"]:
            continue
        # Check if provider is in the right city
        if p["city"].lower() != city.lower():
            continue
        # If area specified, check if provider serves that area
        if area:
            area_match = any(
                area.lower() in a.lower() for a in p["areas_served"]
            )
            if not area_match:
                continue
        results.append(p)

    return results


def _haversine_distance(lat1, lng1, lat2, lng2):
    """Calculate distance between two points in km."""
    R = 6371  # Earth radius in km
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return round(R * c, 1)


def rank_providers(providers: list, user_lat: float, user_lng: float):
    """
    Rank providers by a weighted score:
    - rating (40%)
    - inverse distance (30%)
    - completed_jobs as proxy for reliability (20%)
    - verified bonus (10%)
    """
    scored = []
    for p in providers:
        p_lat = p["base_location"]["lat"]
        p_lng = p["base_location"]["lng"]
        distance = _haversine_distance(user_lat, user_lng, p_lat, p_lng)

        # Normalize scores to 0-10 range
        rating_score = (p["rating"] / 5.0) * 10
        distance_score = max(0, 10 - distance)  # Closer = higher
        jobs_score = min(10, p["completed_jobs"] / 100)
        verified_score = 10 if p["verified"] else 0

        total_score = (
            rating_score * 0.4 +
            distance_score * 0.3 +
            jobs_score * 0.2 +
            verified_score * 0.1
        )

        scored.append({
            **p,
            "distance_km": distance,
            "match_score": round(total_score, 2)
        })

    # Sort by score descending
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored


import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "ustaadjee_chat.db")

def _init_chat_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS frontend_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                message_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id TEXT UNIQUE,
                booking_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

_init_chat_db()

def save_booking(booking: dict):
    """Save a booking to the database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO bookings (booking_id, booking_json) VALUES (?, ?)",
            (booking["booking_id"], json.dumps(booking))
        )
        conn.commit()
    return booking

def get_booking(booking_id: str):
    """Retrieve a booking by ID."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT booking_json FROM bookings WHERE booking_id = ?", (booking_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row[0])
    return None

def get_all_bookings():
    """Return all bookings."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT booking_json FROM bookings ORDER BY id DESC")
        return [json.loads(row[0]) for row in cursor.fetchall()]

# ---- Persistent Chat History ----

def save_frontend_message(session_id: str, message_dict: dict):
    """Saves a single frontend message object to the database."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO frontend_messages (session_id, message_json) VALUES (?, ?)",
            (session_id, json.dumps(message_dict))
        )
        conn.commit()

def get_frontend_history(session_id: str):
    """Retrieves all frontend messages for a session."""
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute(
            "SELECT message_json FROM frontend_messages WHERE session_id = ? ORDER BY id ASC",
            (session_id,)
        )
        return [json.loads(row[0]) for row in cursor.fetchall()]

def get_all_sessions():
    """Retrieve a list of all distinct chat sessions."""
    with sqlite3.connect(DB_PATH) as conn:
        # Group by session_id and get the first message text to use as title
        cursor = conn.execute('''
            SELECT session_id, MIN(created_at) as created_at, message_json 
            FROM frontend_messages 
            WHERE session_id != 'default'
            GROUP BY session_id 
            ORDER BY created_at DESC
        ''')
        sessions = []
        for row in cursor.fetchall():
            try:
                msg = json.loads(row[2])
                text = msg.get("text", "New Chat")
            except:
                text = "New Chat"
            sessions.append({
                "session_id": row[0],
                "created_at": row[1],
                "title": text[:25] + "..." if len(text) > 25 else text
            })
        return sessions

def clear_chat_history(session_id: str):
    """Clears history for testing purposes."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM frontend_messages WHERE session_id = ?", (session_id,))
        conn.commit()
