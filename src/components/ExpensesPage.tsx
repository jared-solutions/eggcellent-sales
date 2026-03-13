import { useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Skeleton, Alert, Chip, useMediaQuery, useTheme,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useExpenses, useCreateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { useSupplies } from '@/hooks/useSupplies';
import { useFeedInventory } from '@/hooks/useFeedInventory';

const EXPENSE_CATEGORIES = ['Feed', 'Medicine', 'Labor', 'Transport', 'Equipment', 'Utilities', 'General', 'Other'];

export const ExpensesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [supplyId, setSupplyId] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupply, setFilterSupply] = useState('');
  
  // Feed purchase fields
  const [feedSacks, setFeedSacks] = useState('');
  const [feedKgPerSack, setFeedKgPerSack] = useState('50');
  const [feedPricePerSack, setFeedPricePerSack] = useState('');
  const [feedBrand, setFeedBrand] = useState('');
  
  const feedInventory = useFeedInventory();

  const { data: expenses, isLoading, error } = useExpenses(filterSupply || undefined);
  const { data: supplies } = useSupplies();
  const createMutation = useCreateExpense();
  const deleteMutation = useDeleteExpense();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const getSupplyLabel = (id: string) => {
    const s = supplies?.find(s => s.id === id);
    return s ? `${formatDate(s.week_start_date)} - ${formatDate(s.week_end_date)}` : '-';
  };

  const handleClose = () => {
    setDialogOpen(false);
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setCategory('General');
    setDescription('');
    setAmount('');
    setPaymentMethod('');
    setNotes('');
    setSupplyId('');
    setFeedSacks('');
    setFeedKgPerSack('50');
    setFeedPricePerSack('');
    setFeedBrand('');
  };

  const handleSubmit = async () => {
    try {
      // If category is Feed and feed details are provided, add to feed inventory
      if (category === 'Feed' && feedSacks && feedPricePerSack) {
        const sacks = parseFloat(feedSacks) || 0;
        const kgPerSack = parseFloat(feedKgPerSack) || 50;
        const pricePerSack = parseFloat(feedPricePerSack) || 0;
        const totalKg = sacks * kgPerSack;
        const totalPrice = sacks * pricePerSack;
        
        // Add to feed inventory
        await feedInventory.addRecord({
          date: expenseDate,
          type: 'purchase',
          sacks,
          kgPerSack,
          brand: feedBrand || '',
          quantityKg: totalKg,
          pricePerKg: pricePerSack / kgPerSack,
          totalPrice,
          notes: notes || ''
        });
        
        // Create expense record
        await createMutation.mutateAsync({
          expense_date: expenseDate,
          category: 'Feed',
          description: feedBrand 
            ? `Feed purchase - ${feedBrand} (${sacks} sacks × ${kgPerSack}kg)`
            : `Feed purchase (${sacks} sacks × ${kgPerSack}kg)`,
          amount: totalPrice,
          payment_method: paymentMethod || undefined,
          notes: notes || undefined,
          weekly_supply_id: supplyId || undefined,
        });
      } else {
        // Regular expense
        await createMutation.mutateAsync({
          expense_date: expenseDate,
          category,
          description,
          amount: parseFloat(amount),
          payment_method: paymentMethod || undefined,
          notes: notes || undefined,
          weekly_supply_id: supplyId || undefined,
        });
      }
      handleClose();
    } catch (err) {
      console.error('Error saving expense:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const filteredExpenses = filterCategory
    ? expenses?.filter(e => e.category === filterCategory)
    : expenses;

  const totalExpenses = filteredExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  if (error) {
    return <Alert severity="error">Error loading expenses: {error.message}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          Expenses ({filteredExpenses?.length || 0}) — {formatCurrency(totalExpenses)}
        </Typography>
        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 180 } }}>
            <InputLabel>Filter by Supply</InputLabel>
            <Select value={filterSupply} label="Filter by Supply" onChange={(e) => setFilterSupply(e.target.value)}>
              <MenuItem value="">All Weeks</MenuItem>
              {supplies?.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {formatDate(s.week_start_date)} - {formatDate(s.week_end_date)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 140 } }}>
            <InputLabel>Filter Category</InputLabel>
            <Select value={filterCategory} label="Filter Category" onChange={(e) => setFilterCategory(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              {EXPENSE_CATEGORIES.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)} size={isMobile ? 'small' : 'medium'}>
            {isMobile ? 'Add' : 'Add Expense'}
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: '12px', overflowX: 'auto' }}>
        <Table size={isMobile ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Supply Week</TableCell>
              <TableCell>Category</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Method</TableCell>
              <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Notes</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}><Skeleton /></TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : filteredExpenses?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No expenses recorded yet.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses?.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{formatDate(expense.expense_date)}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {(expense as any).weekly_supply_id ? (
                      <Chip label={getSupplyLabel((expense as any).weekly_supply_id)} size="small" variant="outlined" />
                    ) : '-'}
                  </TableCell>
                  <TableCell><Chip label={expense.category} size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }} /></TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{expense.description}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{expense.payment_method || '-'}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' }, fontSize: { xs: '0.75rem', sm: '0.875rem' }, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{expense.notes || '-'}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleDelete(expense.id)} color="error">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{category === 'Feed' ? 'Record Feed Purchase' : 'Add Expense'}</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} fullWidth required slotProps={{ inputLabel: { shrink: true } }} />
            <FormControl fullWidth>
              <InputLabel>Supply Week</InputLabel>
              <Select value={supplyId} label="Supply Week" onChange={(e) => setSupplyId(e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {supplies?.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {formatDate(s.week_start_date)} - {formatDate(s.week_end_date)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                {EXPENSE_CATEGORIES.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
              </Select>
            </FormControl>
            
            {category === 'Feed' ? (
              <>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField 
                    label="Number of Sacks" 
                    type="number" 
                    value={feedSacks} 
                    onChange={(e) => setFeedSacks(e.target.value)} 
                    fullWidth 
                    required
                    inputProps={{ min: 0, step: 1 }}
                  />
                  <TextField 
                    label="Kg per Sack" 
                    type="number" 
                    value={feedKgPerSack} 
                    onChange={(e) => setFeedKgPerSack(e.target.value)} 
                    fullWidth 
                    defaultValue="50"
                    inputProps={{ min: 0, step: 0.1 }}
                  />
                </Box>
                <TextField 
                  label="Feed Brand (Optional)" 
                  value={feedBrand} 
                  onChange={(e) => setFeedBrand(e.target.value)} 
                  fullWidth 
                  placeholder="e.g., Kent, Unga, etc."
                />
                <TextField 
                  label="Price per Sack (KES)" 
                  type="number" 
                  value={feedPricePerSack} 
                  onChange={(e) => setFeedPricePerSack(e.target.value)} 
                  fullWidth 
                  required
                  inputProps={{ min: 0, step: 1 }}
                  helperText={`Total: KES ${((parseFloat(feedSacks) || 0) * (parseFloat(feedPricePerSack) || 0)).toLocaleString()}`}
                />
              </>
            ) : (
              <>
                <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth required />
                <TextField label="Amount (KES)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} fullWidth required inputProps={{ min: 0, step: 0.01 }} />
              </>
            )}
            
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select value={paymentMethod} label="Payment Method" onChange={(e) => setPaymentMethod(e.target.value)}>
                <MenuItem value="">Not Specified</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="M-Pesa">M-Pesa</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} variant="outlined">Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={
              (category === 'Feed' && (!feedSacks || !feedPricePerSack)) ||
              (category !== 'Feed' && (!description || !amount)) ||
              createMutation.isPending
            }
          >
            {category === 'Feed' ? 'Record Purchase' : 'Add Expense'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
