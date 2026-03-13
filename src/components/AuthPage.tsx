import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Link,
} from '@mui/material';
import {
  Login,
  PersonAdd,
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const getStrength = (): { level: number; color: string; label: string } => {
    if (!password) return { level: 0, color: '#E0E0E0', label: '' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return { level: 1, color: '#EF4444', label: 'Weak' };
    if (score <= 3) return { level: 2, color: '#F59E0B', label: 'Fair' };
    if (score <= 4) return { level: 3, color: '#10B981', label: 'Good' };
    return { level: 4, color: '#059669', label: 'Strong' };
  };

  const strength = getStrength();

  return (
    <Box sx={{ mt: 0.5 }}>
      <LinearProgress
        variant="determinate"
        value={(strength.level / 4) * 100}
        sx={{
          height: 4,
          borderRadius: 2,
          backgroundColor: '#E0E0E0',
          '& .MuiLinearProgress-bar': {
            backgroundColor: strength.color,
            borderRadius: 2,
          },
        }}
      />
      {password && (
        <Typography
          variant="caption"
          sx={{ color: strength.color, fontWeight: 500, mt: 0.5, display: 'block' }}
        >
          {strength.label}
        </Typography>
      )}
    </Box>
  );
};

export const AuthPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot password flow states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: email, 2: code, 3: new password
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [countdown, setCountdown] = useState(0); // Countdown timer in seconds

  // Flip animation state
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'to-signup' | 'to-signin'>('to-signup');
  const prevTabRef = useRef(tab);
  const [showBack, setShowBack] = useState(false); // Track which side to show

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  // Format countdown as mm:ss
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    fullName?: string;
    phoneNumber?: string;
    acceptTerms?: string;
  }>({});
  const { signIn, signUp, resetPassword, verifyResetCode, confirmPasswordReset } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    let isValid = true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (tab === 1) {
      const passwordRequirements = [];
      if (password.length < 6) passwordRequirements.push('at least 6 characters');
      if (!/[A-Z]/.test(password)) passwordRequirements.push('1 uppercase letter');
      if (!/[0-9]/.test(password)) passwordRequirements.push('1 number');
      if (!/[^A-Za-z0-9]/.test(password)) passwordRequirements.push('1 special character');
      
      if (passwordRequirements.length > 0) {
        newErrors.password = `Password must contain: ${passwordRequirements.join(', ')}`;
        isValid = false;
      }
    }

    if (tab === 1) {
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
        isValid = false;
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
        isValid = false;
      }
    }

    if (tab === 1) {
      if (!fullName.trim()) {
        newErrors.fullName = 'Full name is required';
        isValid = false;
      } else if (fullName.trim().length < 2) {
        newErrors.fullName = 'Full name must be at least 2 characters';
        isValid = false;
      }
      
      // Phone number validation (required for registration)
      if (!phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required';
        isValid = false;
      } else if (!/^\+?[0-9]{10,15}$/.test(phoneNumber.replace(/\s/g, ''))) {
        newErrors.phoneNumber = 'Please enter a valid phone number';
        isValid = false;
      }
    }

    if (tab === 1 && !acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (tab === 0) {
        await signIn(email, password);
      } else {
        await signUp(email, password, fullName, phoneNumber);
        setSuccess('Account created! Please check your email to verify your account.');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setTab(0);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset your password');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await resetPassword(email);
      setSuccess('A verification code has been sent to your email. Please check your inbox.');
      setForgotPasswordStep(2); // Move to code entry step
      setCountdown(60); // Start 1 minute countdown
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  // Handle verification code submission
  const handleVerifyCode = async () => {
    if (!resetCode || resetCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isValid = await verifyResetCode(email, resetCode);
      if (isValid) {
        setSuccess('Code verified! Please enter your new password.');
        setForgotPasswordStep(3); // Move to new password step
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid verification code';
      // Check if it's a max attempts exceeded error
      if (errorMessage.includes('Maximum') || errorMessage.includes('all')) {
        setError(errorMessage);
        // Show option to resend code
        setCountdown(0);
      } else {
        // Try to extract remaining attempts from error message
        const match = errorMessage.match(/(\d+) attempt/);
        if (match) {
          setError(`Wrong code. You have ${match[1]} attempt(s) remaining.`);
        } else {
          setError(errorMessage);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle new password submission
  const handleResetPassword = async () => {
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await confirmPasswordReset(email, resetCode, newPassword, confirmNewPassword);
      setSuccess('Password reset successfully! You can now log in with your new password.');
      // Reset to login after a short delay
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordStep(1);
        setEmail('');
        setResetCode('');
        setNewPassword('');
        setConfirmNewPassword('');
        setSuccess('');
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Go back to email step
  const handleBackToEmail = () => {
    setForgotPasswordStep(1);
    setError('');
    setSuccess('');
    setCountdown(0);
  };

  // Cancel forgot password flow
  const handleCancelForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordStep(1);
    setEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmNewPassword('');
    setError('');
    setSuccess('');
    setCountdown(0);
  };

  const handleTabChange = (newValue: number) => {
    // Trigger flip animation when switching between sign in (0) and sign up (1)
    if (newValue !== prevTabRef.current) {
      setFlipDirection(newValue === 1 ? 'to-signup' : 'to-signin');
      setIsFlipping(true);
      
      // Halfway through the flip - switch content
      setTimeout(() => {
        setShowBack(true);
        setTab(newValue);
        prevTabRef.current = newValue;
      }, 250);
      
      // Complete the flip - end animation
      setTimeout(() => {
        setIsFlipping(false);
        setShowBack(false);
      }, 500);
    }
    setError('');
    setSuccess('');
    setErrors({});
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: "url('/home-image.jpg')",
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 0,
        },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: isMobile ? '100%' : 440, mt: isMobile ? 7 : 0 }}>
        <Paper
        elevation={isMobile ? 0 : 8}
        sx={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 440,
          mt: isMobile ? 7 : 0,
          p: isMobile ? 3 : 4,
          borderRadius: isMobile ? '20px' : '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: isMobile ? 2.5 : 4 }}>
          <Box
            component="img"
            src="/eggs image.png"
            alt="EggTrack Pro Logo"
            sx={{
              width: isMobile ? 80 : 100,
              height: isMobile ? 80 : 100,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: isMobile ? 2 : 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              objectFit: 'cover',
            }}
          />
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 700, mb: 1, color: '#1E293B' }}>
            EggTrack Pro
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>
            Egg Supply & Sales Management
          </Typography>
          <Box
            sx={{
              mt: 2,
              py: 1,
              px: 2,
              borderRadius: '8px',
              backgroundColor: 'rgba(34, 85, 34, 0.1)',
              display: 'inline-block',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: '#166534',
                fontWeight: 600,
                fontStyle: 'italic',
              }}
            >
              From Farm to Market
            </Typography>
          </Box>
        </Box>

        {/* Forgot Password Flow */}
        {showForgotPassword ? (
          <Box>
            {/* Back button and Cancel */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Button
                onClick={handleBackToEmail}
                disabled={forgotPasswordStep === 1}
                sx={{ 
                  textTransform: 'none',
                  color: '#15803D',
                  '&:hover': { backgroundColor: 'rgba(21, 128, 61, 0.08)' }
                }}
              >
                ← Back
              </Button>
              <Button
                onClick={handleCancelForgotPassword}
                sx={{ 
                  textTransform: 'none',
                  color: 'text.secondary',
                }}
              >
                Cancel
              </Button>
            </Box>

            {/* Step 1: Enter Email */}
            {forgotPasswordStep === 1 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#1E293B' }}>
                  Reset Your Password
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Enter your email address and we'll send you a verification code.
                </Typography>

                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                />

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleForgotPassword}
                  disabled={loading || !email}
                  sx={{
                    mt: 1,
                    py: 1.5,
                    backgroundColor: '#15803D',
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    '&:hover': {
                      backgroundColor: '#166534',
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Send Verification Code'}
                </Button>
              </Box>
            )}

            {/* Step 2: Enter Verification Code */}
            {forgotPasswordStep === 2 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#1E293B' }}>
                  Enter Verification Code
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  We sent a 6-digit code to {email}. Enter it below.
                </Typography>
                
                {/* Countdown timer or Resend button */}
                {countdown > 0 ? (
                  <Box sx={{ mb: 2, textAlign: 'center', py: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Resend code in <Typography component="span" sx={{ fontWeight: 700, color: '#15803D' }}>{countdown}</Typography> seconds
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="text"
                      onClick={handleForgotPassword}
                      disabled={loading}
                      sx={{
                        textTransform: 'none',
                        color: '#15803D',
                        fontWeight: 600,
                      }}
                    >
                      Didn't receive the code? Resend
                    </Button>
                  </Box>
                )}

                <TextField
                  fullWidth
                  label="Verification Code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  sx={{ mb: 2 }}
                  inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2rem' } }}
                />

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleVerifyCode}
                  disabled={loading || resetCode.length !== 6}
                  sx={{
                    mt: 1,
                    py: 1.5,
                    backgroundColor: '#15803D',
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    '&:hover': {
                      backgroundColor: '#166534',
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Verify Code'}
                </Button>
              </Box>
            )}

            {/* Step 3: Enter New Password */}
            {forgotPasswordStep === 3 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#1E293B' }}>
                  Set New Password
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Enter your new password below.
                </Typography>

                <TextField
                  fullWidth
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {newPassword && <PasswordStrengthIndicator password={newPassword} />}

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  sx={{ mt: 2, mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                />

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleResetPassword}
                  disabled={loading || !newPassword || !confirmNewPassword}
                  sx={{
                    mt: 1,
                    py: 1.5,
                    backgroundColor: '#15803D',
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    '&:hover': {
                      backgroundColor: '#166534',
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Reset Password'}
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <>
          {/* Flip Animation Container - Full 180 degree card flip */}
          <Box
            sx={{
              perspective: '1200px',
              transformStyle: 'preserve-3d',
              position: 'relative',
              minHeight: tab === 1 ? 550 : 380,
              overflow: 'visible',
              transition: 'min-height 0.3s ease',
            }}
          >
            {/* Card Back - Shows during flip */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
                transition: 'opacity 0.25s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isFlipping ? 'rotateY(90deg) scale(0.9)' : 'rotateY(90deg) scale(0.9)',
                opacity: isFlipping ? 1 : 0,
                zIndex: isFlipping ? 10 : 0,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #15803D 0%, #166534 50%, #14532D 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isFlipping 
                  ? '0 20px 50px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.1) inset' 
                  : '0 4px 20px rgba(0,0,0,0.2)',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)',
                  borderRadius: '16px',
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 80,
                  height: 80,
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                },
              }}
            >
              <Box
                component="img"
                src="/eggs image.png"
                alt="EggTrack Pro"
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  opacity: 0.9,
                  zIndex: 1,
                }}
              />
              <Typography 
                sx={{ 
                  color: 'white', 
                  fontWeight: 700, 
                  fontSize: '1.1rem',
                  mt: 1,
                  zIndex: 1,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                EggTrack Pro
              </Typography>
            </Box>

            {/* Front of card - Sign In form */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.5s ease',
                transform: isFlipping 
                  ? (flipDirection === 'to-signup' ? 'rotateY(180deg) scale(0.95)' : 'rotateY(-180deg) scale(0.95)')
                  : (tab === 1 ? 'rotateY(180deg) scale(1)' : 'rotateY(0deg) scale(1)'),
                zIndex: tab === 1 ? 0 : 1,
                boxShadow: isFlipping 
                  ? '0 25px 50px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.1) inset' 
                  : '0 4px 20px rgba(0,0,0,0.15)',
              }}
            >
              <Tabs
                value={0}
                onChange={(_, newValue) => handleTabChange(newValue)}
          variant="fullWidth"
          sx={{ 
            mb: 3,
            '& .MuiTab-root': {
              borderRadius: '12px',
              mx: 0.5,
              minHeight: isMobile ? 42 : 48,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: isMobile ? '0.875rem' : '0.9375rem',
            },
            '& .Mui-selected': {
              backgroundColor: 'rgba(21, 128, 61, 0.1)',
            },
            '& .MuiTabs-indicator': {
              display: 'none',
            },
          }}
        >
          <Tab
            icon={<Login />}
            iconPosition="start"
            label={isMobile ? 'Sign In' : 'Sign In'}
            aria-label="Sign In tab"
          />
          <Tab
            icon={<PersonAdd />}
            iconPosition="start"
            label={isMobile ? 'Sign Up' : 'Sign Up'}
            aria-label="Sign Up tab"
          />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tab === 1 && (
              <>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                  }}
                  required
                  error={!!errors.fullName}
                  helperText={errors.fullName}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    'aria-label': 'Full Name',
                    'aria-required': 'true',
                  }}
                />
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: undefined });
                  }}
                  required
                  error={!!errors.phoneNumber}
                  helperText={errors.phoneNumber || 'e.g., +254712345678'}
                  placeholder="+254712345678"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    'aria-label': 'Phone Number',
                    'aria-required': 'true',
                  }}
                />
              </>
            )}
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              required
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{
                'aria-label': 'Email address',
                'aria-required': 'true',
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              required
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              inputProps={{
                'aria-label': 'Password',
                'aria-required': 'true',
              }}
            />
            
            {tab === 1 && password && (
              <Box sx={{ mb: 1 }}>
                <PasswordStrengthIndicator password={password} />
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
                    Password requirements:
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
                    • At least 6 characters
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                    • 1 uppercase letter (A-Z)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                    • 1 number (0-9)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                    • 1 special character (!@#$%^&*)
                  </Typography>
                </Box>
              </Box>
            )}

            {tab === 1 && (
              <TextField
                fullWidth
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
                required
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        size="small"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  'aria-label': 'Confirm password',
                  'aria-required': 'true',
                }}
              />
            )}

            {tab === 1 && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(e.target.checked);
                        if (errors.acceptTerms) setErrors({ ...errors, acceptTerms: undefined });
                      }}
                      color="primary"
                      size="small"
                      inputProps={{
                        'aria-label': 'Accept terms and conditions',
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      I agree to the{' '}
                      <Link href="#" underline="hover" sx={{ color: '#15803D' }}>
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="#" underline="hover" sx={{ color: '#15803D' }}>
                        Privacy Policy
                      </Link>
                    </Typography>
                  }
                />
              </Box>
            )}

            {tab === 1 && errors.acceptTerms && (
              <Typography variant="caption" color="error" sx={{ mt: -0.5, ml: 4, display: 'block', mb: 1 }}>
                {errors.acceptTerms}
              </Typography>
            )}

            {tab === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: -1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      color="primary"
                      size="small"
                      inputProps={{
                        'aria-label': 'Remember me',
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      Remember me
                    </Typography>
                  }
                />
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                    setSuccess('');
                  }}
                  disabled={loading}
                  sx={{
                    cursor: 'pointer',
                    color: '#15803D',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Forgot password?
                </Link>
              </Box>
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              fullWidth
              sx={{
                mt: 1,
                py: isMobile ? 1.25 : 1.5,
                borderRadius: '12px',
                fontSize: isMobile ? '0.9375rem' : '1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                boxShadow: '0 4px 12px rgba(21, 128, 61, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #166534 0%, #14532D 100%)',
                  boxShadow: '0 6px 16px rgba(21, 128, 61, 0.5)',
                },
                '&:disabled': {
                  background: '#94A3B8',
                  color: '#FFFFFF',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : tab === 0 ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </Box>
        </form>
            </Box>
            
            {/* Back of card - Sign Up form */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.5s ease',
                transform: isFlipping 
                  ? (flipDirection === 'to-signin' ? 'rotateY(0deg) scale(1)' : 'rotateY(-180deg) scale(0.95)')
                  : (tab === 0 ? 'rotateY(-180deg) scale(1)' : 'rotateY(0deg) scale(1)'),
                zIndex: tab === 0 ? 0 : 1,
                boxShadow: isFlipping 
                  ? '0 25px 50px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.1) inset' 
                  : '0 4px 20px rgba(0,0,0,0.15)',
              }}
            >
              <Tabs
                value={1}
                onChange={(_, newValue) => handleTabChange(newValue)}
                variant="fullWidth"
                sx={{ 
                  mb: 3,
                  '& .MuiTab-root': {
                    borderRadius: '12px',
                    mx: 0.5,
                    minHeight: isMobile ? 42 : 48,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: isMobile ? '0.875rem' : '0.9375rem',
                  },
                  '& .Mui-selected': {
                    backgroundColor: 'rgba(21, 128, 61, 0.1)',
                  },
                  '& .MuiTabs-indicator': {
                    display: 'none',
                  },
                }}
              >
                <Tab
                  icon={<Login />}
                  iconPosition="start"
                  label={isMobile ? 'Sign In' : 'Sign In'}
                  aria-label="Sign In tab"
                />
                <Tab
                  icon={<PersonAdd />}
                  iconPosition="start"
                  label={isMobile ? 'Sign Up' : 'Sign Up'}
                  aria-label="Sign Up tab"
                />
              </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tab === 1 && (
              <>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                  }}
                  required
                  error={!!errors.fullName}
                  helperText={errors.fullName}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    'aria-label': 'Full Name',
                    'aria-required': 'true',
                  }}
                />
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: undefined });
                  }}
                  required
                  error={!!errors.phoneNumber}
                  helperText={errors.phoneNumber || 'e.g., +254712345678'}
                  placeholder="+254712345678"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    'aria-label': 'Phone Number',
                    'aria-required': 'true',
                  }}
                />
              </>
            )}
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              required
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{
                'aria-label': 'Email address',
                'aria-required': 'true',
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              required
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              inputProps={{
                'aria-label': 'Password',
                'aria-required': 'true',
              }}
            />
            {tab === 1 && (
              <>
                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  required={tab === 1}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          size="small"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    'aria-label': 'Confirm password',
                    'aria-required': 'true',
                  }}
                />
              </>
            )}

            {tab === 1 && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={acceptTerms}
                      onChange={(e) => {
                        setAcceptTerms(e.target.checked);
                        if (errors.acceptTerms) setErrors({ ...errors, acceptTerms: undefined });
                      }}
                      color="primary"
                      size="small"
                      inputProps={{
                        'aria-label': 'Accept terms and conditions',
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      I agree to the{' '}
                      <Link href="#" underline="hover" sx={{ color: '#15803D' }}>
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="#" underline="hover" sx={{ color: '#15803D' }}>
                        Privacy Policy
                      </Link>
                    </Typography>
                  }
                />
              </Box>
            )}

            {tab === 1 && errors.acceptTerms && (
              <Typography variant="caption" color="error" sx={{ mt: -0.5, ml: 4, display: 'block', mb: 1 }}>
                {errors.acceptTerms}
              </Typography>
            )}

            {tab === 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: -1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      color="primary"
                      size="small"
                      inputProps={{
                        'aria-label': 'Remember me',
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      Remember me
                    </Typography>
                  }
                />
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                    setSuccess('');
                  }}
                  disabled={loading}
                  sx={{
                    cursor: 'pointer',
                    color: '#15803D',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Forgot password?
                </Link>
              </Box>
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              fullWidth
              sx={{
                mt: 1,
                py: isMobile ? 1.25 : 1.5,
                borderRadius: '12px',
                fontSize: isMobile ? '0.9375rem' : '1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                boxShadow: '0 4px 12px rgba(21, 128, 61, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #166534 0%, #14532D 100%)',
                  boxShadow: '0 6px 16px rgba(21, 128, 61, 0.5)',
                },
                '&:disabled': {
                  background: '#94A3B8',
                  color: '#FFFFFF',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : tab === 0 ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </Box>
        </form>
            </Box>
          </Box>
          </>
        )}
      </Paper>
      </Box>
    </Box>
  );
};
