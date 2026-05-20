import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import LiveWaveform from './LiveWaveform';

type RecordingState = 'recording' | 'locked' | 'idle';

type Props = {
  state: RecordingState;
  duration: number;
  isPaused: boolean;
  onCancel: () => void;
  onSend: () => void;
  onPause: () => void;
};

export default function RecordingBar({ state, duration, isPaused, onCancel, onSend, onPause }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;
  const slideHint = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(1, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  useEffect(() => {
    // Red dot pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    if (state === 'recording') {
      // Mic glow pulse
      Animated.loop(
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();

      // Slide hint oscillation
      Animated.loop(
        Animated.sequence([
          Animated.timing(slideHint, { toValue: -8, duration: 800, useNativeDriver: true }),
          Animated.timing(slideHint, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }

    return () => {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0.5);
      slideHint.setValue(0);
    };
  }, [state]);

  if (state === 'locked') {
    return (
      <View style={styles.bar}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Ionicons name="trash-outline" size={20} color={Colors.recordingRed} />
        </TouchableOpacity>

        <View style={styles.center}>
          <View style={styles.timerRow}>
            <Animated.View style={[styles.redDot, { opacity: dotPulse }]} />
            <Text style={styles.timer}>{formatTime(duration)}</Text>
          </View>
          <LiveWaveform barCount={32} barColor={Colors.recordingRed} isActive={!isPaused} barWidth={2.5} maxHeight={22} minHeight={3} />
        </View>

        <TouchableOpacity style={styles.pauseBtn} onPress={onPause}>
          <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color={Colors.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
          <Ionicons name="send" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    );
  }

  // State: recording (swipe-active)
  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Ionicons name="trash-outline" size={20} color={Colors.recordingRed} />
      </TouchableOpacity>

      <Animated.Text style={[styles.slideText, { transform: [{ translateX: slideHint }] }]}>
        {'< Slide to cancel'}
      </Animated.Text>

      <View style={styles.center}>
        <View style={styles.timerRow}>
          <Animated.View style={[styles.redDot, { opacity: dotPulse }]} />
          <Text style={styles.timer}>{formatTime(duration)}</Text>
        </View>
        <LiveWaveform barCount={24} barColor={Colors.recordingRed} isActive={!isPaused} barWidth={2.5} maxHeight={20} minHeight={3} />
      </View>

      {/* Pulsing mic button */}
      <View style={styles.micWrap}>
        <Animated.View style={[styles.micPulse, { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }]} />
        <View style={styles.micBtn}>
          <Ionicons name="mic" size={22} color={Colors.white} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFEAE2',
    gap: 10,
    minHeight: 56,
  },
  cancelBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  slideText: {
    fontSize: 12, fontFamily: 'Poppins_400Regular', color: Colors.cancelGray,
  },
  center: {
    flex: 1, alignItems: 'center', gap: 2,
  },
  timerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  redDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.recordingRed,
  },
  timer: {
    fontSize: 14, fontFamily: 'Poppins_500Medium', color: Colors.recordingRed,
  },
  micWrap: {
    width: 52, height: 52, justifyContent: 'center', alignItems: 'center',
  },
  micPulse: {
    position: 'absolute',
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.recordingRed,
  },
  micBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.recordingRed,
    justifyContent: 'center', alignItems: 'center',
  },
  pauseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#374151',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
});
