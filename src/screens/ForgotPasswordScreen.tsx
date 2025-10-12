import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import type { StackScreenProps } from '@react-navigation/stack';

type Props = StackScreenProps<any, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    // Validate email
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: resetError } = await resetPassword(email.trim());

      if (resetError) {
        setError(resetError.message || 'Failed to send reset email. Please try again.');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  if (success) {
    return (
      <View style={[styles.container, styles.successContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialIcons name="mark-email-read" size={48} color={theme.colors.primary} />
        </View>
        <Text variant="headlineMedium" style={[styles.successTitle, { color: theme.colors.onBackground }]}>
          Check Your Email
        </Text>
        <Text variant="bodyLarge" style={[styles.successText, { color: theme.colors.onSurfaceVariant }]}>
          We've sent password reset instructions to:
        </Text>
        <Text variant="bodyLarge" style={[styles.emailText, { color: theme.colors.primary }]}>
          {email}
        </Text>
        <Text variant="bodyMedium" style={[styles.successSubtext, { color: theme.colors.onSurfaceVariant }]}>
          If you don't see the email, check your spam folder.
        </Text>
        <Button
          mode="contained"
          onPress={handleBackToLogin}
          style={styles.backButton}
          contentStyle={styles.buttonContent}
        >
          Back to Login
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialIcons name="lock-reset" size={48} color={theme.colors.primary} />
          </View>
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onBackground }]}>
            Reset Password
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Enter your email address and we'll send you instructions to reset your password
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError('');
            }}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            left={<TextInput.Icon icon="email" />}
            style={styles.input}
            disabled={loading}
            error={!!error}
          />

          {error ? (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleResetPassword}
            loading={loading}
            disabled={loading}
            style={styles.resetButton}
            contentStyle={styles.buttonContent}
          >
            Send Reset Link
          </Button>

          <Button
            mode="text"
            onPress={handleBackToLogin}
            disabled={loading}
            style={styles.backToLoginButton}
          >
            Back to Login
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  successContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
    paddingHorizontal: 16,
  },
  successTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  successSubtext: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 8,
  },
  resetButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  backToLoginButton: {
    marginTop: 8,
  },
  backButton: {
    width: '100%',
  },
});
