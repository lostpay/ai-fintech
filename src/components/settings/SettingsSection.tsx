import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Divider } from 'react-native-paper';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  showDivider?: boolean;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  children,
  showDivider = true,
}) => (
  <View style={styles.container}>
    <List.Section>
      <List.Subheader style={styles.subheader}>{title}</List.Subheader>
      {children}
    </List.Section>
    {showDivider && <Divider style={styles.divider} />}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  subheader: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
});