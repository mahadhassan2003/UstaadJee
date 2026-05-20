"""
Agent 1: Intent Parser
Extracts service type, location, time, and urgency from the user's natural language message.
Supports English, Roman Urdu, and Urdu.
"""

import os
import json
import time
from langchain_google_genai import ChatGoogleGenerativeAI
from agents.state import UstaadState

# Initialize the Gemini LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0,
)

SYSTEM_PROMPT = """You are an intent parser for a Pakistani home services app called UstaadJee.
Your job is to extract structured information from the user's message.

The user may write in English, Roman Urdu (Urdu written in English letters), or Urdu script.

Extract the following fields:
- service_type: One of [ac_repair, plumbing, electrician, home_cleaning, painter, carpenter, tutor, beautician, pest_control, appliance_repair]. If unsure, use "unknown".
- location_city: The city (Islamabad, Lahore, Karachi, Rawalpindi, etc.). If not mentioned, use "unknown".
- location_area: The specific area/sector (G-13, F-8, Gulberg, DHA, etc.). If not mentioned, use "unknown".
- preferred_time: When they want the service. Use one of: "now", "today", "tomorrow_morning", "tomorrow_afternoon", "tomorrow_evening", "flexible", or "unknown". If they do NOT mention a time, you MUST use "unknown".
- urgency: "critical" if emergency (e.g., pipe burst, electricity gone), "urgent" if they need it today, "normal" otherwise.
- language: "english", "roman_urdu", or "urdu"
- confidence: A number from 0.0 to 1.0 indicating how confident you are about the extraction.
- clarification_message: If any essential fields (service_type, location_city, location_area, preferred_time) are "unknown", write a natural conversational question in the user's language asking for ONLY the missing info. If all info is present, set this to an empty string "".

IMPORTANT RULES:
- "Kal subah" means "tomorrow morning"
- "Abhi" or "foran" means "now" with urgency "critical" or "urgent"
- If the user says a greeting (like "hello", "assalamu alikum") or something vague, set confidence to 0.3 and service_type to "unknown"
- Common Roman Urdu: bijli=electrician, plumber/nalkay=plumbing, AC/thanda=ac_repair, safai=home_cleaning, rang/paint=painter, teacher/tuition=tutor, makeup/facial=beautician

Respond ONLY with a valid JSON object, nothing else. Example:
{"service_type": "ac_repair", "location_city": "Islamabad", "location_area": "G-13", "preferred_time": "unknown", "urgency": "normal", "language": "roman_urdu", "confidence": 0.95, "clarification_message": "Zaroor! Aap AC repair ke liye kis waqt service chahte hain?"}"""


def extract_intent(state: UstaadState) -> dict:
    """
    Agent 1 Node: Parse user intent using Groq LLM.
    """
    start = time.time()
    user_input = state["user_input"]

    parts = []
    if state.get("service_type") and state["service_type"] != "unknown": 
        parts.append(f"Service: {state['service_type']}")
    if state.get("location_city") and state["location_city"] != "unknown": 
        parts.append(f"City: {state['location_city']}")
    if state.get("location_area") and state["location_area"] != "unknown": 
        parts.append(f"Area: {state['location_area']}")
    if state.get("preferred_time") and state["preferred_time"] not in ["flexible", "unknown"]: 
        parts.append(f"Time: {state['preferred_time']}")
        
    context_prefix = ". ".join(parts)
    if context_prefix:
        combined_input = f"[Previously established context: {context_prefix}]\nNew message from user: {user_input}\n(Please retain the previously established context in your JSON output unless the user explicitly changes it)."
    else:
        combined_input = user_input

    # Call the LLM
    response = llm.invoke([
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": combined_input},
    ])

    # Parse the JSON response
    try:
        raw = response.content.strip()
        # Handle markdown code blocks if LLM wraps response
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
    except (json.JSONDecodeError, IndexError):
        parsed = {
            "service_type": "unknown",
            "location_city": "unknown",
            "location_area": "unknown",
            "preferred_time": "unknown",
            "urgency": "normal",
            "language": "english",
            "confidence": 0.0,
        }

    duration = int((time.time() - start) * 1000)

    # Determine if we need clarification
    needs_clarification = False
    clarification_question = parsed.get("clarification_message", "")

    if (parsed.get("confidence", 0) < 0.7 or 
        parsed.get("service_type") == "unknown" or
        (parsed.get("location_city") == "unknown" and parsed.get("location_area") == "unknown") or
        parsed.get("preferred_time") in ["unknown", "flexible", ""]):
        
        needs_clarification = True
        
        # Fallback just in case the LLM fails to generate one
        if not clarification_question:
            clarification_question = "Aapko mazeed kya details chahiye? (Service, Area, Time)"

    # Map service_type to a human-readable label
    service_labels = {
        "ac_repair": "AC Repair & Installation",
        "plumbing": "Plumbing",
        "electrician": "Electrician",
        "home_cleaning": "Home Cleaning",
        "painter": "Painter",
        "carpenter": "Carpenter",
        "tutor": "Home Tutor",
        "beautician": "Beautician (Home Service)",
        "pest_control": "Pest Control",
        "appliance_repair": "Appliance Repair",
    }

    return {
        "service_type": parsed.get("service_type", "unknown"),
        "service_label": service_labels.get(parsed.get("service_type", ""), "Unknown Service"),
        "location_city": parsed.get("location_city", "unknown"),
        "location_area": parsed.get("location_area", "unknown"),
        "preferred_time": parsed.get("preferred_time", "flexible"),
        "urgency": parsed.get("urgency", "normal"),
        "language_detected": parsed.get("language", "english"),
        "intent_confidence": parsed.get("confidence", 0.0),
        "needs_clarification": needs_clarification,
        "clarification_question": clarification_question,
        "current_step": "intent_parsed",
        "agent_trace": [{
            "agent": "IntentParser",
            "action": f"Extracted intent from: '{user_input[:50]}...'",
            "duration_ms": duration,
            "output": json.dumps(parsed, ensure_ascii=False),
        }],
    }
