import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableWithoutFeedback } from 'react-native';
import { Card, Text, Button, IconButton } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BudgetAlert as BudgetAlertType } from '../../types/BudgetAlert';
import { formatCurrency } from '../../utils/currency';

interface BudgetAlertProps {
  alert: BudgetAlertType;
  onAction?: (action: string) => void;
  onDismiss?: () => void;
  variant?: 'full' | 'compact' | 'banner';
  animateIn?: boolean;
}

export const BudgetAlert: React.FC<BudgetAlertProps> = ({
  alert,
  onAction,
  onDismiss,
  variant = 'full',
  animateIn = true
}) => {
  const { theme } = useTheme();
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(variant === 'banner' ? -100 : 50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Animate in when component mounts
  useEffect(() => {
    if (animateIn) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Set final values immediately if not animating
      slideAnim.setValue(0);
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [animateIn, slideAnim, fadeAnim, scaleAnim, variant]);

  const animateOut = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: variant === 'banner' ? -100 : 50,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback?.();
    });
  };

  const handleDismiss = () => {
    animateOut(() => {
      onDismiss?.();
    });
  };
  
  const getAlertColor = (severity: BudgetAlertType['severity']) => {
    switch (severity) {
      case 'info': return theme.colors.primary;
      case 'warning': return '#FF9800';
      case 'error': return theme.colors.error;
      default: return theme.colors.primary;
    }
  };

  const getAlertIcon = (alertType: BudgetAlertType['alert_type']) => {
    switch (alertType) {
      case 'approaching': return 'warning';
      case 'at_limit': return 'info';
      case 'over_budget': return 'error';
      default: return 'info';
    }
  };

  if (variant === 'banner') {
    return (
      <Animated.View
        style={[
          {
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableWithoutFeedback onPress={() => onAction?.('view_budget')}>
          <Card 
            style={[
              styles.bannerCard,
              { borderLeftColor: getAlertColor(alert.severity), borderLeftWidth: 4 }
            ]}
          >
            <Card.Content>
              <View style={styles.bannerContent}>
                <View style={styles.bannerLeft}>
                  <Animated.View 
                    style={[
                      styles.iconContainer,
                      { 
                        transform: [{ scale: scaleAnim }],
                        backgroundColor: getAlertColor(alert.severity) + '20'
                      }
                    ]}
                  >
                    <MaterialIcons
                      name={getAlertIcon(alert.alert_type) as any}
                      size={20}
                      color={getAlertColor(alert.severity)}
                    />
                  </Animated.View>
                  <Text variant="bodyMedium" style={styles.bannerMessage}>
                    {alert.message}
                  </Text>
                </View>
                <View style={styles.bannerActions}>
                  {onAction && (
                    <Button
                      mode="text"
                      compact
                      onPress={() => onAction('view_budget')}
                      labelStyle={styles.bannerActionLabel}
                    >
                      View Budget
                    </Button>
                  )}
                  {onDismiss && (
                    <IconButton
                      icon="close"
                      size={16}
                      onPress={handleDismiss}
                    />
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>
        </TouchableWithoutFeedback>
      </Animated.View>
    );
  }

  if (variant === 'compact') {
    return (
      <Animated.View
        style={[
          {
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
            opacity: fadeAnim,
          }
        ]}
      >
        <Card 
          style={[
            styles.compactCard,
            { borderLeftColor: getAlertColor(alert.severity), borderLeftWidth: 3 }
          ]}
        >
          <Card.Content style={styles.compactContent}>
            <TouchableWithoutFeedback onPress={() => onAction?.('view_budget')}>
              <View style={styles.compactHeader}>
                <Animated.View 
                  style={[
                    styles.categoryIcon, 
                    { 
                      backgroundColor: alert.category_color,
                      transform: [{ scale: scaleAnim }]
                    }
                  ]}
                >
                  <MaterialIcons name="account-balance-wallet" size={16} color="#FFFFFF" />
                </Animated.View>
                <View style={styles.compactTextContainer}>
                  <Text variant="labelMedium" style={styles.categoryName}>
                    {alert.category_name}
                  </Text>
                  <Text variant="bodySmall" numberOfLines={1} style={styles.compactMessage}>
                    {alert.message}
                  </Text>
                </View>
                {onDismiss && (
                  <IconButton
                    icon="close"
                    size={16}
                    onPress={handleDismiss}
                    style={styles.compactDismissButton}
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </Card.Content>
        </Card>
      </Animated.View>
    );
  }

  // Full variant
  return (
    <Animated.View
      style={[
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
          opacity: fadeAnim,
        }
      ]}
    >
      <Card 
        style={[
          styles.alertCard,
          { borderLeftColor: getAlertColor(alert.severity), borderLeftWidth: 4 }
        ]}
      >
        <Card.Content>
          <View style={styles.alertHeader}>
            <Animated.View 
              style={[
                styles.categoryIcon, 
                { 
                  backgroundColor: alert.category_color,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              <MaterialIcons name="account-balance-wallet" size={20} color="#FFFFFF" />
            </Animated.View>
            <View style={styles.alertContent}>
              <Text variant="titleSmall" style={styles.categoryName}>
                {alert.category_name} Budget Alert
              </Text>
              <Text variant="bodyMedium" style={styles.alertMessage}>
                {alert.message}
              </Text>
            </View>
            {onDismiss && (
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <IconButton
                  icon="close"
                  size={20}
                  onPress={handleDismiss}
                  style={styles.dismissButton}
                />
              </Animated.View>
            )}
          </View>

        {alert.suggested_actions.length > 0 && (
          <View style={styles.actionsSection}>
            <Text variant="labelMedium" style={styles.actionsLabel}>
              Suggested Actions:
            </Text>
            <View style={styles.actionButtons}>
              {alert.suggested_actions.slice(0, 2).map((action, index) => (
                <Button
                  key={index}
                  mode="outlined"
                  compact
                  onPress={() => onAction?.(action.toLowerCase().replace(/\s+/g, '_'))}
                  style={styles.actionButton}
                  labelStyle={styles.actionButtonLabel}
                >
                  {action}
                </Button>
              ))}
            </View>
          </View>
        )}

        <View style={styles.budgetSummary}>
          <View style={styles.budgetMetric}>
            <Text variant="labelSmall" style={styles.metricLabel}>Spent</Text>
            <Text variant="titleSmall" style={[styles.spentAmount, { color: getAlertColor(alert.severity) }]}>
              {formatCurrency(alert.spent_amount)}
            </Text>
          </View>
          <View style={styles.budgetMetric}>
            <Text variant="labelSmall" style={styles.metricLabel}>Budget</Text>
            <Text variant="titleSmall" style={styles.budgetAmount}>
              {formatCurrency(alert.budget_amount)}
            </Text>
          </View>
          <View style={styles.budgetMetric}>
            <Text variant="labelSmall" style={styles.metricLabel}>
              {alert.remaining_amount >= 0 ? 'Remaining' : 'Over'}
            </Text>
            <Text 
              variant="titleSmall" 
              style={[
                styles.remainingAmount,
                { color: alert.remaining_amount >= 0 ? theme.colors.primary : theme.colors.error }
              ]}
            >
              {formatCurrency(Math.abs(alert.remaining_amount))}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  </Animated.View>
);
};

const styles = StyleSheet.create({
  alertCard: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  categoryName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  alertMessage: {
    lineHeight: 20,
  },
  dismissButton: {
    margin: 0,
  },
  actionsSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  actionsLabel: {
    marginBottom: 8,
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    marginRight: 8,
    marginBottom: 4,
  },
  actionButtonLabel: {
    fontSize: 12,
  },
  budgetSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    padding: 12,
  },
  budgetMetric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  spentAmount: {
    fontWeight: '600',
  },
  budgetAmount: {
    fontWeight: '500',
  },
  remainingAmount: {
    fontWeight: '600',
  },
  // Banner variant styles
  bannerCard: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerIcon: {
    marginRight: 8,
  },
  bannerMessage: {
    flex: 1,
    lineHeight: 18,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerActionLabel: {
    fontSize: 12,
  },
  // Compact variant styles
  compactCard: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  compactContent: {
    paddingVertical: 8,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  compactMessage: {
    opacity: 0.7,
    marginTop: 2,
  },
  compactDismissButton: {
    margin: 0,
  },
  
  // Animation styles
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
});