import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';

interface BudgetProgressSkeletonProps {
  variant?: 'full' | 'compact';
  count?: number;
}

const SkeletonBox: React.FC<{ 
  width: number | string; 
  height: number; 
  borderRadius?: number;
  marginBottom?: number; 
}> = ({ 
  width, 
  height, 
  borderRadius = 4, 
  marginBottom = 0 
}) => {
  const { theme } = useTheme();
  
  return (
    <View
      style={{
        width: typeof width === 'string' ? undefined : width,
        flex: typeof width === 'string' ? 1 : undefined,
        height,
        borderRadius,
        backgroundColor: theme.colors.outline,
        marginBottom,
        opacity: 0.3,
      }}
    />
  );
};

export const BudgetProgressSkeleton: React.FC<BudgetProgressSkeletonProps> = ({
  variant = 'full',
  count = 1
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    card: {
      marginBottom: variant === 'compact' ? 8 : 16,
      backgroundColor: theme.colors.surface,
      elevation: 2,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.outline,
    },
    compactCard: {
      marginRight: 16,
      width: 280,
    },
    cardContent: {
      padding: variant === 'compact' ? 12 : 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: variant === 'compact' ? 32 : 40,
      height: variant === 'compact' ? 32 : 40,
      borderRadius: variant === 'compact' ? 16 : 20,
      backgroundColor: theme.colors.outline,
      marginRight: 12,
      opacity: 0.3,
    },
    progressContainer: {
      marginVertical: 8,
    },
    amountsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    amountColumn: {
      alignItems: variant === 'compact' ? 'center' : 'flex-start',
    },
  });

  const SkeletonCard = () => (
    <Card 
      style={[
        styles.card, 
        variant === 'compact' && styles.compactCard
      ]}
    >
      <View style={styles.cardContent}>
        {/* Header skeleton */}
        <View style={styles.header}>
          <View style={styles.categoryRow}>
            <View style={styles.iconContainer} />
            <SkeletonBox 
              width="60%" 
              height={variant === 'compact' ? 14 : 16} 
              marginBottom={0}
            />
          </View>
          
          {variant === 'full' && (
            <SkeletonBox 
              width={60} 
              height={24} 
              borderRadius={12} 
              marginBottom={0}
            />
          )}
        </View>

        {/* Progress bar skeleton */}
        <View style={styles.progressContainer}>
          <SkeletonBox 
            width="100%" 
            height={variant === 'compact' ? 4 : 6} 
            borderRadius={variant === 'compact' ? 2 : 3}
            marginBottom={0}
          />
        </View>

        {/* Amounts skeleton */}
        {variant === 'full' ? (
          <View style={styles.amountsRow}>
            <View style={styles.amountColumn}>
              <SkeletonBox width={40} height={10} marginBottom={4} />
              <SkeletonBox width={60} height={14} marginBottom={0} />
            </View>
            <View style={styles.amountColumn}>
              <SkeletonBox width={50} height={10} marginBottom={4} />
              <SkeletonBox width={70} height={14} marginBottom={0} />
            </View>
            <View style={styles.amountColumn}>
              <SkeletonBox width={30} height={18} marginBottom={0} />
            </View>
          </View>
        ) : (
          <View style={styles.amountsRow}>
            <View style={styles.amountColumn}>
              <SkeletonBox width={120} height={12} marginBottom={0} />
            </View>
            <View style={styles.amountColumn}>
              <SkeletonBox width={40} height={16} marginBottom={0} />
            </View>
          </View>
        )}

        {/* Period text skeleton for compact view */}
        {variant === 'compact' && (
          <View style={{ alignItems: 'center', marginTop: 4 }}>
            <SkeletonBox width={60} height={10} marginBottom={0} />
          </View>
        )}
      </View>
    </Card>
  );

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </>
  );
};