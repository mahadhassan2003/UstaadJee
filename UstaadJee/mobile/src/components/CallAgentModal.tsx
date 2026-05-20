import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Audio } from 'expo-av';

interface CallAgentModalProps {
  visible: boolean;
  onClose: () => void;
}

// ... HTML string remains the same ...
const vapiHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    body { background-color: #EFEAE2; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
    .orb { width: 150px; height: 150px; border-radius: 50%; background: linear-gradient(135deg, #008069, #128C7E); display: flex; justify-content: center; align-items: center; box-shadow: 0 10px 30px rgba(0,128,105,0.4); margin-bottom: 40px; transition: all 0.3s ease; }
    .orb.active { animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,128,105,0.7); } 70% { transform: scale(1.1); box-shadow: 0 0 0 20px rgba(0,128,105,0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,128,105,0); } }
    .mic-icon { font-size: 60px; color: white; }
    .call-btn { background-color: #008069; color: white; border: none; padding: 16px 40px; border-radius: 30px; font-size: 18px; font-weight: bold; width: 80%; max-width: 300px; }
    .call-btn.active { background-color: #EF4444; }
    .status-text { margin-top: 20px; font-size: 16px; color: #555; text-align: center; margin-bottom: 20px; }
  </style>
  <script src="https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js"></script>
</head>
<body>
  <div id="orb" class="orb"><div class="mic-icon">🎙️</div></div>
  <div id="status" class="status-text">Ready to call AI Dispatcher</div>
  <button id="callBtn" class="call-btn">Tap to Start Call</button>
  
  <script>
    const callBtn = document.getElementById('callBtn');
    const orb = document.getElementById('orb');
    const statusText = document.getElementById('status');
    var vapiInstance = null;

    callBtn.addEventListener('click', async function() {
      if (!vapiInstance) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          
          statusText.innerText = 'Connecting...';
          callBtn.innerText = 'Connecting...';
          
          vapiInstance = window.vapiSDK.run({
            apiKey: 'ad91c5cf-d962-4707-b8ce-4e3b88ae7049',
            assistant: 'a055fbd3-8d15-4c5a-b46e-26d2b615a5f5',
            config: {}
          });
          
          vapiInstance.on('call-start', () => {
             statusText.innerText = 'Listening & Speaking...';
             callBtn.innerText = 'Tap to End Call';
             callBtn.classList.add('active');
             orb.classList.add('active');
          });
          
          vapiInstance.on('call-end', () => {
             statusText.innerText = 'Call Ended';
             callBtn.innerText = 'Tap to Start Call';
             callBtn.classList.remove('active');
             orb.classList.remove('active');
             vapiInstance = null;
          });
        } catch(err) {
          statusText.innerText = 'Microphone permission denied';
          alert("Microphone permission is required to talk to the AI.");
        }
      } else {
        vapiInstance.stop();
      }
    });
  </script>
</body>
</html>
`;

export default function CallAgentModal({ visible, onClose }: CallAgentModalProps) {
  React.useEffect(() => {
    if (visible) {
      // Force native microphone permission request before WebView tries
      Audio.requestPermissionsAsync().catch(console.error);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Dispatcher</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={Colors.dark} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <WebView
            originWhitelist={['*']}
            source={{ html: vapiHtml }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFEAE2', // WhatsApp chat background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
  },
  closeBtn: {
    position: 'absolute',
    right: 15,
  },
  content: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  }
});
