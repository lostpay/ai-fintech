import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

// Material Design color palette
export const MATERIAL_DESIGN_COLORS = [
  // Primary Colors
  { name: 'Blue', value: '#1976D2', group: 'primary' },
  { name: 'Indigo', value: '#3F51B5', group: 'primary' },
  { name: 'Purple', value: '#9C27B0', group: 'primary' },
  { name: 'Deep Purple', value: '#673AB7', group: 'primary' },
  
  // Secondary Colors  
  { name: 'Teal', value: '#009688', group: 'secondary' },
  { name: 'Green', value: '#4CAF50', group: 'secondary' },
  { name: 'Light Green', value: '#8BC34A', group: 'secondary' },
  { name: 'Lime', value: '#CDDC39', group: 'secondary' },
  
  // Accent Colors
  { name: 'Orange', value: '#FF9800', group: 'accent' },
  { name: 'Deep Orange', value: '#FF5722', group: 'accent' },
  { name: 'Red', value: '#F44336', group: 'accent' },
  { name: 'Pink', value: '#E91E63', group: 'accent' },
  
  // Neutral Colors
  { name: 'Brown', value: '#795548', group: 'neutral' },
  { name: 'Blue Grey', value: '#607D8B', group: 'neutral' },
  { name: 'Grey', value: '#9E9E9E', group: 'neutral' },
  { name: 'Dark Grey', value: '#455A64', group: 'neutral' },
];

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  testID?: string;
}

/**
 * Color picker component with Material Design colors and custom color input
 * Includes accessibility compliance and contrast validation
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  selectedColor, 
  onColorSelect,
  testID = 'color-picker'
}) => {
  const theme = useTheme();
  const [customColor, setCustomColor] = useState('');
  const [customColorError, setCustomColorError] = useState('');

  /**
   * Validate hex color format
   */
  const isValidHexColor = (color: string): boolean => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    return hexColorRegex.test(color);
  };

  /**
   * Calculate contrast ratio for accessibility validation (simplified)
   * WCAG AA compliance check against theme background
   */
  const validateColorContrast = (color: string): boolean => {
    try {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      // Calculate relative luminance (simplified)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Ensure color is not too light (would have poor contrast on white backgrounds)
      return luminance <= 0.8;
    } catch {
      return false;
    }
  };

  /**
   * Handle custom color input and validation
   */
  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    setCustomColorError('');
    
    if (color.length > 0 && !color.startsWith('#')) {
      setCustomColor('#' + color);
    }
  };

  /**
   * Apply custom color with validation
   */
  const handleUseCustomColor = () => {
    const colorToValidate = customColor.toUpperCase();
    
    if (!isValidHexColor(colorToValidate)) {
      setCustomColorError('Please enter a valid hex color (e.g., #FF5722)');
      return;
    }
    
    if (!validateColorContrast(colorToValidate)) {
      setCustomColorError('Color is too light and may have poor contrast. Please choose a darker color.');
      return;
    }
    
    setCustomColorError('');
    onColorSelect(colorToValidate);
  };

  return (
    <View style={styles.container} testID={testID}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Select Category Color
      </Text>
      
      {/* Predefined Color Grid */}
      <View style={styles.colorGrid} testID="predefined-colors">
        {MATERIAL_DESIGN_COLORS.map((color) => (
          <TouchableOpacity
            key={color.value}
            style={[
              styles.colorOption,
              { backgroundColor: color.value },
              selectedColor === color.value && styles.selectedColor,
            ]}
            onPress={() => onColorSelect(color.value)}
            accessibilityLabel={`Select ${color.name} color`}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedColor === color.value }}
            testID={`color-option-${color.value}`}
          >
            {selectedColor === color.value && (
              <MaterialIcons name="check" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Custom Color Input */}
      <View style={styles.customColorSection}>
        <Text variant="bodyMedium" style={styles.customColorLabel}>
          Or enter a custom hex color:
        </Text>
        <TextInput
          label="Custom Color (Hex)"
          value={customColor}
          onChangeText={handleCustomColorChange}
          placeholder="#FF5722"
          maxLength={7}
          style={styles.customColorInput}
          error={!!customColorError}
          testID="custom-color-input"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {customColorError && (
          <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
            {customColorError}
          </Text>
        )}
        <Button
          mode="outlined"
          onPress={handleUseCustomColor}
          disabled={!customColor || customColor.length < 7}
          style={styles.customColorButton}
          testID="use-custom-color-button"
        >
          Use Custom Color
        </Button>
      </View>
      
      {/* Color Preview */}
      <View style={styles.previewSection}>
        <Text variant="bodyMedium">Preview:</Text>
        <View 
          style={[styles.colorPreview, { backgroundColor: selectedColor }]}
          testID="color-preview"
        >
          <MaterialIcons name="account-balance-wallet" size={24} color="#FFFFFF" />
        </View>
        <Text variant="bodySmall" style={styles.previewColorCode}>
          {selectedColor}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#000',
    elevation: 4,
    shadowOpacity: 0.3,
  },
  customColorSection: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
    marginBottom: 24,
  },
  customColorLabel: {
    marginBottom: 8,
  },
  customColorInput: {
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 8,
    fontSize: 12,
  },
  customColorButton: {
    alignSelf: 'flex-start',
  },
  previewSection: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  colorPreview: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  previewColorCode: {
    opacity: 0.7,
    fontFamily: 'monospace',
  },
});

export default ColorPicker;