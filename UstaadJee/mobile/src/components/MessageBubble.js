import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

export default function MessageBubble({ message, isUser }) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.botContainer]}>
      {isUser ? (
        <Text style={styles.userText}>{message}</Text>
      ) : (
        <Markdown style={markdownStyles}>{message}</Markdown>
      )}
      <Text style={[styles.time, isUser ? styles.userTime : styles.botTime]}>
        {time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
  },
  userContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#0F172A', // Slate 900
    borderColor: '#0F172A',
    borderBottomRightRadius: 2,
  },
  botContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0', // Slate 200
    borderBottomLeftRadius: 2,
  },
  userText: {
    color: '#F8FAFC', // Slate 50
    fontSize: 15,
    lineHeight: 22,
  },
  time: {
    fontSize: 10,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  userTime: {
    color: '#94A3B8', // Slate 400
  },
  botTime: {
    color: '#94A3B8', // Slate 400
  },
});

const markdownStyles = {
  body: {
    color: '#0F172A', // Slate 900
    fontSize: 15,
    lineHeight: 22,
  },
  heading1: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  heading2: { fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  heading3: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  strong: { fontWeight: '700' },
  paragraph: { marginVertical: 4 },
  bullet_list: { marginLeft: 16 },
  code_inline: { backgroundColor: '#F1F5F9', padding: 2, borderRadius: 4, fontFamily: 'monospace' },
};
