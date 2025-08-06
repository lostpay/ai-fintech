import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Alert,
  RefreshControl,
  Modal as RNModal
} from 'react-native';
import { 
  FAB, 
  Card, 
  Text, 
  IconButton
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useBudgets } from '../hooks/useBudgets';
import { BudgetForm } from '../components/forms/BudgetForm';
import { BudgetCard } from '../components/budget/BudgetCard';
import { useCategories } from '../hooks/useCategories';

export const BudgetScreen: React.FC = () => {
  const { theme } = useTheme();
  const { 
    budgets, 
    loading, 
    error, 
    createBudget, 
    updateBudget, 
    deleteBudget, 
    refreshBudgets 
  } = useBudgets();
  const { categories, loading: categoriesLoading } = useCategories();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshBudgets();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBudgets();
    setRefreshing(false);
  };

  const handleCreateBudget = () => {
    setEditingBudget(null);
    setModalVisible(true);
  };

  const handleEditBudget = (budget: any) => {
    setEditingBudget(budget);
    setModalVisible(true);
  };

  const handleDeleteBudget = (budgetId: number, categoryName: string) => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the budget for ${categoryName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBudget(budgetId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete budget');
            }
          }
        }
      ]
    );
  };

  const handleSubmitBudget = async (budgetData: any) => {
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, budgetData);
      } else {
        await createBudget(budgetData);
      }
      setModalVisible(false);
      setEditingBudget(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save budget');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 16,
      paddingBottom: 100, // Space for FAB
    },
    headerCard: {
      marginBottom: 24,
      padding: 20,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
    },
    addButton: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.onSurface,
      marginBottom: 16,
    },
    emptyContainer: {
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      backgroundColor: theme.colors.primary,
    },
  });

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialIcons 
            name="error-outline" 
            size={48} 
            color={theme.colors.onSurfaceVariant} 
          />
          <Text style={styles.emptyText}>Failed to load budgets</Text>
          <Text style={styles.emptySubtext}>Pull down to retry</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Create a budget</Text>
              <Text style={styles.headerSubtitle}>Save more by setting a budget</Text>
            </View>
            <IconButton
              icon="add"
              size={24}
              iconColor={theme.colors.primary}
              style={styles.addButton}
              onPress={handleCreateBudget}
            />
          </View>
        </Card>

        {/* Budget List Section */}
        <Text style={styles.sectionTitle}>My budget</Text>

        {budgets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons 
              name="account-balance-wallet" 
              size={64} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text style={styles.emptyText}>No budgets yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first budget to start tracking your spending
            </Text>
          </View>
        ) : (
          budgets.map((budget, index) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onEdit={() => handleEditBudget(budget)}
              onDelete={() => handleDeleteBudget(budget.id, budget.category_name)}
            />
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="add"
        style={styles.fab}
        onPress={handleCreateBudget}
        label="Add Budget"
      />

      {/* Budget Form Modal */}
      <RNModal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setModalVisible(false);
          setEditingBudget(null);
        }}
      >
        {!categoriesLoading && categories.length > 0 ? (
          <BudgetForm
            categories={categories}
            initialData={editingBudget}
            onSubmit={handleSubmitBudget}
            onCancel={() => {
              setModalVisible(false);
              setEditingBudget(null);
            }}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
            <Text>Loading categories...</Text>
          </View>
        )}
      </RNModal>
    </SafeAreaView>
  );
};