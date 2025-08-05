/**
 * AmountInput Component - Material Design 3 Currency Input
 * Implements Story 2.3 requirements for professional amount input with currency formatting
 */

import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

interface AmountInputProps {
  value: number; // Amount in cents
  onValueChange: (amountInCents: number) => void;
  error?: string;
  testID?: string;
}

const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onValueChange,
  error,
  testID = 'amount-input'
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Convert cents to display format
  useEffect(() => {
    if (value === 0) {
      setDisplayValue('');
    } else {
      const dollars = value / 100;
      setDisplayValue(dollars.toFixed(2));
    }
  }, [value]);

  const formatCurrency = (text: string): string => {
    // Remove all non-digit characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    
    // Handle multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return cleaned;
  };

  const parseCurrencyInput = (text: string): number => {
    const cleaned = formatCurrency(text);
    if (!cleaned || cleaned === '.') return 0;
    
    const amount = parseFloat(cleaned);
    if (isNaN(amount)) return 0;
    
    // Convert to cents and ensure it's within reasonable limits
    const cents = Math.round(amount * 100);
    return Math.min(cents, 100000000); // $1M limit
  };

  const handleTextChange = (text: string) => {
    const formatted = formatCurrency(text);
    setDisplayValue(formatted);
    
    const centsValue = parseCurrencyInput(formatted);
    onValueChange(centsValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format the final value properly
    if (displayValue && !isNaN(parseFloat(displayValue))) {
      const amount = parseFloat(displayValue);
      setDisplayValue(amount.toFixed(2));
    }
  };

  return (
    <View style={styles.container}>      
      {/* Input Container */}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError
      ]}>
        {/* Floating Label */}
        <Text style={[
          styles.label,
          (isFocused || displayValue) && styles.labelFloating,
          error && styles.labelError
        ]}>
          Amount
        </Text>
        
        <View style={styles.inputRow}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.textInput}
            value={displayValue}
            onChangeText={handleTextChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType="numeric"
            placeholder={isFocused || displayValue ? '' : '0.00'}
            placeholderTextColor="#9E9E9E"
            testID={testID}
            accessibilityLabel="Transaction amount"
            accessibilityHint="Enter the amount you spent"
          />
        </View>
      </View>
      
      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      
      {/* Helper Text */}
      {!error && (
        <Text style={styles.helperText}>Enter amount in dollars</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    position: 'absolute',
    left: 12,
    top: -8,
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  labelFloating: {
    top: -8,
    fontSize: 12,
    color: '#1976D2',
  },
  labelError: {
    color: '#D32F2F',
  },
  inputContainer: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    minHeight: 56, // Material Design filled text field height
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    position: 'relative',
  },
  inputContainerFocused: {
    borderColor: '#1976D2',
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: '#D32F2F',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
    paddingVertical: 4,
    minHeight: 32, // Touch target requirement
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 4,
    marginLeft: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginLeft: 16,
  },
});

export default AmountInput;