import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type Props = {
  message: string;
  isUser: boolean;
  timestamp?: string;
};

export default function MessageBubble({ message, isUser, timestamp }: Props) {
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="construct-outline" size={14} color={Colors.primary} />
        </View>
      )}
      <View style={{ maxWidth: '82%' }}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          {isUser ? (
            <Text style={styles.textUser}>{message}</Text>
          ) : (
            <Markdown style={mdStyles}>{message}</Markdown>
          )}
          {/* Timestamp INSIDE bubble — WhatsApp style */}
          {timestamp && (
            <View style={styles.metaRow}>
              <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
                {timestamp}
              </Text>
              {isUser && (
                <Ionicons
                  name="checkmark-done"
                  size={16}
                  color="rgba(255,255,255,0.7)"
                  style={{ marginLeft: 3 }}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 3,
    paddingHorizontal: 12,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  bubble: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  bubbleBot: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 0,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  bubbleUser: {
    backgroundColor: '#005C4B',
    borderTopRightRadius: 0,
  },
  textUser: {
    color: Colors.white,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    gap: 2,
  },
  timestamp: {
    fontSize: 11,
    color: Colors.timestamp,
    fontFamily: 'Poppins_400Regular',
  },
  timestampUser: {
    color: 'rgba(255,255,255,0.6)',
  },
});

// Markdown styles for bot messages
const mdStyles = StyleSheet.create({
  body: {
    color: Colors.dark,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  strong: {
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 4,
  },
  heading1: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
    marginBottom: 6,
  },
  heading2: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
    marginBottom: 4,
  },
  heading3: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_500Medium',
    color: Colors.dark,
    marginBottom: 4,
  },
  bullet_list: {
    marginLeft: 8,
  },
  ordered_list: {
    marginLeft: 8,
  },
  list_item: {
    marginBottom: 2,
  },
  code_inline: {
    backgroundColor: Colors.primaryLight,
    color: Colors.primary,
    fontFamily: 'monospace',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 12,
  },
  fence: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    borderRadius: 6,
  },
  th: {
    backgroundColor: Colors.primaryLight,
    padding: 6,
  },
  td: {
    padding: 6,
    borderTopWidth: 1,
    borderColor: Colors.lightBorder,
  },
  em: {
    fontStyle: 'italic',
  },
  hr: {
    backgroundColor: Colors.lightBorder,
    height: 1,
    marginVertical: 8,
  },
});
