import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BudgetImpact } from '../../types/BudgetAlert';
import { formatCurrency } from '../../utils/currency';

interface BudgetImpactSummaryProps {
  impact: BudgetImpact;
  showHeader?: boolean;
}

export const BudgetImpactSummary: React.FC<BudgetImpactSummaryProps> = ({
  impact,
  showHeader = true
}) => {
  const { theme } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'under': return theme.colors.primary;
      case 'approaching': return '#FF9800';
      case 'over': return theme.colors.error;
      default: return theme.colors.onSurface;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'under': return 'check-circle';
      case 'approaching': return 'warning';
      case 'over': return 'error';
      default: return 'info';
    }
  };

  const statusChanged = impact.budget_before.status !== impact.budget_after.status;

  return (
    <Card style={styles.impactCard}>
      <Card.Content>
        {showHeader && (
          <View style={styles.header}>
            <Text variant="titleSmall" style={styles.title}>
              Budget Impact: {impact.category_name}
            </Text>
            {statusChanged && (
              <View style={styles.changeIndicator}>
                <MaterialIcons
                  name="trending-up"
                  size={16}
                  color={getStatusColor(impact.budget_after.status)}
                />
                <Text variant="labelSmall" style={[styles.changeText, { color: getStatusColor(impact.budget_after.status) }]}>
                  Status Changed
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.comparisonContainer}>
          {/* Before */}
          <View style={styles.statusContainer}>
            <Text variant="labelMedium" style={styles.statusLabel}>Before</Text>
            <View style={styles.statusRow}>
              <MaterialIcons
                name={getStatusIcon(impact.budget_before.status) as any}
                size={16}
                color={getStatusColor(impact.budget_before.status)}
              />
              <Text 
                variant="bodySmall" 
                style={[styles.statusText, { color: getStatusColor(impact.budget_before.status) }]}
              >
                {impact.budget_before.status}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.amountText}>
              {formatCurrency(impact.budget_before.spent)} spent
            </Text>
            <Text variant="bodySmall" style={styles.percentageText}>
              {Math.round(impact.budget_before.percentage)}%
            </Text>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={theme.colors.onSurface}
              style={{ opacity: 0.5 }}
            />
          </View>

          {/* After */}
          <View style={styles.statusContainer}>
            <Text variant="labelMedium" style={styles.statusLabel}>After</Text>
            <View style={styles.statusRow}>
              <MaterialIcons
                name={getStatusIcon(impact.budget_after.status) as any}
                size={16}
                color={getStatusColor(impact.budget_after.status)}
              />
              <Text 
                variant="bodySmall" 
                style={[styles.statusText, { color: getStatusColor(impact.budget_after.status) }]}
              >
                {impact.budget_after.status}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.amountText}>
              {formatCurrency(impact.budget_after.spent)} spent
            </Text>
            <Text variant="bodySmall" style={styles.percentageText}>
              {Math.round(impact.budget_after.percentage)}%
            </Text>
          </View>
        </View>

        {impact.alerts_triggered.length > 0 && (
          <View style={styles.alertsTriggeredContainer}>
            <Text variant="labelSmall" style={styles.alertsTriggeredLabel}>
              {impact.alerts_triggered.length} alert{impact.alerts_triggered.length !== 1 ? 's' : ''} triggered
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  impactCard: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: '600',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '500',
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  statusLabel: {
    marginBottom: 8,
    opacity: 0.7,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    marginLeft: 4,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  amountText: {
    marginBottom: 2,
    opacity: 0.8,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '600',
  },
  arrowContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  alertsTriggeredContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 4,
    alignItems: 'center',
  },
  alertsTriggeredLabel: {
    color: '#FF9800',
    fontWeight: '500',
  },
});