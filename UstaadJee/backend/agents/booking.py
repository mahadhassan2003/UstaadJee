"""
Agent 4: Booking Simulator
Simulates booking the best provider — generates booking ID, assigns time slot,
and saves the booking to the database.
"""

import time
import json
import random
import string
from datetime import datetime, timedelta
from agents.state import UstaadState
from database import save_booking


def _generate_booking_id():
    """Generate a unique booking ID like UJ-58291."""
    digits = ''.join(random.choices(string.digits, k=5))
    return f"UJ-{digits}"


def _get_next_slot(preferred_time: str, provider: dict):
    """
    Pick an available time slot based on user preference.
    Returns (date_str, time_str).
    """
    now = datetime.now()

    if preferred_time == "now" or preferred_time == "today":
        target_date = now
    elif preferred_time.startswith("tomorrow"):
        target_date = now + timedelta(days=1)
    else:
        # Default to tomorrow
        target_date = now + timedelta(days=1)

    # Get the day name
    day_name = target_date.strftime("%A").lower()

    # Check provider availability for that day
    availability = provider.get("availability", {})
    day_slots = availability.get(day_name, [])

    if not day_slots:
        # Try next available day
        for i in range(1, 7):
            next_day = target_date + timedelta(days=i)
            next_day_name = next_day.strftime("%A").lower()
            day_slots = availability.get(next_day_name, [])
            if day_slots:
                target_date = next_day
                break

    # Pick a time from the available slots based on preferred time
    if day_slots:
        selected_slot = day_slots[0]  # Default to first slot (usually morning)
        
        if "afternoon" in preferred_time.lower():
            for slot in day_slots:
                hour = int(slot.split("-")[0].split(":")[0])
                if 12 <= hour < 17:
                    selected_slot = slot
                    break
        elif "evening" in preferred_time.lower():
            for slot in day_slots:
                hour = int(slot.split("-")[0].split(":")[0])
                if hour >= 17:
                    selected_slot = slot
                    break
                    
        start_time = selected_slot.split("-")[0]

        # If it's today and start_time has passed, pick a later time
        if target_date.date() == now.date():
            hour = int(start_time.split(":")[0])
            if now.hour >= hour:
                start_time = f"{min(now.hour + 1, 23)}:00"
    else:
        start_time = "10:00"

    # Determine morning/afternoon for display
    hour = int(start_time.split(":")[0])
    period = "AM" if hour < 12 else "PM"
    display_hour = hour if hour <= 12 else hour - 12
    time_display = f"{display_hour}:{start_time.split(':')[1]} {period}"

    date_display = target_date.strftime("%A, %d %B %Y")

    return date_display, time_display


def simulate_booking(state: UstaadState) -> dict:
    """
    Agent 4 Node: Simulate a booking for the best provider.
    """
    start = time.time()

    best = state.get("best_provider", {})

    if not best:
        duration = int((time.time() - start) * 1000)
        return {
            "booking_id": "",
            "booking_status": "failed",
            "confirmation_message": "Sorry, no provider available to book.",
            "current_step": "booking_failed",
            "agent_trace": [{
                "agent": "BookingSimulator",
                "action": "No provider to book",
                "duration_ms": duration,
                "output": "Booking failed — no provider selected",
            }],
        }

    booking_id = _generate_booking_id()
    booking_date, booking_time = _get_next_slot(
        state.get("preferred_time", "tomorrow_morning"), best
    )

    # Create the booking record
    booking = {
        "booking_id": booking_id,
        "user_input": state["user_input"],
        "service_type": state["service_type"],
        "service_label": state.get("service_label", ""),
        "provider_id": best["id"],
        "provider_name": best["name"],
        "provider_phone": best["phone"],
        "appointment_date": booking_date,
        "appointment_time": booking_time,
        "location_area": state["location_area"],
        "location_city": state["location_city"],
        "estimated_cost": f"Rs. {best['price_range']['min']} - {best['price_range']['max']}",
        "status": "confirmed",
        "created_at": datetime.now().isoformat(),
    }

    # Save to database
    save_booking(booking)

    # Generate confirmation messages
    confirmation_message = (
        f"**Booking Confirmed!**\n\n"
        f"**Service:** {state.get('service_label', state['service_type'])}\n"
        f"**Provider:** {best['name']} (Rating: {best['rating']})\n"
        f"**Location:** {state['location_area']}, {state['location_city']}\n"
        f"**Date:** {booking_date}\n"
        f"**Time:** {booking_time}\n"
        f"**Estimated Cost:** Rs. {best['price_range']['min']} - {best['price_range']['max']}\n"
        f"**Provider Phone:** {best['phone']}\n"
        f"**Booking ID:** `{booking_id}`"
    )

    provider_message = (
        f"**New Booking!**\n"
        f"**Service:** {state.get('service_label', state['service_type'])}\n"
        f"**Location:** {state['location_area']}, {state['location_city']}\n"
        f"**Date:** {booking_date} at {booking_time}\n"
        f"**Booking ID:** `{booking_id}`"
    )

    duration = int((time.time() - start) * 1000)

    return {
        "booking_id": booking_id,
        "booking_date": booking_date,
        "booking_time": booking_time,
        "booking_status": "confirmed",
        "confirmation_message": confirmation_message,
        "provider_message": provider_message,
        "receipt_url": f"/api/bookings/{booking_id}",
        "current_step": "booked",
        "agent_trace": [{
            "agent": "BookingSimulator",
            "action": f"Booked {best['name']} for {booking_date} at {booking_time}",
            "duration_ms": duration,
            "output": json.dumps({
                "booking_id": booking_id,
                "provider": best["name"],
                "date": booking_date,
                "time": booking_time,
                "status": "confirmed"
            }),
        }],
    }
