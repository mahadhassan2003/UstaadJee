"""
Agent 5: Follow-up Scheduler
Schedules reminders and follow-up messages after booking.
"""

import time
import json
from agents.state import UstaadState


def schedule_followup(state: UstaadState) -> dict:
    """
    Agent 5 Node: Create follow-up reminders for the booking.
    """
    start = time.time()

    booking_id = state.get("booking_id", "")
    best = state.get("best_provider", {})
    booking_date = state.get("booking_date", "")
    booking_time = state.get("booking_time", "")

    if not booking_id:
        duration = int((time.time() - start) * 1000)
        return {
            "reminders": [],
            "followup_scheduled": False,
            "current_step": "complete",
            "agent_trace": [{
                "agent": "FollowupScheduler",
                "action": "No booking to follow up on",
                "duration_ms": duration,
                "output": "Skipped — no active booking",
            }],
        }

    provider_name = best.get("name", "Provider")

    reminders = [
        {
            "type": "day_before",
            "target": "user",
            "message": (
                f"📅 Kal aapka {provider_name} ke saath appointment hai "
                f"{booking_time} par. Documents aur address tayyar rakhein!"
            ),
            "status": "scheduled",
        },
        {
            "type": "hour_before",
            "target": "user",
            "message": (
                f"⏰ 1 ghante mein {provider_name} aa rahe hain! "
                f"Booking ID: {booking_id}. Tayyar rahein!"
            ),
            "status": "scheduled",
        },
        {
            "type": "hour_before",
            "target": "provider",
            "message": (
                f"⏰ Aapki booking {booking_id} 1 ghante mein hai. "
                f"Location: {state.get('location_area', '')}, {state.get('location_city', '')}. "
                f"Rasta check kar lein!"
            ),
            "status": "scheduled",
        },
        {
            "type": "completion_check",
            "target": "user",
            "message": (
                f"Kya {provider_name} ka kaam complete ho gaya? "
                f"Apna experience share karein aur rating dein ⭐⭐⭐⭐⭐"
            ),
            "status": "scheduled",
        },
    ]

    duration = int((time.time() - start) * 1000)

    return {
        "reminders": reminders,
        "followup_scheduled": True,
        "current_step": "complete",
        "agent_trace": [{
            "agent": "FollowupScheduler",
            "action": f"Scheduled {len(reminders)} reminders for booking {booking_id}",
            "duration_ms": duration,
            "output": json.dumps({
                "reminders_count": len(reminders),
                "types": [r["type"] for r in reminders]
            }),
        }],
    }
