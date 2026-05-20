"""
LangGraph Orchestrator for UstaadJee.
Wires all 5 agents into a single executable pipeline with conditional routing.
"""

from langgraph.graph import StateGraph, END
from agents.state import UstaadState
from agents.intent_parser import extract_intent
from agents.provider_finder import find_providers_node
from agents.ranker import rank_and_recommend
from agents.booking import simulate_booking
from agents.followup import schedule_followup


def _route_after_intent(state: UstaadState) -> str:
    """Decide whether to ask for clarification or proceed."""
    if state.get("needs_clarification", False):
        return "needs_clarification"
    return "proceed"


def build_graph():
    """
    Build and compile the UstaadJee LangGraph pipeline.

    Flow:
        extract_intent
             │
             ├─ (confidence < 0.7) ──→ END (return clarification question)
             │
             └─ (confidence ≥ 0.7) ──→ find_providers
                                            │
                                       rank_and_recommend
                                            │
                                       simulate_booking
                                            │
                                       schedule_followup
                                            │
                                           END
    """
    workflow = StateGraph(UstaadState)

    # Add all agent nodes
    workflow.add_node("extract_intent", extract_intent)
    workflow.add_node("find_providers", find_providers_node)
    workflow.add_node("rank_recommend", rank_and_recommend)
    workflow.add_node("simulate_booking", simulate_booking)
    workflow.add_node("schedule_followup", schedule_followup)

    # Set entry point
    workflow.set_entry_point("extract_intent")

    # Conditional edge after intent extraction
    workflow.add_conditional_edges(
        "extract_intent",
        _route_after_intent,
        {
            "needs_clarification": END,  # Return to user for more info
            "proceed": "find_providers",
        },
    )

    # Linear flow after intent is clear
    workflow.add_edge("find_providers", "rank_recommend")
    workflow.add_edge("rank_recommend", "simulate_booking")
    workflow.add_edge("simulate_booking", "schedule_followup")
    workflow.add_edge("schedule_followup", END)

    # We don't initialize the checkpointer here because it needs a database connection
    # which is better handled dynamically when invoking/streaming.
    return workflow

# Return just the graph builder, we'll compile it with checkpointer in main.py
ustaadjee_graph_builder = build_graph()
