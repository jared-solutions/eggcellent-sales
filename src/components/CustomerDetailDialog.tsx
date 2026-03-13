import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, Chip, Skeleton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
} from '@mui/material';
import { useCustomerSales } from '@/hooks/useSales';
import { useCustomerPayments } from '@/hooks/usePayments';
import { useSupplies } from '@/hooks/useSupplies';
import { CustomerWithBalance, EggCategory } from '@/lib/types';

const categoryColors: Record<string, string> = {
  starter: '#22c55e', mid: '#f59e0b', normal: '#3b82f6',
};

interface Props {
  customer: CustomerWithBalance | null;
  open: boolean;
  onClose: () => void;
}

export const CustomerDetailDialog = ({ customer, open, onClose }: Props) => {
  const [tab, setTab] = useState(0);
  const [filterSupply, setFilterSupply] = useState('');
  
  const { data: sales, isLoading: salesLoading } = useCustomerSales(customer?.id, filterSupply || undefined);
  const { data: payments, isLoading: paymentsLoading } = useCustomerPayments(customer?.id);
  const { data: supplies } = useSupplies();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(value);
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (!customer) return null;

  // Group sales by supply
  const salesBySupply: Record<string, { supplyLabel: string; totalTrays: number; totalAmount: number }> = {};
  sales?.forEach(s => {
    const key = s.weekly_supply_id || 'unlinked';
    if (!salesBySupply[key]) {
      const supply = supplies?.find(sup => sup.id === s.weekly_supply_id);
      salesBySupply[key] = {
        supplyLabel: supply ? `${formatDate(supply.week_start_date)} - ${formatDate(supply.week_end_date)}` : 'Unlinked',
        totalTrays: 0,
        totalAmount: 0,
      };
    }
    salesBySupply[key].totalTrays += Number(s.quantity_trays || 0);
    salesBySupply[key].totalAmount += Number(s.total_amount || 0);
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {customer.name}
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Chip label={`Balance: ${formatCurrency(customer.balance)}`} color={customer.balance > 0 ? 'error' : 'success'} size="small" />
          <Chip label={`Total Sales: ${formatCurrency(customer.total_sales)}`} size="small" />
          <Chip label={`Total Paid: ${formatCurrency(customer.total_payments)}`} size="small" />
          <Chip label={`Trays: ${customer.total_trays}`} size="small" />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Sales History" />
          <Tab label="Payment History" />
          <Tab label="Supply Summary" />
        </Tabs>

        {tab === 0 && (
          <Box>
            <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
              <InputLabel>Filter by Supply</InputLabel>
              <Select value={filterSupply} label="Filter by Supply" onChange={(e) => setFilterSupply(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {supplies?.map(s => (
                  <MenuItem key={s.id} value={s.id}>{formatDate(s.week_start_date)} - {formatDate(s.week_end_date)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Supply</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesLoading ? (
                    [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(4)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>)
                  ) : sales?.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center"><Typography variant="body2" color="text.secondary">No sales found</Typography></TableCell></TableRow>
                  ) : sales?.map(sale => (
                    <TableRow key={sale.id}>
                      <TableCell>{formatDate(sale.sale_date)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {sale.sale_items && sale.sale_items.length > 0 ? sale.sale_items.map((item: any, idx: number) => (
                            <Chip key={idx} size="small"
                              label={`${item.category}: ${item.quantity_trays}T${item.quantity_pieces > 0 ? `+${item.quantity_pieces}pcs` : ''}`}
                              sx={{ backgroundColor: categoryColors[item.category] || '#94a3b8', color: 'white', textTransform: 'capitalize', fontSize: 11 }}
                            />
                          )) : sale.category ? (
                            <Chip size="small" label={`${sale.category}: ${sale.quantity_trays}T`}
                              sx={{ backgroundColor: categoryColors[sale.category] || '#94a3b8', color: 'white', textTransform: 'capitalize', fontSize: 11 }} />
                          ) : '-'}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(sale.total_amount || 0)}</TableCell>
                      <TableCell>{sale.weekly_supply_id ? <Chip label="Linked" size="small" color="info" /> : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {tab === 1 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentsLoading ? (
                  [...Array(3)].map((_, i) => <TableRow key={i}>{[...Array(4)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>)
                ) : payments?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center"><Typography variant="body2" color="text.secondary">No payments found</Typography></TableCell></TableRow>
                ) : payments?.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.payment_date)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>{formatCurrency(p.amount)}</TableCell>
                    <TableCell>{p.payment_method ? <Chip label={p.payment_method} size="small" /> : '-'}</TableCell>
                    <TableCell>{p.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === 2 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Supply Week</TableCell>
                  <TableCell align="right">Trays Taken</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.keys(salesBySupply).length === 0 ? (
                  <TableRow><TableCell colSpan={3} align="center"><Typography variant="body2" color="text.secondary">No supply data</Typography></TableCell></TableRow>
                ) : Object.entries(salesBySupply).map(([key, data]) => (
                  <TableRow key={key}>
                    <TableCell>{data.supplyLabel}</TableCell>
                    <TableCell align="right">{data.totalTrays}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(data.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
};
