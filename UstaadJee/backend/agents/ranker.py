"""
Agent 3: Ranker & Recommender
Ranks found providers by score and generates a human-readable reasoning.
"""

import os
import json
import time
from langchain_google_genai import ChatGoogleGenerativeAI
from agents.state import UstaadState
from database import rank_providers

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0,
)

RANKING_PROMPT = """You are a service recommendation assistant for Pakistan.
Given the top-ranked service providers below, write a short 2-3 sentence reasoning explaining why the #1 provider is the best choice for the user.

Mention: distance, rating, experience, and specializations.
Write in simple English that a Pakistani user would understand.

User needs: {service_type} in {area}, {city}

Top providers:
{providers_summary}

Respond with ONLY the reasoning text, nothing else."""


def rank_and_recommend(state: UstaadState) -> dict:
    """
    Agent 3 Node: Rank providers and generate recommendation reasoning.
    """
    start = time.time()

    providers = state["providers_found"]
    user_lat = state["user_lat"]
    user_lng = state["user_lng"]

    # If no providers found, return early
    if not providers:
        duration = int((time.time() - start) * 1000)
        return {
            "ranked_providers": [],
            "best_provider": {},
            "ranking_reasoning": "Sorry, no providers found for this service in your area.",
            "current_step": "ranked",
            "agent_trace": [{
                "agent": "Ranker",
                "action": "No providers to rank",
                "duration_ms": duration,
                "output": "0 providers found",
            }],
        }

    # Rank providers using the scoring formula
    ranked = rank_providers(providers, user_lat, user_lng)
    top_3 = ranked[:3]
    best = top_3[0]

    # Build a summary for the LLM to reason about
    providers_summary = ""
    for i, p in enumerate(top_3, 1):
        providers_summary += (
            f"#{i}: {p['name']} - {p['distance_km']}km away, "
            f"Rating: {p['rating']}/5 ({p['total_reviews']} reviews), "
            f"Experience: {p['experience_years']} years, "
            f"Price: Rs. {p['price_range']['min']}-{p['price_range']['max']}, "
            f"Specializations: {', '.join(p['specializations'])}, "
            f"Score: {p['match_score']}\n"
        )

    # Generate reasoning using LLM
    try:
        prompt = RANKING_PROMPT.format(
            service_type=state.get("service_label", state["service_type"]),
            area=state["location_area"],
            city=state["location_city"],
            providers_summary=providers_summary,
        )
        response = llm.invoke([{"role": "user", "content": prompt}])
        reasoning = response.content.strip()
    except Exception:
        # Fallback reasoning if LLM fails
        reasoning = (
            f"{best['name']} is recommended because they are {best['distance_km']}km away "
            f"with a {best['rating']}/5 rating from {best['total_reviews']} reviews "
            f"and {best['experience_years']} years of experience."
        )

    duration = int((time.time() - start) * 1000)

    return {
        "ranked_providers": top_3,
        "best_provider": best,
        "ranking_reasoning": reasoning,
        "current_step": "ranked",
        "agent_trace": [{
            "agent": "Ranker",
            "action": f"Ranked {len(ranked)} providers, selected {best['name']}",
            "duration_ms": duration,
            "output": json.dumps({
                "best": best["name"],
                "score": best["match_score"],
                "distance": best["distance_km"],
                "reasoning": reasoning[:100] + "..."
            }, ensure_ascii=False),
        }],
    }
