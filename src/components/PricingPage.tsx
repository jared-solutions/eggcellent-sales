import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Skeleton,
  Alert,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { usePrices, useCurrentPrices, useCreatePrice } from '@/hooks/usePrices';
import { EggCategory } from '@/lib/types';

const categoryColors: Record<EggCategory, string> = {
  starter: '#22c55e',
  mid: '#f59e0b',
  normal: '#3b82f6',
};

interface PricingPageProps {
  highlightAction?: string | null;
  onActionComplete?: () => void;
}

export const PricingPage = ({ highlightAction, onActionComplete }: PricingPageProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState<EggCategory>('starter');
  const [price, setPrice] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Highlight dialog state
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [highlightMessage, setHighlightMessage] = useState('');
  const pricingSectionRef = useRef<HTMLDivElement>(null);
  
  // Handle highlight action from notifications
  useEffect(() => {
    if (highlightAction) {
      if (highlightAction === 'prices') {
        setHighlightMessage('💰 Please set your egg prices for each category. Go to the Pricing page and add prices for Starter, Mid, and Normal eggs.');
        setHighlightOpen(true);
      }
    }
  }, [highlightAction]);
  
  const handleHighlightClose = () => {
    setHighlightOpen(false);
    if (onActionComplete) {
      onActionComplete();
    }
  };
  
  const handleScrollToPricing = () => {
    setHighlightOpen(false);
    pricingSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (onActionComplete) {
      onActionComplete();
    }
  };

  const { data: prices, isLoading, error } = usePrices();
  const { data: currentPrices } = useCurrentPrices();
  const createMutation = useCreatePrice();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleClose = () => {
    setDialogOpen(false);
    setCategory('starter');
    setPrice('');
    setStartDate(new Date().toISOString().split('T')[0]);
  };

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync({
        category,
        price_per_tray: parseFloat(price),
        start_date: startDate,
      });
      handleClose();
    } catch (err) {
      console.error('Error saving price:', err);
    }
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ border: '2px solid' }}>
        Error loading prices: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Pricing Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add sx={{ color: '#1976d2' }} />}
          onClick={() => setDialogOpen(true)}
          sx={{
            backgroundColor: '#ffffff',
            color: '#1976d2',
            border: '2px solid #1976d2',
            borderRadius: '10px',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#e3f2fd',
              boxShadow: 'none',
            },
          }}
        >
          Update Price
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }} ref={pricingSectionRef}>
        {(['starter', 'mid', 'normal'] as EggCategory[]).map((cat) => (
      <Grid size={{ xs: 12, md: 4 }} key={cat}>
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: '12px' }}>
              <Chip
                label={cat.toUpperCase()}
                sx={{
                  backgroundColor: categoryColors[cat],
                  color: 'white',
                  fontWeight: 700,
                  mb: 2,
                }}
              />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {currentPrices?.[cat] ? formatCurrency(currentPrices[cat]!.price_per_tray) : '-'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                per tray
              </Typography>
              {currentPrices?.[cat] && (
                <Typography variant="caption" color="text.secondary">
                  Since {formatDate(currentPrices[cat]!.start_date)}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Price History
      </Typography>

  <TableContainer component={Paper} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell align="right">Price per Tray</TableCell>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : prices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No pricing history.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              prices?.map((priceItem) => (
                <TableRow key={priceItem.id}>
                  <TableCell>
                    <Chip
                      label={priceItem.category}
                      size="small"
                      sx={{
                        backgroundColor: categoryColors[priceItem.category as EggCategory],
                        color: 'white',
                        textTransform: 'capitalize',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatCurrency(priceItem.price_per_tray)}
                  </TableCell>
                  <TableCell>{formatDate(priceItem.start_date)}</TableCell>
                  <TableCell>{priceItem.end_date ? formatDate(priceItem.end_date) : '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={priceItem.end_date ? 'Expired' : 'Active'}
                      size="small"
                      sx={{
                        backgroundColor: priceItem.end_date ? 'error.main' : 'success.main',
                        color: 'white',
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

  <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { boxShadow: 'none', borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '2px solid' }}>
          Update Price
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 3, border: '2px solid' }}>
            This will create a new price entry and close the current active price for this category.
            Historical sales will retain their original prices.
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value as EggCategory)}
              >
                <MenuItem value="starter">Starter</MenuItem>
                <MenuItem value="mid">Mid</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="New Price per Tray (KES)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              fullWidth
              required
              inputProps={{ min: 0, step: 0.01 }}
            />
            <TextField
              label="Effective From"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid' }}>
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!price || createMutation.isPending}
          >
            Update Price
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Highlight Action Dialog */}
      <Dialog 
        open={highlightOpen} 
        onClose={handleHighlightClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          ⚠️ Action Required
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {highlightMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleHighlightClose} variant="outlined">
            Got it
          </Button>
          <Button 
            onClick={handleScrollToPricing} 
            variant="contained" 
            sx={{ bgcolor: 'primary.main' }}
          >
            Go to Pricing ↓
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
