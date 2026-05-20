import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type Props = {
  booking: {
    booking_id?: string;
    date?: string;
    time?: string;
    status?: string;
  };
  provider: {
    name?: string;
    phone?: string;
  };
  service?: string;
  location?: string;
  price?: string;
};

export default function BookingCard({ booking, provider, service, location, price }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const details = [
    { label: 'Provider', value: provider?.name || '-' },
    { label: 'Service', value: service || '-' },
    { label: 'Date', value: booking?.date ? `${booking.date}, ${booking.time}` : '-' },
    { label: 'Location', value: location || '-' },
    { label: 'Rate', value: price || '-' },
    { label: 'Status', value: booking?.status === 'confirmed' ? 'Confirmed' : booking?.status || '-', isStatus: true },
  ];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
        </Animated.View>
        <View>
          <Text style={styles.title}>Booking Confirmed</Text>
          <Text style={styles.bookingId}>ID: {booking?.booking_id || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Details Table */}
      {details.map((d, i) => (
        <View key={i} style={[styles.detailRow, i < details.length - 1 && styles.detailRowBorder]}>
          <Text style={styles.detailLabel}>{d.label}</Text>
          <Text style={[styles.detailValue, d.isStatus && styles.statusValue]}>
            {d.value}
          </Text>
        </View>
      ))}

      {/* Reminder */}
      <View style={styles.reminder}>
        <Text style={styles.reminderText}>
          Reminder 1 hour pehlay bhej denge. {provider?.name?.split(' ')[0]} aapko call karega arrival say pehlay.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
  },
  bookingId: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mediumText,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.lightBorder,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mediumText,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: Colors.dark,
  },
  statusValue: {
    color: Colors.primary,
  },
  reminder: {
    backgroundColor: '#FFF7ED',
    padding: 12,
  },
  reminderText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#92400E',
    lineHeight: 16,
  },
});
