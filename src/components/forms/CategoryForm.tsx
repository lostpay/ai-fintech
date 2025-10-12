import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, Divider } from 'react-native-paper';
import { Category, CategoryFormData } from '../../types/Category';
import { CategoryService } from '../../services/CategoryService';
import { useDatabaseService } from '../../hooks/useDatabaseService';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';

interface CategoryFormProps {
  mode: 'create' | 'edit';
  category?: Category; // For edit mode
  onSave: (category?: Category) => void;
  onCancel: () => void;
  testID?: string;
}

/**
 * Category creation and editing form with color picker, icon picker, and validation
 * Handles both create and edit modes with comprehensive form validation
 */
export const CategoryForm: React.FC<CategoryFormProps> = ({
  mode,
  category,
  onSave,
  onCancel,
  testID = 'category-form'
}) => {
  const theme = useTheme();
  const isEditMode = mode === 'edit';

  // Services
  const databaseService = useDatabaseService();
  const categoryService = useMemo(
    () => new CategoryService(databaseService),
    [databaseService]
  );

  // Form state
  const [formData, setFormData] = useState<CategoryFormData>({
    name: category?.name || '',
    color: category?.color || '#1976D2',
    icon: category?.icon || 'category',
  });

  const [errors, setErrors] = useState<Partial<CategoryFormData>>({});
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<CategoryFormData> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Category name must be 50 characters or less';
    }

    // Color validation
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorRegex.test(formData.color)) {
      newErrors.color = 'Please select a valid color';
    }

    // Icon validation
    if (!formData.icon.trim()) {
      newErrors.icon = 'Please select an icon';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      if (isEditMode && category) {
        // Update existing category
        await categoryService.updateCategory(category.id, formData);
        const updatedCategory = await categoryService.getCategoryById(category.id);
        if (updatedCategory) {
          onSave(updatedCategory);
        }
      } else {
        // Create new category
        const categoryId = await categoryService.createCustomCategory(formData);
        const newCategory = await categoryService.getCategoryById(categoryId);
        if (newCategory) {
          onSave(newCategory);
        }
      }
    } catch (error) {
      console.error('Failed to save category:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save category. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle form field updates
   */
  const updateFormData = (field: keyof CategoryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Check if form has unsaved changes
   */
  const hasChanges = () => {
    if (!isEditMode) {
      return formData.name.trim() || formData.color !== '#1976D2' || formData.icon !== 'category';
    }
    return (
      formData.name !== category?.name ||
      formData.color !== category?.color ||
      formData.icon !== category?.icon
    );
  };

  /**
   * Handle cancel with unsaved changes check
   */
  const handleCancel = () => {
    if (hasChanges()) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to cancel?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard Changes', style: 'destructive', onPress: onCancel },
        ]
      );
    } else {
      onCancel();
    }
  };

  return (
    <View style={styles.container} testID={testID}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Form Header */}
        <Text variant="headlineMedium" style={styles.title}>
          {isEditMode ? 'Edit Category' : 'Create Category'}
        </Text>
        
        {isEditMode && category?.is_default && (
          <Text variant="bodyMedium" style={[styles.warningText, { color: theme.colors.error }]}>
            Note: This is a default category. You can edit its appearance but not delete it.
          </Text>
        )}

        {/* Category Name Input */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Category Name
          </Text>
          <TextInput
            label="Category Name"
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            error={!!errors.name}
            style={styles.nameInput}
            maxLength={50}
            testID="category-name-input"
            autoCapitalize="words"
            autoCorrect={false}
          />
          {errors.name && (
            <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.name}
            </Text>
          )}
          <Text variant="bodySmall" style={styles.characterCount}>
            {formData.name.length}/50 characters
          </Text>
        </View>

        <Divider style={styles.divider} />

        {/* Color Selection */}
        <View style={styles.section}>
          <ColorPicker
            selectedColor={formData.color}
            onColorSelect={(color) => updateFormData('color', color)}
            testID="category-color-picker"
          />
          {errors.color && (
            <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.color}
            </Text>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Icon Selection */}
        <View style={styles.section}>
          <IconPicker
            selectedIcon={formData.icon}
            onIconSelect={(icon) => updateFormData('icon', icon)}
            selectedColor={formData.color}
            testID="category-icon-picker"
          />
          {errors.icon && (
            <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.icon}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Form Actions */}
      <View style={[styles.actions, { backgroundColor: theme.colors.surface }]}>
        <Button
          mode="outlined"
          onPress={handleCancel}
          style={styles.cancelButton}
          testID="cancel-button"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.saveButton}
          testID="save-button"
        >
          {isEditMode ? 'Update' : 'Create'} Category
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  title: {
    padding: 16,
    paddingBottom: 8,
    fontWeight: '600',
  },
  warningText: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontWeight: '600',
  },
  nameInput: {
    marginHorizontal: 16,
    marginBottom: 4,
  },
  characterCount: {
    paddingHorizontal: 16,
    textAlign: 'right',
    opacity: 0.7,
    fontSize: 12,
  },
  errorText: {
    paddingHorizontal: 16,
    marginTop: 4,
    fontSize: 12,
  },
  divider: {
    marginVertical: 16,
    marginHorizontal: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
});

export default CategoryForm;