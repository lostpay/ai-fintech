import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Card, Text, Avatar } from 'react-native-paper';

export const AppInfoSection: React.FC = () => {
  const buildDate = new Date().toLocaleDateString();
  
  return (
    <Card style={styles.infoCard}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.appHeader}>
          <Avatar.Icon
            size={64}
            icon="account-balance-wallet"
            style={styles.appIcon}
            testID="app-icon"
          />
          <View style={styles.appInfo}>
            <Text variant="headlineSmall" style={styles.appName}>
              FinanceFlow
            </Text>
            <Text variant="bodyMedium" style={styles.appTagline}>
              Personal Expense Tracker
            </Text>
          </View>
        </View>
        
        <View style={styles.versionInfo}>
          <List.Item
            title="Version"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
            testID="version-info"
          />
          <List.Item
            title="Build Date"
            description={buildDate}
            left={(props) => <List.Icon {...props} icon="calendar" />}
            testID="build-date-info"
          />
          <List.Item
            title="Developer"
            description="Academic Project"
            left={(props) => <List.Icon {...props} icon="school" />}
            testID="developer-info"
          />
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  cardContent: {
    padding: 16,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  appIcon: {
    backgroundColor: '#1976D2',
    marginRight: 16,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontWeight: '600',
    color: '#212121',
  },
  appTagline: {
    color: '#757575',
    marginTop: 4,
  },
  versionInfo: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
});