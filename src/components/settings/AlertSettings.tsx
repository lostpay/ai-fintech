import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { List, Switch, Text, Divider, SegmentedButtons, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AlertPreferences {
  enabled: boolean;
  approachingThreshold: number;
  atLimitThreshold: number;
  alertMethod: 'immediate' | 'summary' | 'off';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const DEFAULT_PREFERENCES: AlertPreferences = {
  enabled: true,
  approachingThreshold: 75,
  atLimitThreshold: 100,
  alertMethod: 'immediate',
  soundEnabled: true,
  vibrationEnabled: true,
};

const STORAGE_KEY = 'budget_alert_preferences';

export const AlertSettings: React.FC = () => {
  const theme = useTheme();
  const [preferences, setPreferences] = useState<AlertPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const storedPrefs = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedPrefs) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(storedPrefs) });
      }
    } catch (error) {
      console.error('Failed to load alert preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: AlertPreferences) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save alert preferences:', error);
      Alert.alert('Error', 'Failed to save alert preferences');
    }
  };

  const handleToggleAlerts = (enabled: boolean) => {
    savePreferences({ ...preferences, enabled });
  };

  const handleThresholdChange = (type: 'approaching' | 'atLimit', value: number) => {
    const updates = type === 'approaching' 
      ? { approachingThreshold: value }
      : { atLimitThreshold: value };
    
    savePreferences({ ...preferences, ...updates });
  };

  const handleMethodChange = (method: string) => {
    savePreferences({ ...preferences, alertMethod: method as AlertPreferences['alertMethod'] });
  };

  const handleSoundToggle = (enabled: boolean) => {
    savePreferences({ ...preferences, soundEnabled: enabled });
  };

  const handleVibrationToggle = (enabled: boolean) => {
    savePreferences({ ...preferences, vibrationEnabled: enabled });
  };

  const getThresholdOptions = () => [
    { value: '50', label: '50%' },
    { value: '60', label: '60%' },
    { value: '70', label: '70%' },
    { value: '75', label: '75%' },
    { value: '80', label: '80%' },
    { value: '85', label: '85%' },
    { value: '90', label: '90%' },
    { value: '95', label: '95%' },
  ];

  const alertMethodOptions = [
    { value: 'immediate', label: 'Immediate' },
    { value: 'summary', label: 'Daily Summary' },
    { value: 'off', label: 'Off' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading alert preferences...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <List.Section>
        <List.Subheader>Budget Alert Configuration</List.Subheader>
        
        {/* Enable/Disable Budget Alerts */}
        <List.Item
          title="Enable Budget Alerts"
          description="Get notified when approaching or exceeding budgets"
          left={(props) => (
            <List.Icon 
              {...props} 
              icon={({ size, color }) => (
                <MaterialIcons name="notifications" size={size} color={color} />
              )}
            />
          )}
          right={() => (
            <Switch
              value={preferences.enabled}
              onValueChange={handleToggleAlerts}
            />
          )}
        />

        <Divider />

        {/* Alert Method */}
        <View style={styles.sectionContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Alert Delivery Method
          </Text>
          <Text variant="bodySmall" style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}>
            Choose how you want to receive budget alerts
          </Text>
          
          <SegmentedButtons
            value={preferences.alertMethod}
            onValueChange={handleMethodChange}
            buttons={alertMethodOptions}
            style={styles.segmentedButtons}
          />
        </View>

        <Divider />

        {/* Threshold Settings */}
        {preferences.enabled && (
          <>
            <View style={styles.sectionContainer}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Alert Thresholds
              </Text>
              <Text variant="bodySmall" style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}>
                Set when you want to be notified about your budget usage
              </Text>

              {/* Approaching Threshold */}
              <List.Item
                title="Approaching Budget Alert"
                description={`Alert when ${preferences.approachingThreshold}% of budget is used`}
                left={(props) => (
                  <List.Icon 
                    {...props} 
                    icon={({ size, color }) => (
                      <MaterialIcons name="warning" size={size} color={color} />
                    )}
                  />
                )}
                right={() => (
                  <SegmentedButtons
                    value={preferences.approachingThreshold.toString()}
                    onValueChange={(value) => handleThresholdChange('approaching', parseInt(value))}
                    buttons={getThresholdOptions()}
                    style={styles.compactSegmentedButtons}
                  />
                )}
              />

              {/* At Limit Threshold */}
              <List.Item
                title="Budget Limit Alert"
                description={`Alert when ${preferences.atLimitThreshold}% of budget is used`}
                left={(props) => (
                  <List.Icon 
                    {...props} 
                    icon={({ size, color }) => (
                      <MaterialIcons name="info" size={size} color={color} />
                    )}
                  />
                )}
                right={() => (
                  <View style={styles.readOnlyThreshold}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      100%
                    </Text>
                  </View>
                )}
              />
            </View>

            <Divider />
          </>
        )}

        {/* Alert Feedback Settings */}
        {preferences.enabled && preferences.alertMethod !== 'off' && (
          <>
            <List.Subheader>Alert Feedback</List.Subheader>
            
            <List.Item
              title="Sound Alerts"
              description="Play sound when budget alerts are triggered"
              left={(props) => (
                <List.Icon 
                  {...props} 
                  icon={({ size, color }) => (
                    <MaterialIcons 
                      name={preferences.soundEnabled ? "volume-up" : "volume-off"} 
                      size={size} 
                      color={color} 
                    />
                  )}
                />
              )}
              right={() => (
                <Switch
                  value={preferences.soundEnabled}
                  onValueChange={handleSoundToggle}
                />
              )}
            />

            <List.Item
              title="Vibration Alerts"
              description="Vibrate device when budget alerts are triggered"
              left={(props) => (
                <List.Icon 
                  {...props} 
                  icon={({ size, color }) => (
                    <MaterialIcons 
                      name={preferences.vibrationEnabled ? "vibration" : "phone-android"} 
                      size={size} 
                      color={color} 
                    />
                  )}
                />
              )}
              right={() => (
                <Switch
                  value={preferences.vibrationEnabled}
                  onValueChange={handleVibrationToggle}
                />
              )}
            />

            <Divider />
          </>
        )}

        {/* Alert Status Summary */}
        <View style={[styles.statusContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialIcons 
            name="info" 
            size={20} 
            color={theme.colors.onSurfaceVariant}
            style={styles.statusIcon}
          />
          <View style={styles.statusTextContainer}>
            <Text variant="labelMedium" style={[styles.statusTitle, { color: theme.colors.onSurfaceVariant }]}>
              Current Settings
            </Text>
            <Text variant="bodySmall" style={[styles.statusDescription, { color: theme.colors.onSurfaceVariant }]}>
              {preferences.enabled 
                ? `Alerts enabled • ${preferences.alertMethod} delivery • Threshold at ${preferences.approachingThreshold}%`
                : 'Budget alerts are currently disabled'
              }
            </Text>
          </View>
        </View>
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    marginBottom: 4,
    fontWeight: '600',
  },
  sectionDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  segmentedButtons: {
    marginVertical: 8,
  },
  compactSegmentedButtons: {
    width: 200,
  },
  readOnlyThreshold: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 60,
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  statusIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDescription: {
    lineHeight: 18,
  },
});

// Export function to get current preferences
export const getAlertPreferences = async (): Promise<AlertPreferences> => {
  try {
    const storedPrefs = await AsyncStorage.getItem(STORAGE_KEY);
    if (storedPrefs) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(storedPrefs) };
    }
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Failed to load alert preferences:', error);
    return DEFAULT_PREFERENCES;
  }
};