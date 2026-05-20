import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

type Props = {
  barCount?: number;
  barColor?: string;
  isActive?: boolean;
  barWidth?: number;
  maxHeight?: number;
  minHeight?: number;
};

export default function LiveWaveform({
  barCount = 40,
  barColor = '#1B8C6E',
  isActive = true,
  barWidth = 2,
  maxHeight = 24,
  minHeight = 4,
}: Props) {
  const anims = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(Math.random() * 0.5 + 0.2))
  ).current;

  useEffect(() => {
    if (!isActive) {
      anims.forEach((a) => a.stopAnimation());
      return;
    }

    const animations = anims.map((anim) => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(anim, {
            toValue: Math.random() * 0.8 + 0.2,
            duration: 80 + Math.random() * 120,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: Math.random() * 0.3 + 0.1,
            duration: 80 + Math.random() * 120,
            useNativeDriver: false,
          }),
        ]).start(() => {
          if (isActive) animate();
        });
      };
      animate();
      return anim;
    });

    return () => {
      animations.forEach((a) => a.stopAnimation());
    };
  }, [isActive]);

  return (
    <View style={styles.container}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              width: barWidth,
              backgroundColor: barColor,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [minHeight, maxHeight],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
    height: 28,
    overflow: 'hidden',
  },
  bar: {
    borderRadius: 1,
  },
});
