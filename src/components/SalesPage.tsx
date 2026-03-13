import { useState, useMemo } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Chip, IconButton,
  Skeleton, Alert, Divider,
} from '@mui/material';
import { Add, Delete, Edit, RemoveCircleOutline } from '@mui/icons-material';
import { useSales, useCreateSaleWithItems, useUpdateSale, useDeleteSale } from '@/hooks/useSales';
import { useCustomers } from '@/hooks/useCustomers';
import { useCurrentPrices } from '@/hooks/usePrices';
import { useSupplies } from '@/hooks/useSupplies';
import { useMostRecentSupply } from '@/hooks/useDashboard';
import { useSupplyRemainingTrays } from '@/hooks/useDashboard';
import { useToast } from '@/hooks/use-toast';
import { EggCategory } from '@/lib/types';

const categoryColors: Record<EggCategory, string> = {
  starter: '#22c55e', mid: '#f59e0b', normal: '#3b82f6',
};

interface SaleLineItem {
  category: EggCategory;
  quantity: string;
  pieces: string;
  pricePerTray: number;
}

export const SalesPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [supplyId, setSupplyId] = useState('');
  const [filterSupplyId, setFilterSupplyId] = useState('');
  const [lineItems, setLineItems] = useState<SaleLineItem[]>([
    { category: 'starter', quantity: '', pieces: '', pricePerTray: 0 }
  ]);

  const { data: sales, isLoading, error } = useSales(filterSupplyId || undefined);
  const { data: customers } = useCustomers();
  const { data: currentPrices } = useCurrentPrices();
  const { data: supplies } = useSupplies();
  const { data: mostRecentSupply } = useMostRecentSupply();
  const { data: supplyRemaining } = useSupplyRemainingTrays(supplyId || undefined);
  const createMutation = useCreateSaleWithItems();
  const updateMutation = useUpdateSale();
  const deleteMutation = useDeleteSale();

  // Calculate how many trays the current line items are using (to validate against remaining)
  const currentUsage = useMemo(() => {
    const usage: Record<EggCategory, number> = { starter: 0, mid: 0, normal: 0 };
    lineItems.forEach(item => {
      usage[item.category] += parseFloat(item.quantity) || 0;
    });
    return usage;
  }, [lineItems]);

  const getRemainingForCategory = (category: EggCategory): number | null => {
    if (!supplyId || !supplyRemaining) return null;
    return (supplyRemaining as any)[category] ?? null;
  };

  const isOverStock = (category: EggCategory): boolean => {
    const remaining = getRemainingForCategory(category);
    if (remaining === null) return false;
    // When editing, the remaining already excludes the current sale, so just check usage
    return currentUsage[category] > remaining;
  };

  const hasAnyOverStock = useMemo(() => {
    if (!supplyId || !supplyRemaining) return false;
    return (['starter', 'mid', 'normal'] as EggCategory[]).some(cat => isOverStock(cat));
  }, [supplyId, supplyRemaining, currentUsage]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(value);
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const getPrice = (category: EggCategory) => currentPrices?.[category]?.price_per_tray || 0;

  const handleClose = () => {
    setDialogOpen(false); setEditingSaleId(null);
    setCustomerId(''); setSaleDate(new Date().toISOString().split('T')[0]);
    setNotes(''); setSupplyId('');
    setLineItems([{ category: 'starter', quantity: '', pieces: '', pricePerTray: 0 }]);
  };

  const updateLineItem = (index: number, field: keyof SaleLineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'category') newItems[index].pricePerTray = getPrice(value);
    setLineItems(newItems);
  };

  const addLineItem = () => {
    const available: EggCategory[] = ['starter', 'mid', 'normal'];
    const used = lineItems.map(li => li.category);
    const next = available.find(c => !used.includes(c)) || 'starter';
    setLineItems([...lineItems, { category: next, quantity: '', pieces: '', pricePerTray: getPrice(next) }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const getLineItemTotal = (item: SaleLineItem) => {
    const qty = parseFloat(item.quantity) || 0;
    const pcs = parseFloat(item.pieces) || 0;
    const price = item.pricePerTray || getPrice(item.category);
    return (qty * price) + (pcs * (price / 30));
  };

  const getGrandTotal = () => lineItems.reduce((sum, item) => sum + getLineItemTotal(item), 0);

  const handleOpenNew = () => {
    setEditingSaleId(null);
    setCustomerId('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    // Auto-select most recent supply for new sales (fallback to first supply in list)
    const defaultSupplyId = mostRecentSupply?.id || (supplies && supplies.length > 0 ? supplies[0].id : '');
    setSupplyId(defaultSupplyId);
    setLineItems([{ category: 'starter', quantity: '', pieces: '', pricePerTray: getPrice('starter') }]);
    setDialogOpen(true);
  };

  const handleEdit = (sale: any) => {
    setEditingSaleId(sale.id);
    setCustomerId(sale.customer_id);
    setSaleDate(sale.sale_date);
    setNotes(sale.notes || '');
    setSupplyId(sale.weekly_supply_id || '');
    if (sale.sale_items && sale.sale_items.length > 0) {
      setLineItems(sale.sale_items.map((item: any) => ({
        category: item.category as EggCategory,
        quantity: String(item.quantity_trays || 0),
        pieces: String(item.quantity_pieces || 0),
        pricePerTray: Number(item.price_per_tray),
      })));
    } else {
      setLineItems([{
        category: (sale.category || 'normal') as EggCategory,
        quantity: String(sale.quantity_trays || 0),
        pieces: '0',
        pricePerTray: Number(sale.price_per_tray || getPrice(sale.category || 'normal')),
      }]);
    }
    setDialogOpen(true);
  };

  const { toast } = useToast();

  const handleSubmit = async () => {
    const validItems = lineItems.filter(item => (parseFloat(item.quantity) > 0) || (parseFloat(item.pieces) > 0));
    if (validItems.length === 0) { 
      toast({ title: 'Error', description: 'Please add at least one item with quantity', variant: 'destructive' });
      return; 
    }
    // Prevent overselling
    if (hasAnyOverStock) {
      toast({ title: 'Error', description: 'Cannot save: Selected quantity exceeds available stock', variant: 'destructive' });
      return;
    }
    const items = validItems.map(item => ({
      category: item.category,
      quantity_trays: parseInt(item.quantity) || 0,
      quantity_pieces: parseInt(item.pieces) || 0,
      price_per_tray: Number(item.pricePerTray) || Number(getPrice(item.category)),
    }));

    try {
      if (editingSaleId) {
        await updateMutation.mutateAsync({
          id: editingSaleId,
          customer_id: customerId,
          sale_date: saleDate,
          notes: notes || undefined,
          weekly_supply_id: supplyId || null,
          items,
        });
        toast({ title: 'Success', description: 'Sale updated successfully' });
      } else {
        await createMutation.mutateAsync({
          customer_id: customerId,
          sale_date: saleDate,
          notes: notes || undefined,
          weekly_supply_id: supplyId || undefined,
          items,
        });
        toast({ title: 'Success', description: 'Sale recorded successfully' });
      }
      handleClose();
    } catch (err: any) {
      console.error('Error saving sale:', err);
      toast({ 
        title: 'Error', 
        description: err?.message || 'Failed to save sale. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this sale?')) await deleteMutation.mutateAsync(id);
  };

  if (error) return <Alert severity="error">Error loading sales: {error.message}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>Sales ({sales?.length || 0})</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter</InputLabel>
            <Select value={filterSupplyId} label="Filter" onChange={(e) => setFilterSupplyId(e.target.value)}>
              <MenuItem value="">All Sales</MenuItem>
              {supplies?.map(s => (
                <MenuItem key={s.id} value={s.id}>{formatDate(s.week_start_date)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenNew} sx={{ whiteSpace: 'nowrap' }}>Record Sale</Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: '12px', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Items</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Supply</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>{[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
              ))
            ) : sales?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No sales recorded yet.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              sales?.map((sale) => (
                <TableRow key={sale.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleEdit(sale)}>
                  <TableCell>{formatDate(sale.sale_date)}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {(sale.customer as { name: string } | undefined)?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {sale.sale_items && sale.sale_items.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {sale.sale_items.map((item: any, idx: number) => (
                          <Chip key={idx} size="small"
                            label={`${item.category}: ${item.quantity_trays}T${item.quantity_pieces > 0 ? ` + ${item.quantity_pieces}pcs` : ''}`}
                            sx={{ backgroundColor: categoryColors[item.category as EggCategory], color: 'white', textTransform: 'capitalize' }}
                          />
                        ))}
                      </Box>
                    ) : sale.category ? (
                      <Chip label={`${sale.category}: ${sale.quantity_trays}`} size="small"
                        sx={{ backgroundColor: categoryColors[sale.category as EggCategory], color: 'white', textTransform: 'capitalize' }}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(sale.total_amount || 0)}</TableCell>
                  <TableCell>
                    {sale.weekly_supply_id ? <Chip label="Linked" size="small" color="info" /> : '-'}
                  </TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => handleEdit(sale)}><Edit /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(sale.id)} color="error"><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editingSaleId ? 'Edit Sale' : 'Record Sale'}</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Customer</InputLabel>
              <Select value={customerId} label="Customer" onChange={(e) => setCustomerId(e.target.value)}>
                {customers?.filter(c => c.status === 'active').map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Sale Date" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} fullWidth required slotProps={{ inputLabel: { shrink: true } }} />
            <FormControl fullWidth>
              <InputLabel>Link to Supply (optional)</InputLabel>
              <Select value={supplyId} label="Link to Supply (optional)" onChange={(e) => setSupplyId(e.target.value)}>
                <MenuItem value="">None</MenuItem>
                {supplies?.map(s => (
                  <MenuItem key={s.id} value={s.id}>{formatDate(s.week_start_date)} - {formatDate(s.week_end_date)} ({s.total_trays} trays)</MenuItem>
                ))}
              </Select>
            </FormControl>
            {supplyId && supplyRemaining && (
              <Paper sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: '8px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>Stock Remaining</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {(['starter', 'mid', 'normal'] as EggCategory[]).map(cat => {
                    const remaining = (supplyRemaining as any)[cat] ?? 0;
                    const used = currentUsage[cat];
                    const over = used > remaining;
                    return (
                      <Chip key={cat} size="small"
                        label={`${cat}: ${used}/${remaining}`}
                        sx={{ 
                          textTransform: 'capitalize',
                          backgroundColor: over ? '#ef4444' : categoryColors[cat],
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    );
                  })}
                </Box>
                {hasAnyOverStock && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                    ⚠️ Warning: Exceeds available stock!
                  </Typography>
                )}
              </Paper>
            )}
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Sale Items</Typography>
            {lineItems.map((item, index) => {
              const remaining = getRemainingForCategory(item.category);
              const over = isOverStock(item.category);
              return (
              <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 100 }}>
                  <InputLabel>Category</InputLabel>
                  <Select value={item.category} label="Category" size="small"
                    onChange={(e) => updateLineItem(index, 'category', e.target.value)}>
                    <MenuItem value="starter">Starter</MenuItem>
                    <MenuItem value="mid">Mid</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Trays" type="number" value={item.quantity} size="small" sx={{ width: 80 }}
                  error={over}
                  helperText={over ? `Max ${remaining}` : ''}
                  onChange={(e) => updateLineItem(index, 'quantity', e.target.value)} inputProps={{ min: 0 }} />
                <TextField label="Pieces" type="number" value={item.pieces} size="small" sx={{ width: 80 }}
                  onChange={(e) => updateLineItem(index, 'pieces', e.target.value)} inputProps={{ min: 0 }} />
                <Typography sx={{ minWidth: 70, textAlign: 'right', fontSize: 12 }}>@ {formatCurrency(item.pricePerTray || getPrice(item.category))}/T</Typography>
                <Typography sx={{ minWidth: 90, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(getLineItemTotal(item))}</Typography>
                {lineItems.length > 1 && (
                  <IconButton size="small" onClick={() => removeLineItem(index)} color="error"><RemoveCircleOutline /></IconButton>
                )}
              </Box>
              );
            })}
            {lineItems.length < 3 && (
              <Button variant="outlined" size="small" startIcon={<Add />} onClick={addLineItem} sx={{ alignSelf: 'flex-start' }}>Add Category</Button>
            )}
            {hasAnyOverStock && (
              <Alert severity="error" sx={{ mt: 1 }}>Cannot sell more than available stock for the linked supply.</Alert>
            )}
            <Paper sx={{ p: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(getGrandTotal())}</Typography>
              </Box>
            </Paper>
            <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} variant="outlined">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained"
            disabled={!customerId || lineItems.every(i => !i.quantity && !i.pieces) || hasAnyOverStock || createMutation.isPending || updateMutation.isPending}>
            {editingSaleId ? 'Update Sale' : 'Record Sale'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
