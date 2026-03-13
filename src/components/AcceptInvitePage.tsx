import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Email } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useInvitationByToken, useAcceptInvitation } from '@/hooks/useInvitations';
import djangoApi from '@/integrations/django/client';

export const AcceptInvitePage = () => {
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  // Support both path parameter and query parameter
  const token = pathToken || queryToken;
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: invitation, isLoading: inviteLoading, error: inviteError } = useInvitationByToken(token);
  const acceptMutation = useAcceptInvitation();

  const [mode, setMode] = useState<'check' | 'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill email from invitation
  useEffect(() => {
    if (invitation) {
      setEmail(invitation.email);
      setFullName(invitation.full_name);
    }
  }, [invitation]);

  // Set default mode based on auth state
  useEffect(() => {
    // If no user is logged in, default to signup mode
    if (!user && !authLoading && invitation) {
      setMode('signup');
    }
  }, [user, authLoading, invitation]);

  // Auto-accept if user is already logged in AND is the invited user
  useEffect(() => {
    if (user && invitation && invitation.status === 'pending' && !success) {
      // Only auto-accept if the logged-in user is the invited user
      if (user.email.toLowerCase() === invitation.email.toLowerCase()) {
        handleAcceptInvitation();
      }
    }
  }, [user, invitation]);

  const handleAcceptInvitation = async () => {
    if (!user || !token) return;
    
    try {
      const result = await acceptMutation.mutateAsync({ token });
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }
    
    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setSubmitting(false);
      return;
    }
    
    // Validate phone number
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      setSubmitting(false);
      return;
    }

    try {
      // Split full name into first and last name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Register with Django
      const result = await djangoApi.auth.register(
        email,
        password,
        firstName,
        lastName,
        phoneNumber
      );

      if (result.user) {
        // Accept the invitation (Django uses request.user from auth token)
        await acceptMutation.mutateAsync({ token: token! });
        setSuccess(true);
        // Force page reload to ensure company data is loaded properly
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Sign in with Django
      const result = await djangoApi.auth.login(email, password);

      if (result.user) {
        // Accept the invitation (Django uses request.user from auth token)
        await acceptMutation.mutateAsync({ token: token! });
        setSuccess(true);
        // Force page reload to ensure company data is loaded properly
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || inviteLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #3B82F6 0%, #22C55E 100%)',
        }}
      >
        <CircularProgress sx={{ color: 'white' }} size={48} />
      </Box>
    );
  }

  if (inviteError || !invitation) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #3B82F6 0%, #22C55E 100%)',
          p: 2,
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 400, textAlign: 'center', borderRadius: '16px' }}>
          <ErrorIcon sx={{ fontSize: 64, color: '#EF4444', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Invalid Invitation
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            This invitation link is invalid or has expired. Please contact the person who invited you for a new link.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            Go to Home
          </Button>
        </Paper>
      </Box>
    );
  }

  if (invitation.status !== 'pending') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #3B82F6 0%, #22C55E 100%)',
          p: 2,
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 400, textAlign: 'center', borderRadius: '16px' }}>
          <ErrorIcon sx={{ fontSize: 64, color: '#F59E0B', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Invitation {invitation.status === 'accepted' ? 'Already Used' : 'Expired'}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {invitation.status === 'accepted'
              ? 'This invitation has already been accepted.'
              : 'This invitation has expired or been cancelled.'}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            Go to Home
          </Button>
        </Paper>
      </Box>
    );
  }

  if (success) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #3B82F6 0%, #22C55E 100%)',
          p: 2,
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 400, textAlign: 'center', borderRadius: '16px' }}>
          <CheckCircle sx={{ fontSize: 64, color: '#22C55E', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Invitation Accepted!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Welcome to the team! You now have access to the company dashboard.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Redirecting to dashboard...
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #3B82F6 0%, #22C55E 100%)',
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%', borderRadius: '16px' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Email sx={{ fontSize: 48, color: '#3B82F6', mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            You're Invited!
          </Typography>
          <Typography color="text.secondary">
            Join {invitation.company?.name || 'the company'} as a {invitation.role}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {mode === 'signup' ? (
          <form onSubmit={handleSignUp}>
            <TextField
              fullWidth
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              disabled
              required
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="+254712345678"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{ mb: 3 }}
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ mb: 2 }}
            >
              {submitting ? 'Creating Account...' : 'Create Account & Join'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="text"
                onClick={() => setMode('signin')}
                size="small"
              >
                Already have an account? Sign In
              </Button>
            </Box>
          </form>
        ) : (
          <form onSubmit={handleSignIn}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ mb: 2 }}
            >
              {submitting ? 'Signing In...' : 'Sign In & Join'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="text"
                onClick={() => setMode('signup')}
                size="small"
              >
                Don't have an account? Sign Up
              </Button>
            </Box>
          </form>
        )}

        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            or
          </Typography>
        </Divider>

        <Button
          fullWidth
          variant="outlined"
          onClick={() => navigate('/')}
          sx={{ mt: 1 }}
        >
          Go Back to Home
        </Button>
      </Paper>
    </Box>
  );
};
