import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ListItem } from 'react-native-elements';
import { MaterialIcons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<RootTabParamList, 'Settings'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Screen initialization placeholder
  }, []);

  const settingsOptions = [
    { 
      title: 'Categories', 
      subtitle: 'Manage expense categories',
      icon: 'category',
      onPress: () => console.log('Categories pressed')
    },
    { 
      title: 'Budget Settings', 
      subtitle: 'Configure budget limits',
      icon: 'account-balance-wallet',
      onPress: () => console.log('Budget Settings pressed')
    },
    { 
      title: 'Voice Recognition', 
      subtitle: 'Configure voice input settings',
      icon: 'mic',
      onPress: () => console.log('Voice Recognition pressed')
    },
    { 
      title: 'Export Data', 
      subtitle: 'Export transactions and reports',
      icon: 'file-download',
      onPress: () => console.log('Export Data pressed')
    },
    { 
      title: 'About', 
      subtitle: 'App information and version',
      icon: 'info',
      onPress: () => console.log('About pressed')
    },
  ];

  return (
    <View style={styles.container}>
      <Card containerStyle={styles.headerCard}>
        <Text h3 style={styles.title}>Settings</Text>
        <Text style={styles.description}>
          Configure your budget tracker preferences and settings.
        </Text>
      </Card>
      
      <ScrollView style={styles.listContainer}>
        <Card containerStyle={styles.listCard}>
          {settingsOptions.map((option, index) => (
            <ListItem 
              key={index} 
              bottomDivider={index < settingsOptions.length - 1}
              onPress={option.onPress}
            >
              <MaterialIcons 
                name={option.icon as any} 
                size={24} 
                color="#1976D2" 
              />
              <ListItem.Content>
                <ListItem.Title style={styles.optionTitle}>
                  {option.title}
                </ListItem.Title>
                <ListItem.Subtitle style={styles.optionSubtitle}>
                  {option.subtitle}
                </ListItem.Subtitle>
              </ListItem.Content>
              <ListItem.Chevron />
            </ListItem>
          ))}
          <Text style={styles.note}>
            Settings functionality will be implemented in future stories.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Material Design background
  },
  headerCard: {
    borderRadius: 8,
    margin: 16,
    marginBottom: 8,
  },
  listContainer: {
    flex: 1,
  },
  listCard: {
    borderRadius: 8,
    margin: 16,
    marginTop: 8,
  },
  title: {
    textAlign: 'center',
    color: '#1976D2',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    fontSize: 16,
    color: '#424242',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  note: {
    fontSize: 12,
    color: '#9E9E9E',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
});