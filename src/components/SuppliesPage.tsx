import { useState } from 'react';
import {
  Box, Paper, Card, CardContent, CardActions, Button, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Skeleton, Alert, Tooltip, LinearProgress,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useSupplies, useCreateSupply } from '@/hooks/useSupplies';
import { useQuery } from '@tanstack/react-query';
import djangoApi from '@/integrations/django/client';
import { useCompany } from '@/hooks/useCompany';

const useSoldTraysBySupply = () => {
  const { currentCompany } = useCompany();
  return useQuery({
    queryKey: ['sold-trays-by-supply', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return {};
      
      // Use Django API to fetch sales with items
      const sales = await djangoApi.sales.list(currentCompany.id);
      
      const result: Record<string, { starter: number; mid: number; normal: number; total: number }> = {};
      for (const sale of (sales || [])) {
        const supplyId = (sale as any).weekly_supply_id;
        if (!supplyId) continue;
        if (!result[supplyId]) result[supplyId] = { starter: 0, mid: 0, normal: 0, total: 0 };
        
        const items = (sale as any).sale_items || [];
        for (const item of items) {
          const qty = item.quantity_trays || 0;
          if (item.category === 'starter') result[supplyId].starter += qty;
          else if (item.category === 'mid') result[supplyId].mid += qty;
          else if (item.category === 'normal') result[supplyId].normal += qty;
          result[supplyId].total += qty;
        }
      }
      return result;
    },
    enabled: !!currentCompany,
  });
};

export const SuppliesPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [starterTrays, setStarterTrays] = useState('');
  const [midTrays, setMidTrays] = useState('');
  const [normalTrays, setNormalTrays] = useState('');
  const [notes, setNotes] = useState('');

  const { data: supplies, isLoading, error } = useSupplies();
  const { data: soldMap } = useSoldTraysBySupply();
  const createMutation = useCreateSupply();

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const handleClose = () => {
    setDialogOpen(false);
    setWeekStart(''); setWeekEnd(''); setStarterTrays(''); setMidTrays(''); setNormalTrays(''); setNotes('');
  };

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync({
        week_start_date: weekStart,
        week_end_date: weekEnd,
        starter_trays: parseInt(starterTrays) || 0,
        mid_trays: parseInt(midTrays) || 0,
        normal_trays: parseInt(normalTrays) || 0,
        notes: notes || null,
      });
      handleClose();
    } catch (err) {
      console.error('Error saving supply:', err);
    }
  };

  if (error) {
    return <Alert severity="error" sx={{ border: '2px solid' }}>Error loading supplies: {error.message}</Alert>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Weekly Supplies</Typography>
        <Button
          variant="contained"
          startIcon={<Add sx={{ color: '#1976d2' }} />}
          onClick={() => setDialogOpen(true)}
          sx={{
            backgroundColor: '#ffffff', color: '#1976d2', border: '2px solid #1976d2',
            borderRadius: '10px', boxShadow: 'none',
            '&:hover': { backgroundColor: '#e3f2fd', boxShadow: 'none' },
          }}
        >
          Add Supply
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' } }}>
        {isLoading ? (
          [...Array(8)].map((_, i) => (
            <Card key={i} sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid', borderColor: 'divider', minHeight: 120 }}>
              <CardContent><Skeleton variant="text" width="60%" height={24} /><Skeleton variant="text" width="40%" /></CardContent>
            </Card>
          ))
        ) : supplies?.length === 0 ? (
          <Paper key="empty" sx={{ p: 6, textAlign: 'center', borderRadius: '12px', border: 'none', gridColumn: '1 / -1' }}>
            <Typography color="text.secondary">No supplies recorded yet. Add your first weekly supply.</Typography>
          </Paper>
        ) : (
          supplies?.map((supply) => {
            const sold = soldMap?.[supply.id] || { starter: 0, mid: 0, normal: 0, total: 0 };
            const totalTrays = supply.total_trays || 0;
            const soldPercent = totalTrays > 0 ? Math.min((sold.total / totalTrays) * 100, 100) : 0;

            return (
              <Card key={supply.id} sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                <CardContent>
                  <Tooltip title={`${formatDate(supply.week_start_date)} - ${formatDate(supply.week_end_date)}`} arrow>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                      {formatDate(supply.week_start_date)} - {formatDate(supply.week_end_date)}
                    </Typography>
                  </Tooltip>

                  {/* Category rows: Supply / Sold */}
                  {(['starter', 'mid', 'normal'] as const).map(cat => {
                    const total = supply[`${cat}_trays` as keyof typeof supply] as number;
                    const soldCat = sold[cat];
                    return (
                      <Box key={cat} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{cat}</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          {soldCat}/{total}
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>sold</Typography>
                        </Typography>
                      </Box>
                    );
                  })}

                  {/* Total with progress */}
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Total Sold</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{sold.total}/{totalTrays}</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={soldPercent} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>

                  {supply.notes && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">Notes</Typography>
                      <Typography variant="body2">{supply.notes}</Typography>
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }} />
              </Card>
            );
          })
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth
        PaperProps={{ sx: { boxShadow: 'none', borderRadius: '12px', border: '2px solid', borderColor: 'divider' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'blue' }}>Add Weekly Supply</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Week Start" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} fullWidth required slotProps={{ inputLabel: { shrink: true } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
              <TextField label="Week End" type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} fullWidth required slotProps={{ inputLabel: { shrink: true } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Starter Trays" type="number" value={starterTrays} onChange={(e) => setStarterTrays(e.target.value)} fullWidth inputProps={{ min: 0 }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
              <TextField label="Mid Trays" type="number" value={midTrays} onChange={(e) => setMidTrays(e.target.value)} fullWidth inputProps={{ min: 0 }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
              <TextField label="Normal Trays" type="number" value={normalTrays} onChange={(e) => setNormalTrays(e.target.value)} fullWidth inputProps={{ min: 0 }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
            </Box>
            <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: '12px', boxShadow: 'none' }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!weekStart || !weekEnd || createMutation.isPending} sx={{ borderRadius: '12px', boxShadow: 'none' }}>Add Supply</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
