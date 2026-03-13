import { useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, IconButton, Skeleton, Alert, Chip,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { usePayments, useCreatePayment, useUpdatePayment, useDeletePayment } from '@/hooks/usePayments';
import { useCustomers } from '@/hooks/useCustomers';
import { useSales } from '@/hooks/useSales';
import { useSupplies } from '@/hooks/useSupplies';

export const PaymentsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [saleId, setSaleId] = useState('');
  const [supplyId, setSupplyId] = useState('');

  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterSupply, setFilterSupply] = useState('');

  const { data: payments, isLoading, error } = usePayments({
    customerId: filterCustomer || undefined,
    method: filterMethod || undefined,
    supplyId: filterSupply || undefined,
  });
  const { data: customers } = useCustomers();
  const { data: sales } = useSales();
  const { data: supplies } = useSupplies();
  const createMutation = useCreatePayment();
  const updateMutation = useUpdatePayment();
  const deleteMutation = useDeletePayment();

  // Filter sales by selected customer for linking
  const customerSales = sales?.filter(s => s.customer_id === customerId) || [];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(value);
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const totalReceived = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const handleClose = () => {
    setDialogOpen(false); setEditingPaymentId(null);
    setCustomerId(''); setPaymentDate(new Date().toISOString().split('T')[0]);
    setAmount(''); setPaymentMethod(''); setNotes('');
    setSaleId(''); setSupplyId('');
  };

  const handleEdit = (payment: any) => {
    setEditingPaymentId(payment.id);
    setCustomerId(payment.customer_id);
    setPaymentDate(payment.payment_date);
    setAmount(String(payment.amount));
    setPaymentMethod(payment.payment_method || '');
    setNotes(payment.notes || '');
    setSaleId(payment.sale_id || '');
    setSupplyId(payment.weekly_supply_id || '');
    setDialogOpen(true);
  };

  // When linking to a sale, auto-pick supply from that sale
  const handleSaleChange = (selectedSaleId: string) => {
    setSaleId(selectedSaleId);
    if (selectedSaleId) {
      const sale = sales?.find(s => s.id === selectedSaleId);
      if (sale?.weekly_supply_id) setSupplyId(sale.weekly_supply_id);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        customer_id: customerId,
        payment_date: paymentDate,
        amount: parseFloat(amount),
        payment_method: paymentMethod || undefined,
        notes: notes || undefined,
        sale_id: saleId || undefined,
        weekly_supply_id: supplyId || undefined,
      };
      if (editingPaymentId) {
        await updateMutation.mutateAsync({ id: editingPaymentId, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      handleClose();
    } catch (err) {
      console.error('Error saving payment:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment?')) await deleteMutation.mutateAsync(id);
  };

  if (error) return <Alert severity="error">Error loading payments: {error.message}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Payments ({payments?.length || 0})</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>Record Payment</Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, borderRadius: '12px', flex: 1, minWidth: 150 }}>
          <Typography variant="body2" color="text.secondary">Total Received</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>{formatCurrency(totalReceived)}</Typography>
        </Paper>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Customer</InputLabel>
          <Select value={filterCustomer} label="Customer" onChange={(e) => setFilterCustomer(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {customers?.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Method</InputLabel>
          <Select value={filterMethod} label="Method" onChange={(e) => setFilterMethod(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="M-Pesa">M-Pesa</MenuItem>
            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Supply</InputLabel>
          <Select value={filterSupply} label="Supply" onChange={(e) => setFilterSupply(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {supplies?.map(s => (
              <MenuItem key={s.id} value={s.id}>{formatDate(s.week_start_date)} - {formatDate(s.week_end_date)}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: '12px', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Supply</TableCell>
              <TableCell>Notes</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>{[...Array(8)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
              ))
            ) : payments?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No payments recorded yet.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              payments?.map((payment) => (
                <TableRow key={payment.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleEdit(payment)}>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {(payment.customer as { name: string } | undefined)?.name || 'Unknown'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{payment.payment_method ? <Chip label={payment.payment_method} size="small" /> : '-'}</TableCell>
                  <TableCell>{payment.weekly_supply_id ? <Chip label="Linked" size="small" color="info" /> : '-'}</TableCell>
                  <TableCell>{payment.notes || '-'}</TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => handleEdit(payment)}><Edit /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(payment.id)} color="error"><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingPaymentId ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Customer</InputLabel>
              <Select value={customerId} label="Customer" onChange={(e) => setCustomerId(e.target.value)}>
                {customers?.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Payment Date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} fullWidth required slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Amount (KES)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} fullWidth required inputProps={{ min: 0, step: 0.01 }} />
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select value={paymentMethod} label="Payment Method" onChange={(e) => setPaymentMethod(e.target.value)}>
                <MenuItem value="">Not Specified</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="M-Pesa">M-Pesa</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                <MenuItem value="Cheque">Cheque</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Link to Sale (optional)</InputLabel>
              <Select value={saleId} label="Link to Sale (optional)" onChange={(e) => handleSaleChange(e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {customerSales.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {formatDate(s.sale_date)} — {formatCurrency(s.total_amount || 0)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Link to Supply (optional)</InputLabel>
              <Select value={supplyId} label="Link to Supply (optional)" onChange={(e) => setSupplyId(e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {supplies?.map(s => (
                  <MenuItem key={s.id} value={s.id}>{formatDate(s.week_start_date)} - {formatDate(s.week_end_date)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} variant="outlined">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!customerId || !amount || createMutation.isPending || updateMutation.isPending}>
            {editingPaymentId ? 'Update Payment' : 'Record Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
