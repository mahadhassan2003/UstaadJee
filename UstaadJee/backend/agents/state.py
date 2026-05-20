"""
Shared state definition for the UstaadJee LangGraph pipeline.
This TypedDict is the 'memory' that all agents read from and write to.
"""

from typing import TypedDict, Optional, Annotated
from operator import add


class AgentTrace(TypedDict):
    """A single trace entry showing what an agent did."""
    agent: str
    action: str
    duration_ms: int
    output: str


class UstaadState(TypedDict):
    """
    The shared state passed between all agents in the LangGraph pipeline.
    Each agent reads what it needs and writes its output back to this state.
    """

    # ---- User Input ----
    user_input: str
    session_id: str

    # ---- Agent 1: Intent Parser Output ----
    service_type: str           # e.g., "ac_repair"
    service_label: str          # e.g., "AC Repair & Installation"
    location_city: str          # e.g., "Islamabad"
    location_area: str          # e.g., "G-13"
    preferred_time: str         # e.g., "tomorrow_morning", "now", "monday"
    urgency: str                # "normal" | "urgent" | "critical"
    language_detected: str      # "english" | "roman_urdu" | "urdu"
    intent_confidence: float    # 0.0 - 1.0
    needs_clarification: bool
    clarification_question: str

    # ---- Agent 2: Provider Finder Output ----
    user_lat: float
    user_lng: float
    providers_found: list       # Raw list of matching providers

    # ---- Agent 3: Ranker Output ----
    ranked_providers: list      # Sorted by score with distance
    best_provider: dict         # The top pick
    ranking_reasoning: str      # LLM-generated explanation

    # ---- Agent 4: Booking Output ----
    booking_id: str
    booking_time: str
    booking_date: str
    booking_status: str         # "confirmed" | "pending"
    confirmation_message: str   # Message to show user
    provider_message: str       # Message to send to provider
    receipt_url: str

    # ---- Agent 5: Follow-up Output ----
    reminders: list
    followup_scheduled: bool

    # ---- Meta ----
    agent_trace: Annotated[list, add]  # Append-only trace log
    error: Optional[str]
    current_step: str
