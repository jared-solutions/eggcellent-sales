import { useState } from 'react';
import {
  Box, Paper, Card, CardContent, CardActions, Button, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip,
  IconButton, Skeleton, Alert, Tooltip, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { Add, Edit, PersonOff, PersonAdd, Payment, ShoppingCart, Visibility } from '@mui/icons-material';
import { useCustomersWithBalance, useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import { useCreatePayment } from '@/hooks/usePayments';
import { useCreateSaleWithItems } from '@/hooks/useSales';
import { useCurrentPrices } from '@/hooks/usePrices';
import { useSupplies } from '@/hooks/useSupplies';
import { useSupplyRemainingTrays } from '@/hooks/useDashboard';
import { CustomerDetailDialog } from '@/components/CustomerDetailDialog';
import { CustomerWithBalance, EggCategory } from '@/lib/types';

export const CustomersPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithBalance | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithBalance | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [depositedAmount, setDepositedAmount] = useState('');
  const [paymentSupplyId, setPaymentSupplyId] = useState('');

  const [saleCategory, setSaleCategory] = useState<EggCategory>('normal');
  const [saleQuantity, setSaleQuantity] = useState('');
  const [salePieces, setSalePieces] = useState('');
  const [saleSupplyId, setSaleSupplyId] = useState('');
  const [selectedSupplyForView, setSelectedSupplyForView] = useState('');

  const { data: customers, isLoading, error } = useCustomersWithBalance();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const createPaymentMutation = useCreatePayment();
  const createSaleMutation = useCreateSaleWithItems();
  const { data: currentPrices } = useCurrentPrices();
  const { data: supplies } = useSupplies();
  const { data: remainingTrays } = useSupplyRemainingTrays(selectedSupplyForView || undefined);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(value);

  const handleOpen = (customer?: CustomerWithBalance) => {
    if (customer) {
      setEditingCustomer(customer); setName(customer.name); setPhone(customer.phone || '');
    } else {
      setEditingCustomer(null); setName(''); setPhone('');
    }
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setEditingCustomer(null); setName(''); setPhone(''); };

  const handleSubmit = async () => {
    try {
      if (editingCustomer) {
        await updateMutation.mutateAsync({ id: editingCustomer.id, name, phone: phone || null });
      } else {
        await createMutation.mutateAsync({ name, phone: phone || undefined });
      }
      handleClose();
    } catch (err) { console.error('Error saving customer:', err); }
  };

  const handleToggleStatus = async (customer: CustomerWithBalance) => {
    await updateMutation.mutateAsync({ id: customer.id, status: customer.status === 'active' ? 'inactive' : 'active' });
  };

  const openPaymentDialog = (customer: CustomerWithBalance) => {
    setSelectedCustomer(customer);
    setPaymentAmount(''); setPaymentMethod(''); setPaymentNotes(''); setDepositedAmount(''); setPaymentSupplyId('');
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedCustomer) return;
    try {
      await createPaymentMutation.mutateAsync({
        customer_id: selectedCustomer.id,
        payment_date: new Date().toISOString().split('T')[0],
        amount: parseFloat(paymentAmount),
        deposited_amount: parseFloat(depositedAmount) || 0,
        payment_method: paymentMethod || undefined,
        notes: paymentNotes || undefined,
        weekly_supply_id: paymentSupplyId || undefined,
      });
      setPaymentDialogOpen(false);
    } catch (err) { console.error('Error recording payment:', err); }
  };

  const openSaleDialog = (customer: CustomerWithBalance) => {
    setSelectedCustomer(customer);
    setSaleCategory('normal'); setSaleQuantity(''); setSalePieces(''); setSaleSupplyId('');
    setSaleDialogOpen(true);
  };

  const handleSaleSubmit = async () => {
    if (!selectedCustomer) return;
    const price = currentPrices?.[saleCategory]?.price_per_tray || 0;
    try {
      await createSaleMutation.mutateAsync({
        customer_id: selectedCustomer.id,
        sale_date: new Date().toISOString().split('T')[0],
        weekly_supply_id: saleSupplyId || undefined,
        items: [{ category: saleCategory, quantity_trays: parseInt(saleQuantity) || 0, quantity_pieces: parseInt(salePieces) || 0, price_per_tray: price }],
      });
      setSaleDialogOpen(false);
    } catch (err) { console.error('Error recording sale:', err); }
  };

  const openDetailDialog = (customer: CustomerWithBalance) => {
    setSelectedCustomer(customer);
    setDetailDialogOpen(true);
  };

  if (error) return <Alert severity="error">Error loading customers: {error.message}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Customers ({customers?.length || 0})</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>View Supply Remaining</InputLabel>
            <Select value={selectedSupplyForView} label="View Supply Remaining" onChange={(e) => setSelectedSupplyForView(e.target.value)}>
              <MenuItem value="">None</MenuItem>
              {supplies?.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {new Date(s.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(s.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>Add Customer</Button>
        </Box>
      </Box>

      {selectedSupplyForView && remainingTrays && (
        <Paper sx={{ p: 2, mb: 3, borderRadius: '12px', display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Remaining Trays:</Typography>
          <Chip label={`Starter: ${remainingTrays.starter}`} size="small" sx={{ backgroundColor: '#22c55e', color: 'white' }} />
          <Chip label={`Mid: ${remainingTrays.mid}`} size="small" sx={{ backgroundColor: '#f59e0b', color: 'white' }} />
          <Chip label={`Normal: ${remainingTrays.normal}`} size="small" sx={{ backgroundColor: '#3b82f6', color: 'white' }} />
          <Chip label={`Total: ${remainingTrays.total}`} size="small" />
        </Paper>
      )}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' } }}>
        {isLoading ? (
          [...Array(8)].map((_, i) => (
            <Card key={i} sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <CardContent><Skeleton variant="text" width="60%" height={28} /><Skeleton variant="text" width="40%" /></CardContent>
            </Card>
          ))
        ) : customers?.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: '12px', gridColumn: '1 / -1' }}>
            <Typography color="text.secondary">No customers yet. Add your first customer.</Typography>
          </Paper>
        ) : (
          customers?.map((customer) => (
            <Card key={customer.id} sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
              onClick={() => openDetailDialog(customer)}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Tooltip title={customer.name} placement="top" arrow>
                    <Typography variant="h6" sx={{ fontWeight: 700, maxWidth: 160 }} noWrap>{customer.name}</Typography>
                  </Tooltip>
                  <Chip label={customer.status} size="small" sx={{ backgroundColor: customer.status === 'active' ? '#22c55e' : '#ef4444', color: 'white' }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">Total Trays</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{customer.total_trays}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">Total Sales</Typography>
                  <Typography variant="subtitle1">{formatCurrency(customer.total_sales)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">Balance</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: customer.balance > 0 ? 'error.main' : 'success.main' }}>
                    {formatCurrency(customer.balance)}
                  </Typography>
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                <Tooltip title="View Details"><IconButton size="small" onClick={() => openDetailDialog(customer)}><Visibility /></IconButton></Tooltip>
                <Tooltip title="Quick Sale"><IconButton size="small" color="primary" onClick={() => openSaleDialog(customer)}><ShoppingCart /></IconButton></Tooltip>
                <Tooltip title="Quick Payment"><IconButton size="small" color="success" onClick={() => openPaymentDialog(customer)}><Payment /></IconButton></Tooltip>
                <IconButton size="small" onClick={() => handleOpen(customer)}><Edit /></IconButton>
                <IconButton size="small" onClick={() => handleToggleStatus(customer)}>
                  {customer.status === 'active' ? <PersonOff /> : <PersonAdd />}
                </IconButton>
              </CardActions>
            </Card>
          ))
        )}
      </Box>

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog customer={selectedCustomer} open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} />

      {/* Edit/Add Customer Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Customer Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} variant="outlined">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!name || createMutation.isPending || updateMutation.isPending}>
            {editingCustomer ? 'Update' : 'Add Customer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Quick Payment — {selectedCustomer?.name}</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Amount (KES)" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} fullWidth required inputProps={{ min: 0 }} />
            <TextField label="Deposited Amount (KES)" type="number" value={depositedAmount} onChange={(e) => setDepositedAmount(e.target.value)} fullWidth inputProps={{ min: 0 }}
              helperText="Money shared out for feed purchase and profit distribution" />
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select value={paymentMethod} label="Payment Method" onChange={(e) => setPaymentMethod(e.target.value)}>
                <MenuItem value="">Not Specified</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="M-Pesa">M-Pesa</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Link to Supply</InputLabel>
              <Select value={paymentSupplyId} label="Link to Supply" onChange={(e) => setPaymentSupplyId(e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {supplies?.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {new Date(s.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(s.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Notes" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPaymentDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handlePaymentSubmit} variant="contained" disabled={!paymentAmount || createPaymentMutation.isPending}>Record Payment</Button>
        </DialogActions>
      </Dialog>

      {/* Quick Sale Dialog */}
      <Dialog open={saleDialogOpen} onClose={() => setSaleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Quick Sale — {selectedCustomer?.name}</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={saleCategory} label="Category" onChange={(e) => setSaleCategory(e.target.value as EggCategory)}>
                <MenuItem value="starter">Starter</MenuItem>
                <MenuItem value="mid">Mid</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Trays" type="number" value={saleQuantity} onChange={(e) => setSaleQuantity(e.target.value)} fullWidth inputProps={{ min: 0 }} />
              <TextField label="Pieces" type="number" value={salePieces} onChange={(e) => setSalePieces(e.target.value)} fullWidth inputProps={{ min: 0 }} />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Link to Supply</InputLabel>
              <Select value={saleSupplyId} label="Link to Supply" onChange={(e) => setSaleSupplyId(e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {supplies?.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {new Date(s.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(s.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary">
              Price: {formatCurrency(currentPrices?.[saleCategory]?.price_per_tray || 0)} per tray
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSaleDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleSaleSubmit} variant="contained" disabled={(!saleQuantity && !salePieces) || createSaleMutation.isPending}>Record Sale</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
