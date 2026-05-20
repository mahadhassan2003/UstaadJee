import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type Provider = {
  id?: string;
  name: string;
  initials: string;
  distance: string;
  rating: string;
  reviews: string;
  time: string;
  price: string;
  recommended?: boolean;
};

type Props = {
  providers: Provider[];
  onBook: (provider: Provider) => void;
};

export default function ProviderCards({ providers, onBook }: Props) {
  // Keep track of which provider was booked
  const [bookedProviderId, setBookedProviderId] = useState<string | null>(null);

  const handleBookClick = (p: Provider) => {
    // We use name as a fallback ID if 'id' isn't available
    setBookedProviderId(p.id || p.name);
    onBook(p);
  };

  return (
    <View style={styles.container}>
      {providers.map((p, i) => (
        <ProviderCardItem
          key={i}
          provider={p}
          index={i}
          onBook={handleBookClick}
          isBooked={bookedProviderId === (p.id || p.name)}
          hasAnyBooking={bookedProviderId !== null}
        />
      ))}
    </View>
  );
}

function ProviderCardItem({
  provider,
  index,
  onBook,
  isBooked,
  hasAnyBooking,
}: {
  provider: Provider;
  index: number;
  onBook: (p: Provider) => void;
  isBooked: boolean;
  hasAnyBooking: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isRec = provider.recommended;

  return (
    <Animated.View
      style={[
        styles.card,
        isRec && !hasAnyBooking && styles.cardRecommended,
        isBooked && styles.cardBooked,
        { transform: [{ translateY: slideAnim }], opacity: fadeAnim },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.initialsCircle}>
          <Text style={styles.initialsText}>{provider.initials}</Text>
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.providerName}>{provider.name}</Text>
        </View>
        {isRec && !hasAnyBooking && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Recommended</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <StatItem icon="location-outline" value={provider.distance} />
        <StatItem icon="star" value={`${provider.rating} (${provider.reviews})`} />
        <StatItem icon="time-outline" value={provider.time} />
        <StatItem icon="cash-outline" value={provider.price} />
      </View>

      {/* Show Book button if NO booking has been made yet */}
      {!hasAnyBooking && (
        <TouchableOpacity
          style={isRec ? styles.bookButtonMain : styles.bookButtonSecondary}
          onPress={() => onBook(provider)}
          activeOpacity={0.8}
        >
          <Text style={isRec ? styles.bookButtonTextMain : styles.bookButtonTextSecondary}>
            Book {provider.name.split(' ')[0]}
          </Text>
          {isRec && <Ionicons name="arrow-forward" size={14} color={Colors.white} />}
        </TouchableOpacity>
      )}

      {/* Show Booked badge ONLY on the specific card that was booked */}
      {isBooked && (
        <View style={styles.bookedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.bookedBadgeText}>Booked</Text>
        </View>
      )}
    </Animated.View>
  );
}

function StatItem({ icon, value }: { icon: any; value: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={13} color={Colors.mediumText} />
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    borderRadius: 12,
    backgroundColor: Colors.white,
    padding: 12,
  },
  cardRecommended: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  cardBooked: {
    borderColor: Colors.success,
    backgroundColor: '#F0FDF4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  initialsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  initialsText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.primary,
  },
  nameCol: {
    flex: 1,
  },
  providerName: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.dark,
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mediumText,
  },
  bookButtonMain: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    height: 36,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  bookButtonTextMain: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: Colors.white,
  },
  bookButtonSecondary: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    height: 36,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  bookButtonTextSecondary: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: Colors.primary,
  },
  bookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookedBadgeText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: Colors.success,
  },
});
