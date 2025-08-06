import React from 'react';
import { StyleSheet } from 'react-native';
import { List, Switch, ActivityIndicator } from 'react-native-paper';

interface SettingsListItemProps {
  title: string;
  description?: string;
  icon: string;
  onPress?: () => void;
  right?: React.ReactNode;
  disabled?: boolean;
  testID?: string;
}

export const SettingsListItem: React.FC<SettingsListItemProps> = ({
  title,
  description,
  icon,
  onPress,
  right,
  disabled = false,
  testID,
}) => (
  <List.Item
    title={title}
    description={description}
    left={(props) => <List.Icon {...props} icon={icon} />}
    right={() => right}
    onPress={onPress}
    disabled={disabled}
    testID={testID}
    style={[
      styles.listItem,
      { minHeight: 48 }, // Material Design touch target requirement
    ]}
  />
);

interface ThemeToggleItemProps {
  isDarkMode: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const ThemeToggleItem: React.FC<ThemeToggleItemProps> = ({
  isDarkMode,
  onToggle,
  disabled = false,
}) => (
  <SettingsListItem
    title="Dark Mode"
    description="Switch between light and dark themes"
    icon="brightness-6"
    testID="theme-switch"
    right={
      <Switch
        value={isDarkMode}
        onValueChange={onToggle}
        disabled={disabled}
      />
    }
  />
);

interface DataExportItemProps {
  onExport: () => void;
  isExporting: boolean;
}

export const DataExportItem: React.FC<DataExportItemProps> = ({
  onExport,
  isExporting,
}) => (
  <SettingsListItem
    title="Export Data"
    description="Export your transactions to CSV"
    icon="download"
    onPress={onExport}
    disabled={isExporting}
    testID="export-data-item"
    right={
      isExporting ? (
        <ActivityIndicator size="small" />
      ) : (
        <List.Icon icon="chevron-right" />
      )
    }
  />
);

interface CategoryManagementItemProps {
  onPress: () => void;
}

export const CategoryManagementItem: React.FC<CategoryManagementItemProps> = ({
  onPress,
}) => (
  <SettingsListItem
    title="Manage Categories"
    description="Customize your expense categories with colors and icons"
    icon="category"
    onPress={onPress}
    testID="category-management-item"
    right={<List.Icon icon="chevron-right" />}
  />
);

const styles = StyleSheet.create({
  listItem: {
    paddingVertical: 8,
  },
});