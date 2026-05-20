import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';

export default function BookingConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    providerName: string;
    price: string;
    time: string;
  }>();

  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const providerName = params.providerName || 'Ali AC Services';
  const price = params.price || 'Rs 1,200';
  const time = params.time || '9:00 AM';

  const details = [
    { label: 'Provider', value: providerName },
    { label: 'Service', value: 'AC Technician' },
    { label: 'Date', value: `Tomorrow, ${time}` },
    { label: 'Location', value: 'G-10, Islamabad' },
    { label: 'Estimated Rate', value: price },
    { label: 'Status', value: 'Confirmed', isStatus: true },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.dark} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Confirmed</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card */}
        <View style={styles.card}>
          {/* Success Animation */}
          <Animated.View
            style={[styles.successCircle, { transform: [{ scale: checkScale }] }]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={36}
              color={Colors.primary}
            />
          </Animated.View>

          <Text style={styles.confirmTitle}>Booking Confirmed!</Text>
          <Text style={styles.bookingId}>KC-78432</Text>

          <View style={styles.divider} />

          {/* Details */}
          {details.map((d, i) => (
            <View
              key={i}
              style={[styles.detailRow, i < details.length - 1 && styles.detailRowBorder]}
            >
              <Text style={styles.detailLabel}>{d.label}</Text>
              <Text
                style={[
                  styles.detailValue,
                  d.isStatus && { color: Colors.primary },
                ]}
              >
                {d.value}
                {d.isStatus && ' \u2713'}
              </Text>
            </View>
          ))}

          {/* Reminder Notice */}
          <View style={styles.reminderBox}>
            <Ionicons name="notifications-outline" size={18} color={Colors.accentOrange} />
            <Text style={styles.reminderText}>
              Reminder 1 hour pehlay bheja jayega
            </Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Download Slip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.8}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.secondaryBtnText}>Book Another Service</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.appBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightBorder,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.dark,
    marginLeft: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  confirmTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
    textAlign: 'center',
    marginTop: 12,
  },
  bookingId: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mediumText,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.lightBorder,
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBg,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mediumText,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: Colors.dark,
  },
  reminderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  reminderText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#92400E',
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.white,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: Colors.primary,
  },
});
