import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Production backend URL (Cloud Run)
// No need for dynamic host detection when using a deployed endpoint.
export const BASE_URL = "https://ustaadjee-api-551148571510.us-central1.run.app";
export const API_URL = `${BASE_URL}/api/chat`;

export const sendMessageToAgent = async (message: string, sessionId = 'demo-session') => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId }),
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
};

export const streamMessageToAgent = async (
  message: string, 
  onChunk: (data: any) => void,
  sessionId = 'demo-session'
) => {
  try {
    const response = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    // Fallback for React Native Android/iOS which lacks native fetch stream support
    if (!response.body || !(response.body as any).getReader) {
      const text = await response.text();
      const lines = text.split('\n\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6).trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              onChunk(data);
            } catch (e) {
              console.error('Failed to parse SSE JSON (fallback):', jsonStr, e);
            }
          }
        }
      }
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep the last incomplete chunk in the buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6).trim();
          if (jsonStr) {
            try {
              const data = JSON.parse(jsonStr);
              onChunk(data);
            } catch (e) {
              console.error('Failed to parse SSE JSON:', jsonStr, e);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to stream message:', error);
    throw error;
  }
};

export const fetchBookings = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/bookings`);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    throw error;
  }
};

export const fetchChatHistory = async (sessionId = 'demo-session') => {
  try {
    const response = await fetch(`${BASE_URL}/api/chat/history/${sessionId}`);
    if (!response.ok) return { messages: [] };
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return { messages: [] };
  }
};

export const saveChatMessage = async (message: any, sessionId = 'demo-session') => {
  try {
    await fetch(`${BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message }),
    });
  } catch (error) {
    console.error('Failed to save message:', error);
  }
};
export const fetchSessions = async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/chat/sessions`);
    if (!response.ok) return { sessions: [] };
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return { sessions: [] };
  }
};
export const deleteSession = async (sessionId: string) => {
  try {
    await fetch(`${BASE_URL}/api/chat/history/${sessionId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Failed to delete session:', error);
  }
};
