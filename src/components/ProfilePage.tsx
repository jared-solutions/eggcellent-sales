import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Avatar,
  Divider,
  Alert,
} from '@mui/material';
import { Save, Person } from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import djangoApi from '@/integrations/django/client';

export const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const updatedUser = await djangoApi.auth.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      
      if (updateUser && updatedUser) {
        updateUser(updatedUser);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#1E293B' }}>
        Profile Settings
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Profile updated successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 3 }}>
          {/* Profile Avatar Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: '#3B82F6',
                fontSize: '1.5rem',
                fontWeight: 600,
              }}
            >
              {firstName?.[0]?.toUpperCase() || email?.[0].toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {firstName} {lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {email}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Profile Form */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                required
                InputProps={{
                  startAdornment: <Person sx={{ color: 'action.active', mr: 1 }} />,
                }}
              />
              <TextField
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <Person sx={{ color: 'action.active', mr: 1 }} />,
                }}
              />
            </Box>

            <TextField
              label="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              disabled
              helperText="Email cannot be changed"
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={loading}
                startIcon={<Save />}
                sx={{
                  bgcolor: '#3B82F6',
                  '&:hover': { bgcolor: '#2563EB' },
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                }}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
