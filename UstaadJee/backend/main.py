"""
UstaadJee API — Main FastAPI Application
Connects the LangGraph agent pipeline to REST endpoints.
Includes session memory so multi-turn conversations work.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
from dotenv import load_dotenv
from collections import defaultdict
import os
import json

# Load environment variables BEFORE importing agents (they need API keys)
load_dotenv()

from agents.graph import ustaadjee_graph_builder
from database import get_booking, get_all_bookings, get_all_categories

app = FastAPI(
    title="UstaadJee API",
    description="AI-powered service orchestrator for Pakistan's informal economy",
    version="1.0.0",
)

# Enable CORS for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- Session Memory Store ----
# Stores conversation history per session_id so multi-turn works
session_memory: Dict[str, List[dict]] = defaultdict(list)
# Stores partial intent data collected across turns
session_context: Dict[str, dict] = defaultdict(dict)


# ---- Request/Response Models ----

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class ChatResponse(BaseModel):
    response_type: str          # "clarification" | "booking_complete" | "error"
    message: str                # Main message to display to user
    data: Optional[dict] = None # Structured data (providers, booking, etc.)
    agent_trace: Optional[list] = None      # Full trace log for judges


# ---- Endpoints ----

@app.get("/")
def root():
    return {
        "app": "UstaadJee",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Main chat endpoint (Synchronous).
    """
    # Keep the old endpoint for backward compatibility or simple use-cases
    try:
        sid = request.session_id or "default"
        session_memory[sid].append({"role": "user", "content": request.message})
        ctx = session_context[sid]
        
        if ctx:
            parts = []
            if ctx.get("service_type") and ctx["service_type"] != "unknown": parts.append(f"Service: {ctx['service_type']}")
            if ctx.get("location_city") and ctx["location_city"] != "unknown": parts.append(f"City: {ctx['location_city']}")
            if ctx.get("location_area") and ctx["location_area"] != "unknown": parts.append(f"Area: {ctx['location_area']}")
            if ctx.get("preferred_time") and ctx["preferred_time"] != "flexible": parts.append(f"Time: {ctx['preferred_time']}")
            context_prefix = ". ".join(parts)
            combined_input = f"[Previous context: {context_prefix}]\nNew message: {request.message}" if parts else request.message
        else:
            combined_input = request.message

        initial_state = {"user_input": combined_input, "session_id": sid, "agent_trace": []}
        result = ustaadjee_graph.invoke(initial_state)

        if result.get("needs_clarification"):
            if result.get("service_type") and result["service_type"] != "unknown": ctx["service_type"] = result["service_type"]
            if result.get("service_label"): ctx["service_label"] = result["service_label"]
            if result.get("location_city") and result["location_city"] != "unknown": ctx["location_city"] = result["location_city"]
            if result.get("location_area") and result["location_area"] != "unknown": ctx["location_area"] = result["location_area"]
            if result.get("preferred_time") and result["preferred_time"] != "flexible": ctx["preferred_time"] = result["preferred_time"]
            session_context[sid] = ctx
            msg = result.get("clarification_question", "Can you provide more details?")
            session_memory[sid].append({"role": "assistant", "content": msg})
            return ChatResponse(response_type="clarification", message=msg, data=result, agent_trace=[])

        session_context[sid] = {}
        msg = result.get("confirmation_message", "Booking processed.")
        session_memory[sid].append({"role": "assistant", "content": msg})
        
        providers = result.get("ranked_providers", [])
        return ChatResponse(
            response_type="booking_complete",
            message=msg,
            data={"providers": providers, "best_provider": result.get("best_provider", {}), "booking": {"booking_id": result.get("booking_id"), "time": result.get("booking_time"), "date": result.get("booking_date"), "status": result.get("booking_status")}, "service": {"type": result.get("service_type"), "label": result.get("service_label")}, "location": {"area": result.get("location_area"), "city": result.get("location_city")}},
            agent_trace=result.get("agent_trace", [])
        )
    except Exception as e:
        return ChatResponse(response_type="error", message=str(e))

from fastapi.responses import StreamingResponse
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3

# Initialize LangGraph Checkpointer
conn = sqlite3.connect("langgraph_checkpoints.db", check_same_thread=False)
memory = SqliteSaver(conn)
ustaadjee_graph = ustaadjee_graph_builder.compile(checkpointer=memory)

from database import (
    get_booking, get_all_bookings, get_all_categories,
    save_frontend_message, get_frontend_history, clear_chat_history,
    get_all_sessions
)

class FrontendMessageRequest(BaseModel):
    session_id: str
    message: dict

@app.get("/api/chat/sessions")
def list_sessions():
    """Get all past conversation sessions."""
    return {"sessions": get_all_sessions()}


@app.get("/api/chat/history/{session_id}")
def get_history(session_id: str):
    """Fetch persistent frontend chat history."""
    return {"messages": get_frontend_history(session_id)}

@app.post("/api/chat/message")
def save_message(request: FrontendMessageRequest):
    """Save a single frontend message to persistent storage."""
    save_frontend_message(request.session_id, request.message)
    return {"status": "saved"}

@app.delete("/api/chat/history/{session_id}")
def clear_history(session_id: str):
    """Clear chat history (useful for testing)."""
    clear_chat_history(session_id)
    return {"status": "cleared"}

@app.post("/api/chat/stream")
def chat_stream(request: ChatRequest):
    """
    Streaming chat endpoint using Server-Sent Events (SSE).
    """
    sid = request.session_id or "default"
    
    # We no longer need session_memory or session_context arrays, 
    # because LangGraph's checkpointer automatically remembers UstaadState for this thread!
    # All we need to do is pass the thread_id to the graph config.

    config = {"configurable": {"thread_id": sid}}
    initial_state = {"user_input": request.message, "session_id": sid, "agent_trace": []}

    def event_generator():
        try:
            final_state = {}
            for event in ustaadjee_graph.stream(initial_state, config=config, stream_mode="updates"):
                node_name = list(event.keys())[0]
                updates = event[node_name]
                final_state.update(updates)

                step_label = ""
                is_clarification = False

                if node_name == "extract_intent":
                    if updates.get("needs_clarification"):
                        is_clarification = True
                    else:
                        svc = updates.get("service_label", updates.get("service_type", ""))
                        area = updates.get("location_area", "")
                        step_label = f"Intent extracted — {svc}, {area}"
                elif node_name == "find_providers":
                    found = updates.get("providers_found", [])
                    step_label = f"Searching {len(found)} providers near {final_state.get('location_area')}..."
                elif node_name == "rank_recommend":
                    step_label = "Ranking by distance, rating, availability..."
                elif node_name == "simulate_booking":
                    step_label = "Preparing recommendations..."
                elif node_name == "schedule_followup":
                    step_label = "Finalizing..."
                
                if is_clarification:
                    msg = updates.get("clarification_question", "Can you provide more details?")
                    yield f"data: {json.dumps({'type': 'clarification', 'message': msg})}\n\n"
                    break
                elif step_label:
                    yield f"data: {json.dumps({'type': 'step', 'label': step_label, 'node': node_name})}\n\n"

            if not final_state.get("needs_clarification"):
                providers = final_state.get("ranked_providers", [])
                best = final_state.get("best_provider", {})
                
                payload = {
                    "type": "done",
                    "data": {
                        "providers": providers,
                        "best_provider": best,
                        "booking": {
                            "booking_id": final_state.get("booking_id"),
                            "time": final_state.get("booking_time"),
                            "date": final_state.get("booking_date"),
                            "status": final_state.get("booking_status"),
                        },
                        "service": {
                            "type": final_state.get("service_type"),
                            "label": final_state.get("service_label"),
                        },
                        "location": {
                            "area": final_state.get("location_area"),
                            "city": final_state.get("location_city"),
                        },
                        "ranking_reasoning": final_state.get("ranking_reasoning", ""),
                        "reminders": final_state.get("reminders", []),
                        "agent_trace": final_state.get("agent_trace", [])
                    }
                }
                
                # Reset the LangGraph state so the next chat starts fresh
                try:
                    ustaadjee_graph.update_state(config, {
                        "service_type": "unknown", 
                        "location_city": "unknown", 
                        "location_area": "unknown", 
                        "preferred_time": "unknown",
                        "booking_id": ""
                    })
                except Exception:
                    pass

                yield f"data: {json.dumps(payload)}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

from groq import Groq
import tempfile

@app.post("/api/chat/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Convert an audio file (e.g. from mobile) to text using Groq Whisper."""
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # Save uploaded file to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                file=(file.filename, f.read()),
                model="whisper-large-v3-turbo",
                response_format="json",
                language="ur", # optimize for Urdu/Roman Urdu
            )
            
        os.remove(tmp_path)
        return {"text": transcription.text}
    except Exception as e:
        print("Transcription Error:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bookings")
def list_bookings():
    """Get all simulated bookings."""
    return {"bookings": get_all_bookings()}


@app.get("/api/bookings/{booking_id}")
def get_booking_detail(booking_id: str):
    """Get a specific booking by ID."""
    booking = get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@app.get("/api/categories")
def list_categories():
    """Get all available service categories."""
    return {"categories": get_all_categories()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
