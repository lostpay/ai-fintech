import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, Checkbox } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import type { StackScreenProps } from '@react-navigation/stack';

type Props = StackScreenProps<any, 'SignUp'>;

export const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  };

  const handleSignUp = async () => {
    // Validate inputs
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

    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { user, error: signUpError } = await signUp(email.trim(), password);

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.');
        } else if (signUpError.message.includes('Password')) {
          setError(signUpError.message);
        } else {
          setError(signUpError.message);
        }
      } else if (user) {
        setSuccess(true);
        // Show success message for a moment then navigate to login
        setTimeout(() => {
          navigation.navigate('Login');
        }, 2000);
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Sign up error:', err);
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
        <Text variant="headlineMedium" style={[styles.successTitle, { color: theme.colors.primary }]}>
          Account Created!
        </Text>
        <Text variant="bodyLarge" style={[styles.successText, { color: theme.colors.onSurfaceVariant }]}>
          Please check your email to verify your account.
        </Text>
        <Text variant="bodyMedium" style={[styles.successSubtext, { color: theme.colors.onSurfaceVariant }]}>
          Redirecting to login...
        </Text>
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
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onBackground }]}>
            Create Account
          </Text>
          <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Sign up to start tracking your finances
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
            error={!!error && error.toLowerCase().includes('email')}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError('');
            }}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
            disabled={loading}
            error={!!error && (error.toLowerCase().includes('password') && !error.toLowerCase().includes('match'))}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setError('');
            }}
            mode="outlined"
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoComplete="password"
            left={<TextInput.Icon icon="lock-check" />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
            style={styles.input}
            disabled={loading}
            error={!!error && error.toLowerCase().includes('match')}
          />

          <View style={styles.checkboxContainer}>
            <Checkbox
              status={agreedToTerms ? 'checked' : 'unchecked'}
              onPress={() => {
                setAgreedToTerms(!agreedToTerms);
                setError('');
              }}
              disabled={loading}
            />
            <Text
              variant="bodyMedium"
              style={[styles.checkboxText, { color: theme.colors.onSurfaceVariant }]}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              I agree to the Terms of Service and Privacy Policy
            </Text>
          </View>

          {error ? (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="contained"
            onPress={handleSignUp}
            loading={loading}
            disabled={loading}
            style={styles.signUpButton}
            contentStyle={styles.buttonContent}
          >
            Create Account
          </Button>

          <View style={styles.loginPrompt}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Already have an account?{' '}
            </Text>
            <Button
              mode="text"
              onPress={handleBackToLogin}
              disabled={loading}
              compact
              style={styles.loginLink}
            >
              Sign In
            </Button>
          </View>
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
  successTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtext: {
    textAlign: 'center',
    opacity: 0.7,
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
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxText: {
    flex: 1,
    marginLeft: 8,
  },
  errorText: {
    marginBottom: 8,
  },
  signUpButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginLink: {
    marginLeft: -8,
  },
});
