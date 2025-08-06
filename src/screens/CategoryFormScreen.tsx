import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/types';
import { CategoryForm } from '../components/forms/CategoryForm';
import { useTheme } from '../context/ThemeContext';

type Props = StackScreenProps<RootStackParamList, 'CategoryForm'>;

export const CategoryFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { mode, category } = route.params;

  const handleSave = () => {
    // CategoryForm handles the actual save, this just navigates back
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: mode === 'create' ? 'Create Category' : 'Edit Category',
    });
  }, [navigation, mode]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CategoryForm
        mode={mode}
        category={category}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});