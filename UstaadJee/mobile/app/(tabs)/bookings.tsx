import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { fetchBookings } from '../../src/api/client';

type Booking = {
  id: string;
  service: string;
  serviceIcon: keyof typeof Ionicons.glyphMap;
  provider: string;
  date: string;
  location: string;
  status: 'upcoming' | 'completed';
};

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      const data = await fetchBookings();
      if (data && data.bookings) {
        // Map the backend data to our frontend format
        const formattedBookings: Booking[] = Object.values(data.bookings).map((b: any) => {
          
          let icon: keyof typeof Ionicons.glyphMap = 'construct-outline';
          const type = b.service_type || '';
          if (type.includes('ac')) icon = 'snow-outline';
          else if (type.includes('plumb')) icon = 'water-outline';
          else if (type.includes('electric')) icon = 'flash-outline';
          else if (type.includes('clean')) icon = 'sparkles-outline';

          return {
            id: b.booking_id || String(Math.random()),
            service: b.service_type || 'Service',
            serviceIcon: icon,
            provider: b.provider_name || 'Provider',
            date: `${b.booking_date}, ${b.booking_time}`,
            location: b.location_area || 'Location',
            status: b.status === 'confirmed' ? 'upcoming' : 'completed',
          };
        });
        
        // Sort newest first safely
        formattedBookings.sort((a, b) => String(b.id).localeCompare(String(a.id)));
        setBookings(formattedBookings);
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reload bookings whenever this tab is focused
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  const filtered = bookings.filter((b) => b.status === activeTab);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={Colors.lightBorder} />
              <Text style={styles.emptyText}>No {activeTab} bookings</Text>
            </View>
          ) : (
            filtered.map((booking) => (
              <View key={booking.id} style={styles.card}>
                <View style={styles.cardRow1}>
                  <View style={styles.serviceIconCircle}>
                    <Ionicons name={booking.serviceIcon} size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.serviceName}>{booking.service}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      booking.status === 'upcoming'
                        ? styles.statusUpcoming
                        : styles.statusDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        booking.status === 'upcoming'
                          ? styles.statusTextUpcoming
                          : styles.statusTextDone,
                      ]}
                    >
                      {booking.status === 'upcoming' ? 'Upcoming' : 'Done'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.providerName}>{booking.provider}</Text>
                <View style={styles.cardRow3}>
                  <Text style={styles.detailText}>{booking.date}</Text>
                  <Text style={styles.detailText}>{booking.location}</Text>
                </View>
                {booking.status === 'upcoming' && (
                  <TouchableOpacity style={styles.viewDetailsBtn}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.appBg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mediumText,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: 'Poppins_500Medium',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mediumText,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    padding: 14,
  },
  cardRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  serviceName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
    textTransform: 'capitalize',
  },
  statusBadge: {
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  statusUpcoming: {
    backgroundColor: '#FEF3C7',
  },
  statusDone: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
  },
  statusTextUpcoming: {
    color: '#92400E',
  },
  statusTextDone: {
    color: '#065F46',
  },
  providerName: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mediumText,
    marginLeft: 42,
    marginBottom: 6,
  },
  cardRow3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 42,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mediumText,
  },
  viewDetailsBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  viewDetailsText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: Colors.primary,
  },
});
