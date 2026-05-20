import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Colors } from '../constants/colors';

type Props = {
  uri: string;
  duration: number;
  timestamp: string;
  isUser?: boolean;
};

export default function VoiceNoteBubble({ uri, duration, timestamp, isUser = true }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const [barHeights] = useState(() =>
    Array.from({ length: 28 }, () => Math.random() * 0.7 + 0.15)
  );

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      await soundRef.current?.pauseAsync();
      setIsPlaying(false);
      return;
    }
    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setPlaybackPosition(status.positionMillis / 1000);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPlaybackPosition(0);
                soundRef.current = null;
              }
            }
          }
        );
        soundRef.current = sound;
      }
      setIsPlaying(true);
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const bubbleBg = isUser ? '#005C4B' : Colors.white;
  const waveColor = isUser ? 'rgba(255,255,255,0.5)' : '#A0AEC0';
  const waveActiveColor = isUser ? '#FFFFFF' : Colors.primary;
  const textColor = isUser ? 'rgba(255,255,255,0.7)' : Colors.mediumText;
  const playBtnBg = 'transparent';
  const playIconColor = isUser ? '#FFFFFF' : Colors.primary;

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={[styles.bubble, { backgroundColor: bubbleBg }, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <View style={styles.content}>
          {/* Avatar (Left side) */}
          <View style={styles.avatarWrap}>
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?img=68' }} 
              style={styles.avatar} 
            />
            {isUser && (
              <View style={styles.micOverlay}>
                <Ionicons name="mic" size={10} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Right Content */}
          <View style={styles.rightContent}>
            {/* Player Row */}
            <View style={styles.playerRow}>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={togglePlayback}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color={playIconColor}
                  style={isPlaying ? {} : { marginLeft: 2 }}
                />
              </TouchableOpacity>

              <View style={styles.waveArea}>
                <View style={styles.waveform}>
                  {/* Playhead dot */}
                  <View style={[
                    styles.playhead, 
                    { 
                      left: `${(playbackPosition / Math.max(duration, 1)) * 100}%`,
                      backgroundColor: waveActiveColor
                    }
                  ]} />
                  {barHeights.map((h, i) => {
                    const progress = playbackPosition / Math.max(duration, 1);
                    const isActive = i / barHeights.length < progress;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.bar,
                          {
                            height: 6 + h * 16,
                            backgroundColor: isActive ? waveActiveColor : waveColor,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Footer Row (Duration + Timestamp) */}
            <View style={styles.footerRow}>
              <Text style={[styles.duration, { color: textColor }]}>
                {isPlaying ? fmt(playbackPosition) : fmt(duration)}
              </Text>
              
              <View style={styles.metaRow}>
                <Text style={[styles.timestamp, { color: textColor }]}>{timestamp}</Text>
                {isUser && (
                  <Ionicons name="checkmark-done" size={16} color="#38BDF8" style={{ marginLeft: 3 }} />
                )}
              </View>
            </View>

          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: 12,
    padding: 6,
    paddingRight: 10,
    maxWidth: '85%',
    minWidth: '65%',
  },
  bubbleUser: {
    borderTopRightRadius: 0,
  },
  bubbleBot: {
    borderTopLeftRadius: 0,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  micOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#38BDF8', // Blue mic badge
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#005C4B',
  },
  rightContent: {
    flex: 1,
    justifyContent: 'center',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveArea: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 32,
    position: 'relative',
  },
  playhead: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    top: 11,
    transform: [{ translateX: -5 }],
    zIndex: 10,
  },
  bar: {
    width: 2.5,
    borderRadius: 1.25,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -4,
  },
  duration: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    marginLeft: 40, // align under waveform
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
  },
});
