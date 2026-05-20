import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';

export default function SplashScreenPage() {
  const router = useRouter();

  // --- Triple ripple rings ---
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.8)).current;

  // Logo breathing
  const logoScale = useRef(new Animated.Value(1)).current;

  // Text staggered fade-up
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;

  // Loading dots
  const dot1 = useRef(new Animated.Value(0.2)).current;
  const dot2 = useRef(new Animated.Value(0.2)).current;
  const dot3 = useRef(new Animated.Value(0.2)).current;

  // Fade out
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Outer ripple ring: scale 1→1.8, opacity 0.6→0 in 1.8s loop
    Animated.loop(
      Animated.parallel([
        Animated.timing(ring1Scale, { toValue: 1.8, duration: 1800, useNativeDriver: true }),
        Animated.timing(ring1Opacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    // Inner ring: scale 1→1.4, opacity 0.8→0 in 1.8s loop, 200ms delay
    setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(ring2Scale, { toValue: 1.4, duration: 1800, useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ])
      ).start();
    }, 200);

    // Logo breathing: scale pulses 1.0→1.08→1.0 in 2s loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // Staggered text fade-up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 300);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(taglineTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }, 500);

    // Loading dots stagger
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    };
    animateDot(dot1, 0);
    animateDot(dot2, 200);
    animateDot(dot3, 400);

    // Navigate after 2.5s with fade out
    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        router.replace('/(tabs)');
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <View style={styles.center}>
        {/* Outer ripple ring */}
        <Animated.View
          style={[
            styles.outerRing,
            { transform: [{ scale: ring1Scale }], opacity: ring1Opacity },
          ]}
        />
        {/* Inner ripple ring */}
        <Animated.View
          style={[
            styles.innerRing,
            { transform: [{ scale: ring2Scale }], opacity: ring2Opacity },
          ]}
        />
        {/* Logo circle */}
        <Animated.View style={[styles.logoCircle, { transform: [{ scale: logoScale }] }]}>
          <Ionicons name="construct-outline" size={32} color={Colors.primary} />
        </Animated.View>

        {/* App name - staggered fade up */}
        <Animated.Text
          style={[
            styles.appName,
            { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] },
          ]}
        >
          UstadJee
        </Animated.Text>

        {/* Tagline - staggered fade up */}
        <Animated.Text
          style={[
            styles.tagline,
            { opacity: taglineOpacity, transform: [{ translateY: taglineTranslateY }] },
          ]}
        >
          Apka karigar, ek message mein
        </Animated.Text>

        {/* Loading dots */}
        <View style={styles.dotsRow}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(27,140,110,0.1)',
  },
  innerRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(27,140,110,0.15)',
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 30,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
    marginTop: 24,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mediumText,
    marginTop: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
