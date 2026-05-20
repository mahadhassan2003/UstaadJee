import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  Alert,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import MessageBubble from '../../src/components/MessageBubble';
import ProviderCards from '../../src/components/ProviderCards';
import BookingCard from '../../src/components/BookingCard';
import QuickChips from '../../src/components/QuickChips';
import RecordingBar from '../../src/components/RecordingBar';
import VoiceNoteBubble from '../../src/components/VoiceNoteBubble';
import CallAgentModal from '../../src/components/CallAgentModal';
import { streamMessageToAgent, fetchChatHistory, saveChatMessage, fetchSessions, deleteSession, BASE_URL } from '../../src/api/client';
import { Audio } from 'expo-av';

type Message = {
  id: string;
  type: 'text' | 'agent_steps' | 'providers' | 'booking' | 'reasoning' | 'followup' | 'voice_note';
  text?: string;
  isUser?: boolean;
  timestamp?: string;
  providers?: any[];
  bookingData?: any;
  allSteps?: { label: string; status: 'done' | 'active' | 'pending' }[];
  visibleStepCount?: number;
  agentTrace?: any[];
  visibleReminderCount?: number;
  voiceUri?: string;
  voiceDuration?: number;
};

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'text',
      text: "Assalam o Alaikum!\nKaunsi service chahiye aaj? Apna masla batayein — Urdu, Roman Urdu, ya English mein.",
      isUser: false,
      timestamp: formatTime(),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [traceModalVisible, setTraceModalVisible] = useState(false);
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(Platform.OS === 'web');
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState(uid());
  const [currentTrace, setCurrentTrace] = useState<any[] | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'locked'>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const micBtnScale = useRef(new Animated.Value(1)).current;

  const lastResponseRef = useRef<any>(null);

  const sidebarAnim = useRef(new Animated.Value(Platform.OS === 'web' ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: sidebarVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [sidebarVisible]);

  const sidebarWidth = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 260]
  });

  const sidebarTranslateX = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 0]
  });

  const loadSessionsList = async () => {
    const data = await fetchSessions();
    if (data && data.sessions) {
      setSessions(data.sessions);
    }
  };

  const loadHistory = async (id: string) => {
    const data = await fetchChatHistory(id);
    if (data && data.messages && data.messages.length > 0) {
      setMessages(data.messages);
    } else {
      setMessages([
        {
          id: '1',
          type: 'text',
          text: "Assalam o Alaikum!\nKaunsi service chahiye aaj? Apna masla batayein — Urdu, Roman Urdu, ya English mein.",
          isUser: false,
          timestamp: formatTime(),
        },
      ]);
    }
    setSessionId(id);
    if (Platform.OS !== 'web') setSidebarVisible(false);
  };

  const startNewChat = () => {
    const newId = uid();
    setSessionId(newId);
    setMessages([
      {
        id: '1',
        type: 'text',
        text: "Assalam o Alaikum!\nKaunsi service chahiye aaj? Apna masla batayein — Urdu, Roman Urdu, ya English mein.",
        isUser: false,
        timestamp: formatTime(),
      },
    ]);
    if (Platform.OS !== 'web') setSidebarVisible(false);
  };

  const handleDeleteSession = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this chat?')) {
        performDelete(id);
      }
    } else {
      Alert.alert(
        'Delete Chat',
        'Are you sure you want to delete this conversation?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => performDelete(id) },
        ]
      );
    }
  };

  const performDelete = async (id: string) => {
    await deleteSession(id);
    await loadSessionsList();
    if (id === sessionId) {
      startNewChat();
    }
  };

  // --- Recording Timer ---
  useEffect(() => {
    if (isListening && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isListening, isPaused]);

  const startRecording = async () => {
    if (isListening) return;

    if (Platform.OS === 'web') {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) { Alert.alert('Not Supported', 'Speech recognition is not supported in this browser.'); return; }
        const recognition = new SpeechRecognition();
        recognition.lang = 'ur-PK';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.onstart = () => { setIsListening(true); setRecordingState('locked'); setRecordingDuration(0); setIsPaused(false); };
        let finalTranscript = '';
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) { finalTranscript += t + ' '; } else { interimTranscript += t; }
          }
          setInputText(finalTranscript + interimTranscript);
        };
        recognition.onerror = () => resetRecordingState();
        recognition.onend = () => resetRecordingState();
        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) { console.error(err); resetRecordingState(); }
    } else {
      try {
        if (recognitionRef.current) {
          try { await (recognitionRef.current as Audio.Recording).stopAndUnloadAsync(); } catch (_) {}
          recognitionRef.current = null;
        }
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recognitionRef.current = recording;
        setRecordingDuration(0);
        setIsPaused(false);
        setIsListening(true);
        setRecordingState('locked'); // Start in locked mode (tap mic → shows full bar)
      } catch (err) {
        console.error('Failed to start recording', err);
        Alert.alert('Microphone Error', 'Could not access microphone.');
        resetRecordingState();
      }
    }
  };

  const cancelRecording = async () => {
    if (Platform.OS === 'web') {
      recognitionRef.current?.abort?.() || recognitionRef.current?.stop?.();
    } else {
      try {
        const recording = recognitionRef.current as Audio.Recording;
        recognitionRef.current = null;
        if (recording) await recording.stopAndUnloadAsync();
      } catch (_) {}
    }
    resetRecordingState();
  };

  const pauseRecording = async () => {
    if (Platform.OS !== 'web' && recognitionRef.current) {
      try {
        if (isPaused) {
          await (recognitionRef.current as Audio.Recording).startAsync();
          setIsPaused(false);
        } else {
          await (recognitionRef.current as Audio.Recording).pauseAsync();
          setIsPaused(true);
        }
      } catch (err) { console.error('Pause/Resume error', err); }
    }
  };

  const sendRecording = async () => {
    const dur = recordingDuration;
    if (Platform.OS === 'web') {
      recognitionRef.current?.stop();
      resetRecordingState();
      return;
    }
    try {
      const recording = recognitionRef.current as Audio.Recording;
      recognitionRef.current = null;
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        resetRecordingState();
        if (uri) {
          // Add voice note bubble to chat
          const voiceMsg: Message = {
            id: Date.now().toString(),
            type: 'voice_note',
            isUser: true,
            timestamp: formatTime(),
            voiceUri: uri,
            voiceDuration: dur,
          };
          setMessages((prev) => [...prev, voiceMsg]);
          // Then transcribe and send to agent
          uploadAudio(uri);
        }
      }
    } catch (err) {
      console.error('Failed to send recording', err);
      resetRecordingState();
    }
  };

  const resetRecordingState = () => {
    setIsListening(false);
    setRecordingState('idle');
    setIsPaused(false);
    setRecordingDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const uploadAudio = async (uri: string) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: `audio_${Date.now()}.m4a`,
        type: 'audio/m4a',
      } as any);

      const response = await fetch(`${BASE_URL}/api/chat/transcribe`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // Note: React Native fetch handles multipart/form-data automatically 
          // when passing a FormData object, do not set Content-Type manually.
        },
      });

      if (!response.ok) throw new Error('Transcription failed');
      const data = await response.json();
      if (data.text) {
        setInputText((prev) => prev + (prev ? ' ' : '') + data.text);
      }
    } catch (error) {
      console.error('Upload Error:', error);
      Alert.alert('Error', 'Failed to transcribe audio.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const userMsg = inputText.trim();
    setInputText('');
    setSelectedChip(null);
    const ts = formatTime();

    const newMsg: Message = { type: 'text', text: userMsg, isUser: true, timestamp: ts };
    addMessage(newMsg);
    setIsLoading(true);

    const stepsId = uid();
    let hasStepsMessage = false;

    try {
      const ts2 = formatTime();
      await streamMessageToAgent(userMsg, (chunk) => {
        setIsLoading(false); 

        if (chunk.type === 'clarification') {
          addMessage({ type: 'text', text: chunk.message, isUser: false, timestamp: ts2 });
        } 
        else if (chunk.type === 'step') {
          if (!hasStepsMessage) {
            hasStepsMessage = true;
            addMessage({
              id: stepsId,
              type: 'agent_steps',
              text: 'Samajh gaya! Let me find the best providers for you...',
              isUser: false,
              timestamp: ts2,
              allSteps: [{ label: chunk.label, status: 'active' }],
              visibleStepCount: 1,
            });
          } else {
            setMessages(prev => prev.map(m => {
              if (m.id !== stepsId) return m;
              const prevSteps = m.allSteps || [];
              const updatedSteps = prevSteps.map(s => ({ ...s, status: 'done' as const }));
              updatedSteps.push({ label: chunk.label, status: 'active' as const });
              return { ...m, allSteps: updatedSteps, visibleStepCount: updatedSteps.length };
            }));
          }
        }
        else if (chunk.type === 'done') {
          lastResponseRef.current = { data: chunk.data };
          
          setMessages(prev => prev.map(m => {
            if (m.id !== stepsId) return m;
            const updatedSteps = (m.allSteps || []).map(s => ({ ...s, status: 'done' as const }));
            const finalMsg = { ...m, allSteps: updatedSteps, agentTrace: chunk.data.agent_trace };
            saveChatMessage(finalMsg, sessionId); // Save the completed steps message
            return finalMsg;
          }));

          const data = chunk.data || {};
          const providers = data.providers || [];
          const best = data.best_provider || {};

          const providerCards = providers.map((p: any, i: number) => ({
            name: p.name || 'Provider',
            initials: getInitials(p.name || 'P'),
            distance: `${p.distance_km ?? '?'} km`,
            rating: `${p.rating ?? '?'}`,
            reviews: `${p.total_reviews ?? 0} reviews`,
            time: data.booking?.time || 'Available',
            price: `Rs ${p.price_range?.min ?? '?'}`,
            recommended: i === 0,
          }));

          if (providerCards.length === 0 && best.name) {
            providerCards.push({
              name: best.name,
              initials: getInitials(best.name),
              distance: `${best.distance_km ?? '?'} km`,
              rating: `${best.rating ?? '?'}`,
              reviews: `${best.total_reviews ?? 0} reviews`,
              time: data.booking?.time || 'Available',
              price: `Rs ${best.price_range?.min ?? '?'}`,
              recommended: true,
            });
          }

          setTimeout(() => {
            addMessage({
              type: 'providers',
              text: `Yeh raha top ${providerCards.length} provider${providerCards.length > 1 ? 's' : ''}! Recommended wala sabse best match hai.`,
              isUser: false,
              timestamp: ts2,
              providers: providerCards,
            });

            // Show ranking reasoning
            const reasoning = data.ranking_reasoning;
            if (reasoning) {
              setTimeout(() => {
                addMessage({
                  type: 'reasoning',
                  text: reasoning,
                  isUser: false,
                  timestamp: ts2,
                });
              }, 300);
            }
          }, 400); 
        }
        else if (chunk.type === 'error') {
          addMessage({ type: 'text', text: chunk.message, isUser: false, timestamp: ts2 });
        }
      }, sessionId);
    } catch {
      setIsLoading(false);
      addMessage({
        type: 'text',
        text: 'Connection failed. Please check backend server.',
        isUser: false,
        timestamp: formatTime(),
      });
    }
  };

  const handleChipSelect = (chip: string) => {
    setSelectedChip(chip);
    setInputText(chip);
  };

  const handleBook = useCallback((provider: any) => {
    const resp = lastResponseRef.current;
    if (!resp) return;

    const data = resp.data || {};
    const ts = formatTime();

    addMessage({
      type: 'booking',
      text: 'Booking confirmed!',
      isUser: false,
      timestamp: ts,
      bookingData: {
        booking: data.booking,
        provider: {
          name: provider.name,
          phone: provider.phone || '0300-0000000',
        },
        service: data.service?.label || data.service?.type,
        location: `${data.location?.area || ''}, ${data.location?.city || ''}`,
        price: provider.price,
      },
    });

    // Show follow-up reminders one by one (real-time stagger)
    const reminders = data.reminders || [];
    if (reminders.length > 0) {
      const followupId = uid();
      setTimeout(() => {
        // Add card with 0 reminders visible
        const followupMsg: Message = {
          id: followupId,
          type: 'followup',
          text: 'Follow-up reminders scheduled:',
          isUser: false,
          timestamp: ts,
          bookingData: { reminders },
          visibleReminderCount: 0,
        };
        setMessages(prev => [...prev, followupMsg]);
        saveChatMessage(followupMsg, sessionId);

        // Reveal each reminder one by one
        reminders.forEach((_: any, i: number) => {
          setTimeout(() => {
            setMessages(prev => prev.map(m =>
              m.id === followupId
                ? { ...m, visibleReminderCount: i + 1 }
                : m
            ));
          }, (i + 1) * 600);
        });
      }, 500);
    }
  }, []);

  function addMessage(partial: Partial<Message> & { type: Message['type'] }) {
    const newMessage = { id: uid(), ...partial } as Message;
    setMessages(prev => [...prev, newMessage]);
    
    // Save to backend EXCEPT for the incomplete agent_steps
    if (newMessage.type !== 'agent_steps') {
      saveChatMessage(newMessage, sessionId);
    }
  }

  // ---- Render ----

  const renderMessage = (msg: Message) => {
    switch (msg.type) {
      case 'text':
        return (
          <MessageBubble
            key={msg.id}
            message={msg.text || ''}
            isUser={msg.isUser || false}
            timestamp={msg.timestamp}
          />
        );

      case 'agent_steps':
        return (
          <View key={msg.id} style={styles.richBubble}>
            <View style={styles.botRow}>
              <View style={styles.avatar}>
                <Ionicons name="construct-outline" size={14} color={Colors.primary} />
              </View>
              <View style={styles.richContent}>
                <View style={styles.bubbleBot}>
                  <Text style={styles.headerText}>{msg.text}</Text>
                  <View style={styles.stepsContainer}>
                    {(msg.allSteps || []).map((step, i) => {
                      if (i >= (msg.visibleStepCount ?? msg.allSteps?.length ?? 0) && step.status === 'pending') {
                        return null; // Not yet revealed
                      }
                      return (
                        <View key={i} style={styles.stepRow}>
                          <View
                            style={[
                              styles.stepCircle,
                              step.status === 'done' && styles.stepDone,
                              step.status === 'active' && styles.stepActive,
                              step.status === 'pending' && styles.stepPending,
                            ]}
                          >
                            {step.status === 'done' && (
                              <Ionicons name="checkmark" size={10} color={Colors.white} />
                            )}
                            {step.status === 'active' && (
                              <ActivityIndicator size={10} color={Colors.white} />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.stepLabel,
                              step.status === 'active' && styles.stepLabelActive,
                            ]}
                          >
                            {step.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
                
                {msg.agentTrace && msg.agentTrace.length > 0 && (
                  <TouchableOpacity 
                    style={styles.brainBtn}
                    onPress={() => {
                      setCurrentTrace(msg.agentTrace || null);
                      setTraceModalVisible(true);
                    }}
                  >
                    <Ionicons name="terminal-outline" size={12} color={Colors.white} />
                    <Text style={styles.brainBtnText}>View Agent Brain</Text>
                  </TouchableOpacity>
                )}
                
                {msg.timestamp && <Text style={styles.timestamp}>{msg.timestamp}</Text>}
              </View>
            </View>
          </View>
        );

      case 'providers':
        return (
          <View key={msg.id} style={styles.richBubble}>
            <View style={styles.botRow}>
              <View style={styles.avatar}>
                <Ionicons name="construct-outline" size={14} color={Colors.primary} />
              </View>
              <View style={styles.richContent}>
                <View style={styles.bubbleBot}>
                  <Text style={styles.providerHeader}>{msg.text}</Text>
                  <ProviderCards providers={msg.providers || []} onBook={handleBook} />
                </View>
                {msg.timestamp && <Text style={styles.timestamp}>{msg.timestamp}</Text>}
              </View>
            </View>
          </View>
        );

      case 'reasoning':
        return (
          <View key={msg.id} style={styles.richBubble}>
            <View style={styles.botRow}>
              <View style={[styles.avatar, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="bulb-outline" size={14} color="#D97706" />
              </View>
              <View style={styles.richContent}>
                <View style={[styles.bubbleBot, { backgroundColor: '#FFFBEB', borderLeftWidth: 3, borderLeftColor: '#F59E0B' }]}>
                  <Text style={{ fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: '#92400E', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Why This Provider?</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Poppins_400Regular', color: '#78350F', lineHeight: 18 }}>{msg.text}</Text>
                </View>
                {msg.timestamp && <Text style={styles.timestamp}>{msg.timestamp}</Text>}
              </View>
            </View>
          </View>
        );

      case 'booking':
        return (
          <View key={msg.id} style={styles.richBubble}>
            <View style={styles.botRow}>
              <View style={styles.avatar}>
                <Ionicons name="construct-outline" size={14} color={Colors.primary} />
              </View>
              <View style={styles.richContent}>
                <View style={styles.bubbleBot}>
                  <Text style={styles.bookingHeaderText}>{msg.text}</Text>
                  <BookingCard {...(msg.bookingData || {})} />
                </View>
                {msg.timestamp && <Text style={styles.timestamp}>{msg.timestamp}</Text>}
              </View>
            </View>
          </View>
        );

      case 'followup':
        const followupReminders = msg.bookingData?.reminders || [];
        const visibleCount = msg.visibleReminderCount ?? 0;
        return (
          <View key={msg.id} style={styles.richBubble}>
            <View style={styles.botRow}>
              <View style={[styles.avatar, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="notifications-outline" size={14} color="#2563EB" />
              </View>
              <View style={styles.richContent}>
                <View style={[styles.bubbleBot, { backgroundColor: '#EFF6FF', borderLeftWidth: 3, borderLeftColor: '#3B82F6' }]}>
                  <Text style={{ fontSize: 11, fontFamily: 'Poppins_600SemiBold', color: '#1E40AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Follow-Up Schedule</Text>
                  {followupReminders.slice(0, visibleCount).map((r: any, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#BFDBFE', justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
                        <Ionicons 
                          name={r.type === 'day_before' ? 'calendar-outline' : r.type === 'hour_before' ? 'alarm-outline' : 'star-outline'} 
                          size={11} color="#1D4ED8" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontFamily: 'Poppins_600SemiBold', color: '#1E40AF', textTransform: 'uppercase' }}>
                          {r.type === 'day_before' ? 'Day Before' : r.type === 'hour_before' ? '1 Hour Before' : 'After Completion'}
                          {r.target === 'provider' ? ' (Provider)' : ''}
                        </Text>
                        <Text style={{ fontSize: 11, fontFamily: 'Poppins_400Regular', color: '#1E3A5F', lineHeight: 16 }}>{r.message}</Text>
                      </View>
                      <View style={{ backgroundColor: '#BBF7D0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 9, color: '#166534', fontFamily: 'Poppins_500Medium' }}>Scheduled ✓</Text>
                      </View>
                    </View>
                  ))}
                  {visibleCount < followupReminders.length && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <ActivityIndicator size={10} color="#3B82F6" />
                      <Text style={{ fontSize: 11, color: '#93C5FD', fontFamily: 'Poppins_400Regular' }}>Scheduling reminders...</Text>
                    </View>
                  )}
                </View>
                {msg.timestamp && <Text style={styles.timestamp}>{msg.timestamp}</Text>}
              </View>
            </View>
          </View>
        );

      case 'voice_note':
        return (
          <VoiceNoteBubble
            key={msg.id}
            uri={msg.voiceUri || ''}
            duration={msg.voiceDuration || 0}
            timestamp={msg.timestamp || ''}
            isUser={msg.isUser}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: Colors.white }}>
      {/* Mobile Overlay (closes sidebar when tapping outside) */}
      {Platform.OS !== 'web' && sidebarVisible && (
        <TouchableOpacity
          style={styles.mobileOverlay}
          activeOpacity={1}
          onPress={() => setSidebarVisible(false)}
        />
      )}

      {/* Sidebar (History) */}
      <Animated.View style={[
        styles.sidebarContainer,
        Platform.OS === 'web' ? { width: sidebarWidth } : { transform: [{ translateX: sidebarTranslateX }] }
      ]}>
        <View style={{ width: Platform.OS === 'web' ? 260 : 300, height: '100%', overflow: 'hidden' }}>
          <View style={styles.sidebarHeader}>
            <TouchableOpacity style={styles.newChatBtn} onPress={startNewChat}>
              <Ionicons name="add-outline" size={20} color={Colors.dark} />
              <Text style={styles.newChatText}>New Chat</Text>
            </TouchableOpacity>
            {Platform.OS !== 'web' && (
               <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                 <Ionicons name="close" size={24} color={Colors.mediumText} />
               </TouchableOpacity>
            )}
          </View>
          <ScrollView style={styles.sidebarList}>
            {sessions.length === 0 && (
              <Text style={styles.emptySidebar}>No past sessions found.</Text>
            )}
            {sessions.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity style={[styles.sidebarItem, sessionId === s.session_id && styles.sidebarItemActive, { flex: 1 }]} onPress={() => loadHistory(s.session_id)}>
                  <Ionicons name="chatbubble-outline" size={16} color={sessionId === s.session_id ? Colors.primary : Colors.mediumText} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.sidebarItemText, sessionId === s.session_id && { color: Colors.primary, fontFamily: 'Poppins_600SemiBold' }]} numberOfLines={1}>{s.title}</Text>
                    <Text style={styles.sidebarItemDate}>{new Date(s.created_at).toLocaleDateString()}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ padding: 12 }} 
                  onPress={() => handleDeleteSession(s.session_id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      {/* Main Chat Area */}
      <Animated.View style={[styles.container, { opacity: fadeAnim, flex: 1 }]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity onPress={() => { loadSessionsList(); setSidebarVisible(!sidebarVisible); }} style={{ marginRight: 12 }}>
              <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.topBarLogo}>
              <Ionicons name="construct-outline" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.topBarTitle}>UstadJee</Text>
              <Text style={styles.topBarSubtitle}>Online</Text>
            </View>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.topBarIcon} onPress={() => {
              // Hackathon Magic: Simulate a booking sync from the phone call
              const mockBookingMsg = {
                id: Date.now().toString(),
                type: 'booking' as any,
                isUser: false,
                text: "Call Log Synced: I have booked the requested service for you based on our phone conversation.",
                timestamp: formatTime(),
                bookingData: {
                  booking_id: `VAPI-${Math.floor(Math.random() * 10000)}`,
                  time: "As soon as possible",
                  date: "Today",
                  status: "Confirmed via Call"
                }
              };
              setMessages(prev => [...prev, mockBookingMsg]);
            }}>
              <Ionicons name="sync-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topBarIcon} onPress={() => {
              import('react-native').then(({ Linking }) => {
                Linking.openURL('https://vapi.ai?demo=true&shareKey=ad91c5cf-d962-4707-b8ce-4e3b88ae7049&assistantId=a055fbd3-8d15-4c5a-b46e-26d2b615a5f5');
              });
            }}>
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topBarIcon} onPress={startNewChat}>
              <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingRow}>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <QuickChips selectedChip={selectedChip} onSelect={handleChipSelect} />

        {recordingState !== 'idle' ? (
          /* ===== WhatsApp-Style Recording Bar ===== */
          <RecordingBar
            state={recordingState}
            duration={recordingDuration}
            isPaused={isPaused}
            onCancel={cancelRecording}
            onSend={sendRecording}
            onPause={pauseRecording}
          />
        ) : (
          /* ===== WhatsApp-Style Input Bar ===== */
          <View style={styles.inputBar}>
            {/* Input field with icons inside */}
            <View style={styles.inputFieldWrap}>
              <TouchableOpacity style={styles.emojiBtn}>
                <Ionicons name="happy-outline" size={24} color={Colors.mediumText} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Message"
                placeholderTextColor={Colors.timestamp}
                multiline
                onSubmitEditing={handleSend}
                onKeyPress={(e: any) => {
                  if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <TouchableOpacity style={styles.inputIcon}>
                <Ionicons name="attach-outline" size={24} color={Colors.mediumText} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.inputIcon}>
                <Ionicons name="camera-outline" size={22} color={Colors.mediumText} />
              </TouchableOpacity>
            </View>

            {/* Separate green circle: mic or send */}
            {inputText.trim() ? (
              <TouchableOpacity
                style={styles.fabBtn}
                onPress={handleSend}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="send" size={20} color={Colors.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.fabBtn}
                onPressIn={startRecording}
                delayPressIn={0}
                activeOpacity={0.7}
              >
                <Ionicons name="mic" size={24} color={Colors.white} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Agent Brain Modal */}
      {traceModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>LangGraph Agent Trace</Text>
              <TouchableOpacity onPress={() => setTraceModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.dark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.traceText}>
                {JSON.stringify(currentTrace, null, 2)}
              </Text>
            </ScrollView>
          </View>
        </View>
      )}
      </Animated.View>
    </View>
  );
}

// ---- Helpers ----

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let _c = 100;
function uid() {
  return (Date.now() + _c++).toString();
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ---- Styles ----

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFEAE2' },
  flex1: { flex: 1 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#008069',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 12, paddingHorizontal: 16,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBarLogo: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  topBarTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' },
  topBarSubtitle: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: -2 },
  topBarRight: { flexDirection: 'row', gap: 4 },
  topBarIcon: { padding: 8 },
  chatArea: { flex: 1, backgroundColor: '#EFEAE2' },
  chatContent: { paddingVertical: 16 },

  // Rich bubbles
  richBubble: { marginBottom: 12, paddingHorizontal: 12 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8, marginTop: 4,
  },
  richContent: { flex: 1 },
  bubbleBot: {
    backgroundColor: Colors.white,
    borderRadius: 16, borderBottomLeftRadius: 4,
    padding: 14, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2,
  },
  headerText: {
    fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.dark, marginBottom: 12,
  },
  timestamp: {
    fontSize: 11, color: Colors.timestamp, marginTop: 4, fontFamily: 'Poppins_400Regular',
  },
  providerHeader: {
    fontSize: 13, fontFamily: 'Poppins_500Medium', color: Colors.dark, marginBottom: 10,
  },
  bookingHeaderText: {
    fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: Colors.dark, marginBottom: 10,
  },

  // Agent steps
  stepsContainer: { gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepCircle: {
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  stepDone: { backgroundColor: Colors.success },
  stepActive: { backgroundColor: '#F59E0B' },
  stepPending: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#D1D5DB' },
  stepLabel: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.dark, flex: 1 },
  stepLabelActive: { color: '#92400E', fontFamily: 'Poppins_500Medium' },

  // Loading
  loadingRow: { paddingHorizontal: 12, marginBottom: 12 },
  loadingBubble: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16, borderBottomLeftRadius: 4,
    paddingVertical: 10, paddingHorizontal: 16,
    alignSelf: 'flex-start', marginLeft: 36, gap: 10,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2,
  },
  loadingText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: Colors.mediumText },

  // Input — WhatsApp style
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingVertical: 6, paddingHorizontal: 6, gap: 6,
    backgroundColor: '#EFEAE2',
  },
  inputFieldWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderRadius: 24, paddingHorizontal: 4, paddingVertical: 4,
    minHeight: 46,
  },
  emojiBtn: {
    padding: 6, marginBottom: 2,
  },
  input: {
    flex: 1, paddingHorizontal: 4, paddingVertical: 6,
    fontSize: 16, fontFamily: 'Poppins_400Regular',
    color: Colors.dark, maxHeight: 100,
  },
  inputIcon: {
    padding: 6, marginBottom: 2,
  },
  fabBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#00A884',
    justifyContent: 'center', alignItems: 'center',
  },
  
  // Agent Brain Modal
  brainBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, marginTop: 8, gap: 4,
  },
  brainBtnText: {
    color: Colors.white, fontSize: 11, fontFamily: 'Poppins_500Medium',
  },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%', maxHeight: '80%', backgroundColor: '#1E1E1E',
    borderRadius: 16, overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.lightBorder,
  },
  modalTitle: {
    fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: Colors.dark,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 16, backgroundColor: '#1E1E1E',
  },
  traceText: {
    color: '#00FF00', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12, lineHeight: 18,
  },
  
  // Sidebar Styles
  mobileOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 90,
  },
  sidebarContainer: {
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    height: '100%',
    position: Platform.OS === 'web' ? 'relative' : 'absolute',
    left: 0, top: 0, bottom: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
    marginRight: 8,
  },
  newChatText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.dark,
  },
  sidebarList: {
    flex: 1,
    padding: 12,
  },
  emptySidebar: {
    textAlign: 'center',
    marginTop: 20,
    color: '#94A3B8',
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: '#E2E8F0',
  },
  sidebarItemText: {
    fontSize: 13,
    color: Colors.dark,
    fontFamily: 'Poppins_400Regular',
  },
  sidebarItemDate: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
});
