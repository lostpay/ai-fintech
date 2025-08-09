import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ProcessingType } from '../../services/ai/PrivacyManager';

interface PrivacyIndicatorProps {
  processingType: ProcessingType;
  size?: 'small' | 'medium';
  style?: any;
}

export const PrivacyIndicator: React.FC<PrivacyIndicatorProps> = ({
  processingType,
  size = 'small',
  style,
}) => {
  const { theme } = useTheme();

  const getIndicatorConfig = (type: ProcessingType) => {
    switch (type) {
      case 'on-device':
        return {
          icon: 'security' as const,
          label: 'On-device',
          color: '#4CAF50',
          backgroundColor: '#E8F5E8',
        };
      case 'hugging-face':
        return {
          icon: 'cloud' as const,
          label: 'Cloud AI',
          color: '#2196F3',
          backgroundColor: '#E3F2FD',
        };
      default:
        return {
          icon: 'help' as const,
          label: 'Unknown',
          color: '#FF9800',
          backgroundColor: '#FFF3E0',
        };
    }
  };

  const config = getIndicatorConfig(processingType);
  const isSmall = size === 'small';

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: config.backgroundColor,
      borderRadius: isSmall ? 12 : 16,
      paddingHorizontal: isSmall ? 6 : 8,
      paddingVertical: isSmall ? 2 : 4,
      alignSelf: 'flex-start',
      ...style,
    },
    icon: {
      marginRight: isSmall ? 2 : 4,
    },
    label: {
      fontSize: isSmall ? 10 : 12,
      fontWeight: '500',
      color: config.color,
    },
  });

  if (isSmall) {
    return (
      <View style={styles.container}>
        <MaterialIcons 
          name={config.icon} 
          size={isSmall ? 10 : 12} 
          color={config.color}
          style={styles.icon}
        />
        <Text style={styles.label}>{config.label}</Text>
      </View>
    );
  }

  return (
    <Chip
      icon={() => (
        <MaterialIcons 
          name={config.icon} 
          size={16} 
          color={config.color}
        />
      )}
      textStyle={{ color: config.color, fontSize: 12 }}
      style={[
        { backgroundColor: config.backgroundColor },
        style,
      ]}
    >
      {config.label}
    </Chip>
  );
};