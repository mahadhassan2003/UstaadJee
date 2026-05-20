import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MessageBubble from '../components/MessageBubble';
import ProviderCard from '../components/ProviderCard';
import { sendMessageToAgent } from '../api/client';

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    { 
      id: '1', 
      text: 'Assalam o Alaikum! I am the UstaadJee AI Service Orchestrator.\nHow can I help you today?', 
      isUser: false 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef();

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    setInputText('');
    
    setMessages(prev => [...prev, { id: Date.now().toString(), text: userMsg, isUser: true }]);
    setIsLoading(true);

    try {
      const response = await sendMessageToAgent(userMsg);
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        text: response.message, 
        isUser: false,
        data: response.data 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        text: "**Error:** Connection failed. Please check backend server.", 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={styles.messageWrapper}>
      <MessageBubble message={item.text} isUser={item.isUser} />
      {item.data && item.data.best_provider && (
        <ProviderCard provider={item.data.best_provider} />
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>UstaadJee Orchestrator</Text>
          <View style={styles.onlineContainer}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerSubtitle}>System Online</Text>
          </View>
        </View>
      </View>

      <View style={styles.chatBackground}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
        />

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0F172A" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe your issue..."
            placeholderTextColor="#94A3B8"
            multiline
          />
        </View>
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons name="arrow-up" size={20} color={inputText.trim() ? "#FFFFFF" : "#94A3B8"} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0', // Slate 200
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A', // Slate 900
    letterSpacing: -0.3,
  },
  onlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981', // Emerald 500
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B', // Slate 500
  },
  chatBackground: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate 50
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 10,
  },
  loadingText: {
    marginLeft: 10,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1', // Slate 300
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 10,
    minHeight: 44,
  },
  input: {
    fontSize: 15,
    maxHeight: 120,
    color: '#0F172A',
  },
  sendButton: {
    backgroundColor: '#0F172A',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F1F5F9', // Slate 100
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
