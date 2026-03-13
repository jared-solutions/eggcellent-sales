import { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Business, Add, ArrowForward } from '@mui/icons-material';
import { useCompany } from '@/hooks/useCompany';
import { Company } from '@/lib/types';

interface CompanySetupPageProps {
  onComplete: () => void;
}

export const CompanySetupPage = ({ onComplete }: CompanySetupPageProps) => {
  const { companies, selectCompany, createCompany } = useCompany();
  const [mode, setMode] = useState<'select' | 'create'>(companies.length > 0 ? 'select' : 'create');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectCompany = (company: Company) => {
    selectCompany(company);
    onComplete();
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const slugValue = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await createCompany(name, slugValue);
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #3B82F6 0%, #22C55E 100%)',
        p: 2,
      }}
    >
      <Paper
        sx={{
          width: '100%',
          maxWidth: 480,
          p: 4,
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Business sx={{ color: 'white', fontSize: 36 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#1E293B' }}>
            {mode === 'select' ? 'Select Company' : 'Create Company'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {mode === 'select' 
              ? 'Choose which company you want to access'
              : 'Set up your company to get started'
            }
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {mode === 'select' && companies.length > 0 && (
          <>
            <List sx={{ mb: 2 }}>
              {companies.map((company) => (
                <ListItem key={company.id} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleSelectCompany(company)}
                    sx={{
                      borderRadius: '12px',
                      border: '2px solid #E2E8F0',
                      '&:hover': {
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.04)',
                      },
                    }}
                  >
                    <ListItemIcon>
                      <Business sx={{ color: '#3B82F6' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={company.name}
                      secondary={company.slug}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                    <ArrowForward sx={{ color: '#64748B' }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreateCompany}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Company Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., Sunrise Eggs Farm"
              />
              <TextField
                fullWidth
                label="Company Slug (optional)"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="e.g., sunrise-eggs"
                helperText="This will be used in URLs. Leave blank to auto-generate."
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !name.trim()}
                sx={{
                  mt: 1,
                  py: 1.5,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Company'}
              </Button>
              {companies.length > 0 && (
                <Button
                  variant="text"
                  onClick={() => setMode('select')}
                  sx={{ mt: 1 }}
                >
                  Back to Company Selection
                </Button>
              )}
            </Box>
          </form>
        )}
      </Paper>
    </Box>
  );
};
