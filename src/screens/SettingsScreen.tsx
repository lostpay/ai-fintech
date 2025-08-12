import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Snackbar } from 'react-native-paper';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/types';
import { 
  SettingsSection, 
  ThemeToggleItem, 
  CategoryManagementItem,
  AppInfoSection, 
  AboutSection 
} from '../components/settings';
import { DataExportCard } from '../components/settings/DataExportCard';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

type Props = BottomTabScreenProps<RootTabParamList, 'Settings'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const stackNavigation = useNavigation();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    // Screen initialization placeholder
  }, []);

  const handleManageCategories = () => {
    // Navigate to the Categories screen using the stack navigator
    stackNavigation.navigate('Categories' as never);
  };


  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollContainer}>
        
        {/* App Information Section */}
        <SettingsSection title="App Information">
          <AppInfoSection />
        </SettingsSection>

        {/* Appearance Section */}
        <SettingsSection title="Appearance">
          <ThemeToggleItem 
            isDarkMode={isDarkMode}
            onToggle={toggleTheme}
          />
        </SettingsSection>

        {/* Data Management Section */}
        <SettingsSection title="Data Management">
          <CategoryManagementItem onPress={handleManageCategories} />
          <DataExportCard />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About" showDivider={false}>
          <AboutSection />
        </SettingsSection>
        
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    paddingTop: 8,
  },
});