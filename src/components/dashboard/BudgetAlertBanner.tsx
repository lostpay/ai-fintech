import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BudgetAlert } from '../alerts/BudgetAlert';
import { useBudgetAlerts } from '../../hooks/useBudgetAlerts';
import { BudgetAlert as BudgetAlertType } from '../../types/BudgetAlert';

interface BudgetAlertBannerProps {
  maxAlertsToShow?: number;
}

export const BudgetAlertBanner: React.FC<BudgetAlertBannerProps> = ({ 
  maxAlertsToShow = 3 
}) => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { alerts, loading, acknowledgeAlert } = useBudgetAlerts();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Filter out dismissed alerts and sort by priority
  const activeAlerts = alerts
    .filter(alert => !dismissedAlerts.has(alert.id))
    .sort((a, b) => {
      // Priority: error > warning > info
      const severityOrder = { 'error': 3, 'warning': 2, 'info': 1 };
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      
      // Secondary sort by percentage used (higher first)
      return b.percentage_used - a.percentage_used;
    });

  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'error');
  const warningAlerts = activeAlerts.filter(alert => alert.severity === 'warning');
  const allRelevantAlerts = [...criticalAlerts, ...warningAlerts];

  if (loading || allRelevantAlerts.length === 0) {
    return null;
  }

  const handleDismissAlert = async (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    try {
      await acknowledgeAlert(alertId);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleViewBudgets = () => {
    navigation.navigate('Budget' as never);
  };

  const handleAlertAction = (action: string, alert: BudgetAlertType) => {
    switch (action) {
      case 'view_budget':
        handleViewBudgets();
        break;
      case 'review_overspending':
      case 'review_remaining_budget':
      case 'review_budget_details':
        handleViewBudgets();
        break;
      default:
        handleViewBudgets();
        break;
    }
  };

  const displayedAlerts = allRelevantAlerts.slice(0, maxAlertsToShow);
  const remainingAlertsCount = Math.max(0, allRelevantAlerts.length - maxAlertsToShow);

  return (
    <View style={styles.container}>
      {displayedAlerts.map((alert, index) => (
        <View key={alert.id} style={[styles.alertWrapper, index > 0 && styles.alertSpacing]}>
          <BudgetAlert
            alert={alert}
            variant="banner"
            onAction={(action) => handleAlertAction(action, alert)}
            onDismiss={() => handleDismissAlert(alert.id)}
          />
        </View>
      ))}

      {remainingAlertsCount > 0 && (
        <TouchableOpacity 
          style={[styles.additionalAlertsButton, { backgroundColor: theme.colors.surfaceVariant }]}
          onPress={handleViewBudgets}
        >
          <View style={styles.additionalAlertsContent}>
            <MaterialIcons 
              name="notifications-active" 
              size={16} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text 
              variant="bodySmall" 
              style={[styles.additionalAlertsText, { color: theme.colors.onSurfaceVariant }]}
            >
              {remainingAlertsCount} more budget alert{remainingAlertsCount > 1 ? 's' : ''}
            </Text>
            <MaterialIcons 
              name="chevron-right" 
              size={16} 
              color={theme.colors.onSurfaceVariant} 
            />
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Actions Bar for Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <View style={[styles.quickActionsBar, { backgroundColor: theme.colors.errorContainer }]}>
          <MaterialIcons 
            name="warning" 
            size={20} 
            color={theme.colors.onErrorContainer} 
          />
          <Text 
            variant="labelMedium" 
            style={[styles.quickActionsText, { color: theme.colors.onErrorContainer }]}
          >
            {criticalAlerts.length} categor{criticalAlerts.length > 1 ? 'ies are' : 'y is'} over budget
          </Text>
          <TouchableOpacity 
            style={[styles.quickActionButton, { borderColor: theme.colors.onErrorContainer }]}
            onPress={handleViewBudgets}
          >
            <Text 
              variant="labelSmall" 
              style={[styles.quickActionButtonText, { color: theme.colors.onErrorContainer }]}
            >
              Review
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  alertWrapper: {
    marginBottom: 8,
  },
  alertSpacing: {
    marginTop: 4,
  },
  additionalAlertsButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  additionalAlertsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  additionalAlertsText: {
    marginLeft: 8,
    marginRight: 4,
    fontWeight: '500',
  },
  quickActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  quickActionsText: {
    flex: 1,
    marginLeft: 8,
    fontWeight: '500',
  },
  quickActionButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  quickActionButtonText: {
    fontWeight: '600',
  },
});