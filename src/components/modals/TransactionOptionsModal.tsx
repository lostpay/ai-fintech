import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { Text, Icon } from 'react-native-elements';
import { TransactionWithCategory } from '../../types/Transaction';
import { useTheme } from '../../context/ThemeContext';

interface TransactionOptionsModalProps {
  visible: boolean;
  transaction: TransactionWithCategory | null;
  onClose: () => void;
  onEdit: (transaction: TransactionWithCategory) => void;
  onDelete: (transactionId: number) => void;
}

export const TransactionOptionsModal: React.FC<TransactionOptionsModalProps> = ({
  visible,
  transaction,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { theme } = useTheme();

  const handleEdit = () => {
    if (transaction) {
      onClose();
      onEdit(transaction);
    }
  };

  const handleDelete = () => {
    if (transaction) {
      Alert.alert(
        'Delete Transaction',
        `Are you sure you want to delete "${transaction.description}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              onClose();
              onDelete(transaction.id);
            },
          },
        ],
      );
    }
  };

  if (!transaction) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.handle} />

          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Transaction Options
          </Text>

          <TouchableOpacity
            style={styles.option}
            onPress={handleEdit}
          >
            <Icon
              name="edit"
              type="material-icons"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.optionText, { color: theme.colors.onSurface }]}>
              Edit Transaction
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={handleDelete}
          >
            <Icon
              name="delete"
              type="material-icons"
              size={24}
              color="#F44336"
            />
            <Text style={[styles.optionText, { color: '#F44336' }]}>
              Delete Transaction
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: theme.colors.background }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: theme.colors.onSurface }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});