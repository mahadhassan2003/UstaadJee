import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

const CHIPS = ['Plumber', 'Electrician', 'AC Technician', 'Tutor', 'Beautician', 'Carpenter'];

type Props = {
  selectedChip: string | null;
  onSelect: (chip: string) => void;
};

export default function QuickChips({ selectedChip, onSelect }: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {CHIPS.map((chip) => {
          const isSelected = selectedChip === chip;
          return (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelect(chip)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {chip}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  container: {
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.lightBorder,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: Colors.mediumText,
  },
  chipTextSelected: {
    color: Colors.primary,
    fontFamily: 'Poppins_500Medium',
  },
});
