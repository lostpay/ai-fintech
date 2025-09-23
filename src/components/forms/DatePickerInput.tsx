/**
 * DatePickerInput Component - Material Design 3 Date Picker Integration
 * Implements Story 2.3 requirements for Material Design date picker
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerInputProps {
  value: Date;
  onDateChange: (date: Date) => void;
  error?: string;
  testID?: string;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onDateChange,
  error,
  testID = 'date-picker-input'
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      onDateChange(selectedDate);
    }
  };

  const handlePress = () => {
    setShowPicker(true);
  };

  const formatDate = (date: Date): string => {
    // Ensure we have a valid date
    const validDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
    return validDate.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDisplayDate = (): string => {
    // Ensure value is a valid date
    const dateToUse = value instanceof Date && !isNaN(value.getTime()) ? value : new Date();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Compare dates without time
    const valueDate = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    if (valueDate.getTime() === todayDate.getTime()) {
      return 'Today';
    } else if (valueDate.getTime() === yesterdayDate.getTime()) {
      return 'Yesterday';
    } else {
      return formatDate(dateToUse);
    }
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, error && styles.labelError]}>
        Date
      </Text>
      
      {/* Date Input Button */}
      <TouchableOpacity
        style={[
          styles.inputButton,
          error && styles.inputButtonError
        ]}
        onPress={handlePress}
        testID={testID}
        accessibilityLabel="Select transaction date"
        accessibilityHint="Tap to open date picker"
        accessibilityRole="button"
      >
        {/* Calendar Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.calendarIcon}>📅</Text>
        </View>
        
        {/* Date Text */}
        <Text style={styles.dateText}>
          {getDisplayDate()}
        </Text>
        
        {/* Dropdown Arrow */}
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>
      
      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      {/* Helper Text */}
      {!error && (
        <Text style={styles.helperText}>Select the date of your expense</Text>
      )}
      
      {/* Date Picker Modal */}
      {showPicker && (
        <DateTimePicker
          testID="date-picker"
          value={value instanceof Date && !isNaN(value.getTime()) ? value : new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()} // Cannot select future dates
          minimumDate={new Date(new Date().getFullYear() - 1, 0, 1)} // 1 year back
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#424242',
    marginBottom: 8,
    marginLeft: 4,
  },
  labelError: {
    color: '#D32F2F',
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    minHeight: 56, // Material Design standard height
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputButtonError: {
    borderColor: '#D32F2F',
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  calendarIcon: {
    fontSize: 20,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default DatePickerInput;