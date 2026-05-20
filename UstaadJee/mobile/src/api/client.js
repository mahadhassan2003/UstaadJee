export const API_URL = "http://127.0.0.1:8000/api/chat"; 
// Note: If using Android Emulator, change 127.0.0.1 to 10.0.2.2
// Note: If using physical phone with Expo Go, change to your laptop's local IP (e.g. 192.168.1.5)

export const sendMessageToAgent = async (message, sessionId = "demo-session") => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
};
