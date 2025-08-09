import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, IconButton } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { BudgetCard } from '../budget/BudgetCard';
import { TransactionList } from '../lists/TransactionList';
import { BudgetPerformanceChart } from '../charts/BudgetPerformanceChart';
import { CategoryBreakdownChart } from '../charts/CategoryBreakdownChart';
import { SpendingTrendChart } from '../charts/SpendingTrendChart';
import { 
  EmbeddedFinancialCardProps, 
  EmbeddedBudgetCardData,
  EmbeddedTransactionListData,
  EmbeddedChartData,
} from '../../types/ai/EmbeddedDataTypes';

const { width: screenWidth } = Dimensions.get('window');
const CHAT_PADDING = 32; // Standard chat bubble padding
const COMPACT_MAX_HEIGHT = 200;
const FULL_MAX_HEIGHT = 400;

export const EmbeddedFinancialCard: React.FC<EmbeddedFinancialCardProps> = ({
  embeddedData,
  onInteraction,
  maxHeight,
  style,
}) => {
  const { theme } = useTheme();

  // Calculate responsive dimensions for chat context
  const containerWidth = embeddedData.chatContext 
    ? screenWidth - CHAT_PADDING 
    : screenWidth - 32;
    
  const componentMaxHeight = maxHeight || 
    (embeddedData.size === 'compact' ? COMPACT_MAX_HEIGHT : FULL_MAX_HEIGHT);

  const handleInteraction = (action: string, data?: any) => {
    if (onInteraction) {
      onInteraction(action, { embeddedData, interactionData: data });
    }
  };

  const renderBudgetCard = (data: EmbeddedBudgetCardData) => {
    const budget = {
      id: data.budgetData.id,
      category_name: data.budgetData.category?.name || 'Unknown',
      category_color: data.budgetData.category?.color || '#2196F3',
      category_icon: data.budgetData.category?.icon || 'category',
      amount: data.budgetData.amount,
      spent_amount: data.progressData.spent,
      percentage: data.progressData.percentage,
    };

    return (
      <BudgetCard
        budget={budget}
        onEdit={() => handleInteraction('edit_budget', data.budgetData)}
        onDelete={() => handleInteraction('delete_budget', data.budgetData)}
      />
    );
  };

  const renderTransactionList = (data: EmbeddedTransactionListData) => {
    const maxItems = data.size === 'compact' ? 3 : 10;
    const displayTransactions = data.transactions.slice(0, maxItems);

    return (
      <View style={[styles.transactionContainer, { maxHeight: componentMaxHeight }]}>
        {data.title && (
          <Text style={styles.embedTitle}>{data.title}</Text>
        )}
        <TransactionList
          transactions={displayTransactions}
          onTransactionPress={(transaction) => 
            handleInteraction('view_transaction', transaction)
          }
        />
        {data.transactions.length > maxItems && (
          <View style={styles.moreIndicator}>
            <Text style={styles.moreText}>
              +{data.transactions.length - maxItems} more transactions
            </Text>
            <IconButton
              icon="chevron-down"
              size={16}
              onPress={() => handleInteraction('show_all_transactions', data)}
            />
          </View>
        )}
      </View>
    );
  };

  const renderChart = (data: EmbeddedChartData) => {
    const chartHeight = data.size === 'compact' ? 150 : 250;
    
    const commonProps = {
      height: chartHeight,
      showDetails: data.size !== 'compact',
    };

    let ChartComponent;
    switch (data.type) {
      case 'BudgetPerformanceChart':
        ChartComponent = (
          <BudgetPerformanceChart
            data={data.chartData}
            {...commonProps}
          />
        );
        break;
      case 'CategoryBreakdownChart':
        ChartComponent = (
          <CategoryBreakdownChart
            data={data.chartData}
            {...commonProps}
          />
        );
        break;
      case 'SpendingTrendChart':
        ChartComponent = (
          <SpendingTrendChart
            data={data.chartData}
            {...commonProps}
          />
        );
        break;
      default:
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unsupported chart type</Text>
          </View>
        );
    }

    return (
      <View style={styles.chartContainer}>
        {data.title && (
          <Text style={styles.embedTitle}>{data.title}</Text>
        )}
        {ChartComponent}
      </View>
    );
  };

  const renderContent = () => {
    switch (embeddedData.type) {
      case 'BudgetCard':
        return renderBudgetCard(embeddedData as EmbeddedBudgetCardData);
      case 'TransactionList':
        return renderTransactionList(embeddedData as EmbeddedTransactionListData);
      case 'BudgetPerformanceChart':
      case 'CategoryBreakdownChart':
      case 'SpendingTrendChart':
        return renderChart(embeddedData as EmbeddedChartData);
      default:
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unknown component type</Text>
          </View>
        );
    }
  };

  const containerStyles = StyleSheet.create({
    container: {
      width: containerWidth,
      maxHeight: componentMaxHeight,
      backgroundColor: embeddedData.chatContext 
        ? 'transparent' 
        : theme.colors.surface,
      borderRadius: embeddedData.chatContext ? 8 : 12,
      marginVertical: embeddedData.chatContext ? 8 : 16,
      overflow: 'hidden',
      ...style,
    },
  });

  return (
    <View style={containerStyles.container}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  embedTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  transactionContainer: {
    flex: 1,
  },
  chartContainer: {
    flex: 1,
  },
  moreIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  moreText: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
  },
});