/**
 * DescriptionInput Component - Material Design 3 Description Input
 * Implements Story 2.3 requirements for floating label description input
 */

import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

interface DescriptionInputProps {
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  maxLength?: number;
  testID?: string;
}

const DescriptionInput: React.FC<DescriptionInputProps> = ({
  value,
  onValueChange,
  error,
  maxLength = 100,
  testID = 'description-input'
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const getCharacterCountInfo = () => {
    const length = value.length;
    const remaining = maxLength - length;
    const isNearLimit = remaining <= 20;
    
    return {
      text: `${length}/${maxLength}`,
      color: isNearLimit ? (remaining < 0 ? '#D32F2F' : '#FF9800') : '#6B7280'
    };
  };

  const characterInfo = getCharacterCountInfo();

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
          (isFocused || value) && styles.labelFloating,
          error && styles.labelError
        ]}>
          Description
        </Text>
        
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onValueChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isFocused || value ? '' : ''}
          placeholderTextColor="#9E9E9E"
          multiline
          numberOfLines={3}
          maxLength={maxLength}
          textAlignVertical="top"
          testID={testID}
          accessibilityLabel="Transaction description"
          accessibilityHint="Enter a description for your expense"
        />
      </View>
      
      {/* Bottom Row: Error/Helper Text and Character Count */}
      <View style={styles.bottomRow}>
        <View style={styles.leftText}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.helperText}>Describe your expense</Text>
          )}
        </View>
        
        <Text style={[styles.characterCount, { color: characterInfo.color }]}>
          {characterInfo.text}
        </Text>
      </View>
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
    minHeight: 80, // Taller for multiline input
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
  textInput: {
    fontSize: 16,
    color: '#212121',
    paddingTop: 4,
    paddingBottom: 8,
    minHeight: 48, // Touch target requirement
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
    marginHorizontal: 16,
  },
  leftText: {
    flex: 1,
    marginRight: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
  },
  characterCount: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
});

export default DescriptionInput;