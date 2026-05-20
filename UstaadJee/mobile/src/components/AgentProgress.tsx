import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type Step = {
  label: string;
  status: 'done' | 'active' | 'pending';
};

type Props = {
  steps: Step[];
  headerText?: string;
};

export default function AgentProgress({ steps, headerText }: Props) {
  return (
    <View style={styles.container}>
      {headerText && <Text style={styles.header}>{headerText}</Text>}
      {steps.map((step, i) => (
        <AgentStep key={i} step={step} index={i} />
      ))}
    </View>
  );
}

function AgentStep({ step, index }: { step: Step; index: number }) {
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 150,
        useNativeDriver: true,
      }),
    ]).start();

    if (step.status === 'active') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  return (
    <Animated.View
      style={[
        styles.stepRow,
        { transform: [{ translateX: slideAnim }], opacity: fadeAnim },
      ]}
    >
      <Animated.View
        style={[
          styles.circle,
          step.status === 'done' && styles.circleDone,
          step.status === 'active' && styles.circleActive,
          step.status === 'pending' && styles.circlePending,
          step.status === 'active' && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        {step.status === 'done' && (
          <Ionicons name="checkmark" size={10} color={Colors.white} />
        )}
        {step.status === 'active' && (
          <Ionicons name="reload-outline" size={10} color={Colors.white} />
        )}
      </Animated.View>
      <Text
        style={[
          styles.label,
          step.status === 'done' && styles.labelDone,
          step.status === 'active' && styles.labelActive,
          step.status === 'pending' && styles.labelPending,
        ]}
      >
        {step.label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleDone: {
    backgroundColor: Colors.success,
  },
  circleActive: {
    backgroundColor: '#F59E0B',
  },
  circlePending: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  label: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  labelDone: {
    color: Colors.dark,
  },
  labelActive: {
    color: '#92400E',
    fontFamily: 'Poppins_500Medium',
  },
  labelPending: {
    color: '#D1D5DB',
  },
});
