import { useState, useMemo, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Select, MenuItem, FormControl, InputLabel, Skeleton, Tabs, Tab, Button, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText
} from '@mui/material';
import {
  TrendingUp, AccountBalance, MoneyOff, Payments, Inventory, Receipt, Savings, AccountBalanceWallet, Egg, Delete, CompareArrows, TrendingDown, Analytics, ShowChart, Restaurant
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { useDashboardStats, useRevenueByCategory, useTopCustomersByBalance, usePaymentsByMethod, useMostRecentSupply, useProfitStats, useFeedStats } from '@/hooks/useDashboard';
import { useSupplies } from '@/hooks/useSupplies';
import { useCollections } from '@/hooks/useCollections';
import { useFlockSettings } from '@/hooks/useFlockSettings';
import { useSales } from '@/hooks/useSales';
import { useExpenses } from '@/hooks/useExpenses';
import { useCustomers } from '@/hooks/useCustomers';
import { useDeposits } from '@/hooks/useDeposits';

const CATEGORY_COLORS: Record<string, string> = { normal: '#1976d2', starter: '#2e7d32', mid: '#fbc02d' };
const FALLBACK_COLOR = '#90a4ae';
const PAYMENT_METHOD_COLORS: Record<string, string> = { 'Cash': '#22c55e', 'M-Pesa': '#3b82f6', 'Bank Transfer': '#8b5cf6', 'Cheque': '#f59e0b', 'Unknown': '#94a3b8' };

interface StatCardProps { title: string; value: string; icon: React.ReactNode; loading?: boolean; valueColor?: string; subtitle?: string; subtitle2?: string; subtitleColor?: string; onClick?: () => void; clickable?: boolean; }

const StatCard = ({ title, value, icon, loading, valueColor, subtitle, subtitle2, subtitleColor, onClick, clickable }: StatCardProps) => (
  <Paper 
    sx={{ 
      p: { xs: 2, sm: 3 }, 
      height: '100%', 
      borderRadius: '12px',
      cursor: clickable ? 'pointer' : 'default',
      transition: clickable ? 'box-shadow 0.2s, transform 0.2s' : 'none',
      '&:hover': clickable ? { boxShadow: 3, transform: 'translateY(-2px)' } : {}
    }}
    onClick={onClick}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>{title}</Typography>
        {loading ? <Skeleton variant="text" width={80} height={32} /> : (
          <Typography variant="h5" sx={{ fontWeight: 700, color: valueColor, fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' } }}>{value}</Typography>
        )}
        {subtitle && !loading && (
          <Typography variant="caption" sx={{ color: subtitleColor || 'text.secondary', fontWeight: 500, display: 'block', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
        {subtitle2 && !loading && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            {subtitle2}
          </Typography>
        )}
      </Box>
      <Box sx={{ width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 }, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</Box>
    </Box>
  </Paper>
);

export const DashboardPage = () => {
  const [period, setPeriod] = useState('supply');
  const [selectedSupplyId, setSelectedSupplyId] = useState('');
  const [dashTab, setDashTab] = useState(0);
  const [profitPeriod, setProfitPeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(false);
  const { data: mostRecentSupply } = useMostRecentSupply();
  const { data: supplies } = useSupplies();
  const { data: feedStats } = useFeedStats();
  const { data: collections } = useCollections();

  // Use the flock settings hook for reactivity
  const flockSettingsHook = useFlockSettings();
  const flockSettings = flockSettingsHook.settings;
  const isFeedAbnormal = flockSettingsHook.isFeedAbnormal;
  const feedWarning = flockSettingsHook.getFeedWarning();

  // Helper to parse egg data from notes (same as CollectionsPage)
  const parseEggDataFromNotes = (notes: string | null): { eggData: Record<string, number>, shadeEggs: number } => {
    const eggData: Record<string, number> = {};
    let shadeEggs = 0;
    
    if (!notes) return { eggData, shadeEggs };
    
    // Try to parse JSON from notes (new format)
    try {
      if (notes.startsWith('{')) {
        const parsed = JSON.parse(notes);
        return { eggData: parsed.eggData || {}, shadeEggs: parsed.shadeEggs || 0 };
      }
    } catch (e) {
      // Not JSON, try old format
    }
    
    // Old format: "Cage: X, Shade: Y"
    const cageMatch = notes.match(/Cage:\s*(\d+)/);
    const shadeMatch = notes.match(/Shade:\s*(\d+)/);
    
    if (cageMatch) {
      const totalCageEggs = parseInt(cageMatch[1], 10);
      for (let i = 0; i < totalCageEggs; i++) {
        eggData[`1-0-${Math.floor(i/8)}-${i%8}`] = 1;
      }
    }
    
    if (shadeMatch) {
      shadeEggs = parseInt(shadeMatch[1], 10);
    }
    
    return { eggData, shadeEggs };
  };

  // Calculate today's collection and laying percentage
  const layingPercentage = useMemo(() => {
    if (!collections || collections.length === 0 || flockSettings.totalChickens === 0) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const todayCollection = collections.find(c => c.collection_date === today);
    
    if (!todayCollection) return null;
    
    // Parse egg_data from notes (same method as CollectionsPage)
    const parsedEggData = parseEggDataFromNotes(todayCollection.notes);
    const totalEggs = Object.values(parsedEggData.eggData).reduce((a: number, b: number) => a + b, 0) + parsedEggData.shadeEggs;
    
    const percentage = (totalEggs / flockSettings.totalChickens) * 100;
    
    return {
      eggs: totalEggs,
      percentage: percentage.toFixed(1),
      chickens: flockSettings.totalChickens
    };
  }, [collections, flockSettings]);

  const getDateRange = (): { start: string; end: string; supplyId?: string } => {
    const now = new Date();
    // If a specific supply is selected
    if (period === 'supply-select' && selectedSupplyId) {
      const supply = supplies?.find(s => s.id === selectedSupplyId);
      if (supply) return { start: supply.week_start_date, end: supply.week_end_date, supplyId: selectedSupplyId };
    }
    if (period === 'supply' && mostRecentSupply) {
      return { start: mostRecentSupply.week_start_date, end: mostRecentSupply.week_end_date, supplyId: mostRecentSupply.id };
    }
    let start: Date;
    switch (period) {
      case 'week': start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7); break;
      case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'quarter': start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
      case 'year': start = new Date(now.getFullYear(), 0, 1); break;
      default: start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
  };

  const { start, end, supplyId: filterSupplyId } = getDateRange();
  const { data: stats, isLoading: statsLoading } = useDashboardStats(start, end, filterSupplyId);
  const { data: revenueByCategory, isLoading: categoryLoading } = useRevenueByCategory(start, end);
  const { data: topCustomers, isLoading: customersLoading } = useTopCustomersByBalance(5);
  const { data: paymentsByMethod, isLoading: paymentsLoading } = usePaymentsByMethod(start, end);
  const { data: profitRawData } = useProfitStats();
  const { data: deposits = [] } = useDeposits();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(value);

  // Compute profit data by actual dates
  const profitData = useMemo(() => {
    if (!profitRawData || !('sales' in profitRawData)) return [];
    const { sales, expenses } = profitRawData;

    // Group by actual date
    const buckets: Record<string, { revenue: number; expenses: number }> = {};
    const ensure = (key: string) => { if (!buckets[key]) buckets[key] = { revenue: 0, expenses: 0 }; };

    sales.forEach(s => { const k = s.sale_date; ensure(k); buckets[k].revenue += Number(s.total_amount || 0); });
    expenses.forEach(e => { const k = e.expense_date; ensure(k); buckets[k].expenses += Number(e.amount); });

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
      }));
  }, [profitRawData]);

  return (
    <Box>
      <Tabs value={dashTab} onChange={(_, v) => setDashTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Profit Analysis" />
        <Tab label="Analytics" />
      </Tabs>

      {dashTab === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Overview</Typography>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Period</InputLabel>
              <Select value={period} label="Period" onChange={(e) => { setPeriod(e.target.value); if (e.target.value !== 'supply-select') setSelectedSupplyId(''); }}>
                <MenuItem value="supply">Latest Supply Week</MenuItem>
                <MenuItem value="supply-select">Select Supply Week</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">This Quarter</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
              </Select>
            </FormControl>
            {period === 'supply-select' && (
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Supply Week</InputLabel>
                <Select value={selectedSupplyId} label="Supply Week" onChange={(e) => setSelectedSupplyId(e.target.value)}>
                  {supplies?.map(s => (
                    <MenuItem key={s.id} value={s.id}>
                      {new Date(s.week_start_date).toLocaleDateString()} - {new Date(s.week_end_date).toLocaleDateString()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {(period === 'supply' || period === 'supply-select') && (filterSupplyId ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing data for selected supply week: {new Date(start).toLocaleDateString()} - {new Date(end).toLocaleDateString()}
            </Typography>
          ) : period === 'supply' && !mostRecentSupply ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No supply records found. Showing current month.
            </Typography>
          ) : null)}

          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 1.5 }}>
              <StatCard title="Expected Revenue" value={formatCurrency(stats?.expectedRevenue || 0)} icon={<TrendingUp sx={{ color: 'green' }} />} loading={statsLoading} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 1.5 }}>
              <StatCard 
                title="Laying %" 
                value={layingPercentage ? `${layingPercentage.percentage}%` : 'N/A'} 
                icon={<Egg sx={{ color: 'orange' }} />} 
                valueColor={layingPercentage ? (parseFloat(layingPercentage.percentage) >= 80 ? 'success.main' : parseFloat(layingPercentage.percentage) >= 60 ? 'warning.main' : 'error.main') : 'text.secondary'}
                subtitle={layingPercentage ? (
                  parseFloat(layingPercentage.percentage) >= 80 ? '🎉 Excellent - Great production!' :
                  parseFloat(layingPercentage.percentage) >= 60 ? '✅ Good - Normal production' :
                  parseFloat(layingPercentage.percentage) >= 40 ? '⚠️ Fair - Below target' :
                  '🚨 Critical - Needs attention!'
                ) : 'No data today'}
                subtitleColor={layingPercentage ? (
                  parseFloat(layingPercentage.percentage) >= 80 ? 'success.main' :
                  parseFloat(layingPercentage.percentage) >= 60 ? 'warning.main' :
                  'error.main'
                ) : 'text.secondary'}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 1.5 }}>
              <StatCard title="Actual Revenue" value={formatCurrency(stats?.actualRevenue || 0)} icon={<AccountBalance sx={{ color: 'green' }} />} loading={statsLoading} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 1.5 }}>
              <StatCard title="Outstanding" value={formatCurrency(stats?.totalOutstanding || 0)} valueColor="error.main" icon={<MoneyOff sx={{ color: 'red' }} />} loading={statsLoading} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 1.5 }}>
              <StatCard title="Payments" value={formatCurrency(stats?.paymentsReceived || 0)} valueColor="success.main" icon={<Payments sx={{ color: 'green' }} />} loading={statsLoading} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 1.5 }}>
              <StatCard 
                title="Unsold Stock" 
                value={formatCurrency(stats?.unsoldTraysValue || 0)} 
                subtitle={`${stats?.unsoldTrays || 0} trays remaining`}
                subtitleColor={stats?.unsoldTrays && stats.unsoldTrays > 0 ? 'orange' : 'gray'}
                icon={<Inventory sx={{ color: 'orange' }} />} 
                loading={statsLoading} 
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 1.5 }}>
              <StatCard 
                title="Expenses" 
                value={formatCurrency(stats?.totalExpenses || 0)} 
                subtitle="Click to see breakdown"
                subtitleColor="primary.main"
                valueColor="error.main" 
                icon={<Receipt sx={{ color: 'red' }} />} 
                loading={statsLoading}
                onClick={() => setShowExpenseBreakdown(true)}
                clickable
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 1.5 }}>
              <StatCard title="Deposited" value={formatCurrency(stats?.depositedAmount || 0)} icon={<Savings sx={{ color: 'blue' }} />} loading={statsLoading} />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 1.5 }}>
              <StatCard title="Cash on Hand" value={formatCurrency(stats?.cashOnHand || 0)} valueColor={stats?.cashOnHand && stats.cashOnHand > 0 ? 'success.main' : 'error.main'} icon={<AccountBalanceWallet sx={{ color: 'green' }} />} loading={statsLoading} />
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, height: 400, borderRadius: '12px' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Revenue by Category</Typography>
                {categoryLoading ? <Skeleton variant="rectangular" height={300} /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={revenueByCategory || []} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                        {(revenueByCategory || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[(entry.category || '').toLowerCase()] || FALLBACK_COLOR} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, height: 400, borderRadius: '12px' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Payments by Method</Typography>
                {paymentsLoading ? <Skeleton variant="rectangular" height={300} /> : !paymentsByMethod || paymentsByMethod.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                    <Typography color="text.secondary">No payments in this period</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={paymentsByMethod} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                        {paymentsByMethod.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PAYMENT_METHOD_COLORS[entry.method] || FALLBACK_COLOR} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper sx={{ p: 3, height: 400, borderRadius: '12px' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Top Outstanding Balances</Typography>
                {customersLoading ? <Skeleton variant="rectangular" height={300} /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topCustomers || []} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                      <YAxis type="category" dataKey="name" width={70} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="balance" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {dashTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Profit Analysis</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Group By</InputLabel>
              <Select value={profitPeriod} label="Group By" onChange={(e) => setProfitPeriod(e.target.value as any)}>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Summary cards */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {(() => {
              const totals = profitData.reduce((acc, d) => ({
                revenue: acc.revenue + d.revenue,
                expenses: acc.expenses + d.expenses,
                profit: acc.profit + d.profit,
              }), { revenue: 0, expenses: 0, profit: 0 });
              return (
                <>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: '12px' }}>
                      <Typography variant="body2" color="text.secondary">Total Revenue</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>{formatCurrency(totals.revenue)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: '12px' }}>
                      <Typography variant="body2" color="text.secondary">Total Expenses</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>{formatCurrency(totals.expenses)}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Paper sx={{ p: 2, borderRadius: '12px' }}>
                      <Typography variant="body2" color="text.secondary">Net Profit</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: totals.profit >= 0 ? 'success.main' : 'error.main' }}>{formatCurrency(totals.profit)}</Typography>
                    </Paper>
                  </Grid>
                </>
              );
            })()}
          </Grid>

          <Paper sx={{ p: 3, borderRadius: '12px', height: 400 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Profit Analysis</Typography>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={profitData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis 
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Sales Revenue" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      )}

      {dashTab === 2 && (
        <AnalyticsTab />
      )}

      {/* Expense Breakdown Dialog */}
      <Dialog open={showExpenseBreakdown} onClose={() => setShowExpenseBreakdown(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Expense Breakdown</DialogTitle>
        <DialogContent>
          {stats?.expenseBreakdown && Object.keys(stats.expenseBreakdown).length > 0 ? (
            <List>
              {Object.entries(stats.expenseBreakdown)
                .filter(([_, v]) => v > 0)
                .map(([category, amount]) => (
                  <ListItem key={category} divider>
                    <ListItemText 
                      primary={category} 
                      secondary={formatCurrency(amount)} 
                      primaryTypographyProps={{ fontWeight: 500 }}
                      secondaryTypographyProps={{ color: 'error.main', fontWeight: 600 }}
                    />
                  </ListItem>
                ))}
            </List>
          ) : (
            <Typography color="text.secondary">No expense data available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExpenseBreakdown(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Analytics Tab Component
const AnalyticsTab = () => {
  const [comparePeriod, setComparePeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const { data: supplies } = useSupplies();
  const { data: collections } = useCollections();
  const flockSettingsHook = useFlockSettings();
  const flockSettings = flockSettingsHook.settings;
  const { data: profitRawData } = useProfitStats();
  const { data: sales } = useSales();
  const { data: expenses } = useExpenses();
  const { data: customers } = useCustomers();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(value);

  // Helper to parse egg data from notes
  const parseEggDataFromNotes = (notes: string | null): { eggData: Record<string, number>, shadeEggs: number } => {
    const eggData: Record<string, number> = {};
    let shadeEggs = 0;
    
    if (!notes) return { eggData, shadeEggs };
    
    try {
      if (notes.startsWith('{')) {
        const parsed = JSON.parse(notes);
        return { eggData: parsed.eggData || {}, shadeEggs: parsed.shadeEggs || 0 };
      }
    } catch (e) {}
    
    const cageMatch = notes.match(/Cage:\s*(\d+)/);
    const shadeMatch = notes.match(/Shade:\s*(\d+)/);
    
    if (cageMatch) {
      const totalCageEggs = parseInt(cageMatch[1], 10);
      for (let i = 0; i < totalCageEggs; i++) {
        eggData[`1-0-${Math.floor(i/8)}-${i%8}`] = 1;
      }
    }
    
    if (shadeMatch) {
      shadeEggs = parseInt(shadeMatch[1], 10);
    }
    
    return { eggData, shadeEggs };
  };

  // Calculate current and previous period data
  const periodData = useMemo(() => {
    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;

    if (comparePeriod === 'month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (comparePeriod === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
    } else {
      currentStart = new Date(now.getFullYear(), 0, 1);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear() - 1, 11, 31);
    }

    const isInRange = (dateStr: string) => {
      const date = new Date(dateStr);
      return date >= currentStart && date <= now;
    };

    const wasInRange = (dateStr: string) => {
      const date = new Date(dateStr);
      return date >= previousStart && date <= previousEnd;
    };

    const currentRevenue = (sales || [])
      .filter(s => isInRange(s.sale_date))
      .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

    const previousRevenue = (sales || [])
      .filter(s => wasInRange(s.sale_date))
      .reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

    const currentExpenses = (expenses || [])
      .filter(e => isInRange(e.expense_date))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const previousExpenses = (expenses || [])
      .filter(e => wasInRange(e.expense_date))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const currentTrays = (collections || [])
      .filter(c => isInRange(c.collection_date))
      .reduce((sum, c) => {
        const parsed = parseEggDataFromNotes(c.notes);
        const totalEggs = Object.values(parsed.eggData).reduce((a: number, b: number) => a + b, 0) + parsed.shadeEggs;
        return sum + Math.floor(totalEggs / 30);
      }, 0);

    const previousTrays = (collections || [])
      .filter(c => wasInRange(c.collection_date))
      .reduce((sum, c) => {
        const parsed = parseEggDataFromNotes(c.notes);
        const totalEggs = Object.values(parsed.eggData).reduce((a: number, b: number) => a + b, 0) + parsed.shadeEggs;
        return sum + Math.floor(totalEggs / 30);
      }, 0);

    return {
      currentRevenue,
      previousRevenue,
      revenueChange: previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0,
      currentExpenses,
      previousExpenses,
      expensesChange: previousExpenses > 0 ? ((currentExpenses - previousExpenses) / previousExpenses) * 100 : 0,
      currentTrays,
      previousTrays,
      traysChange: previousTrays > 0 ? ((currentTrays - previousTrays) / previousTrays) * 100 : 0,
    };
  }, [sales, expenses, collections, comparePeriod]);

  // Collection trend data for line chart
  const collectionTrendData = useMemo(() => {
    if (!collections) return [];
    
    const sorted = [...collections].sort((a, b) => 
      new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime()
    );
    
    return sorted.map(c => {
      const parsed = parseEggDataFromNotes(c.notes);
      const totalEggs = Object.values(parsed.eggData).reduce((a: number, b: number) => a + b, 0) + parsed.shadeEggs;
      return {
        date: c.collection_date,
        eggs: totalEggs,
        trays: Math.floor(totalEggs / 30),
      };
    });
  }, [collections]);

  // Calculate all-time totals
  const allTimeData = useMemo(() => {
    const totalRevenue = (sales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalTrays = (supplies || []).reduce((sum, s) => sum + Number(s.total_trays || 0), 0);
    const totalCustomers = customers?.length || 0;
    
    return {
      totalRevenue,
      totalExpenses,
      totalProfit: totalRevenue - totalExpenses,
      totalTrays,
      totalCustomers
    };
  }, [sales, expenses, supplies, customers]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Analytics</Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Compare</InputLabel>
          <Select value={comparePeriod} label="Compare" onChange={(e) => setComparePeriod(e.target.value as any)}>
            <MenuItem value="month">Month vs Last Month</MenuItem>
            <MenuItem value="quarter">Quarter vs Last Quarter</MenuItem>
            <MenuItem value="year">Year vs Last Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* All-Time Totals */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>All-Time Totals</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, md: 2 }}>
          <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: 'primary.light' }}>
            <Typography variant="body2" color="white">Total Revenue</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>{formatCurrency(allTimeData.totalRevenue)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: 'error.main' }}>
            <Typography variant="body2" color="white">Total Expenses</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>{formatCurrency(allTimeData.totalExpenses)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: 'success.main' }}>
            <Typography variant="body2" color="white">Total Profit</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>{formatCurrency(allTimeData.totalProfit)}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: 'warning.main' }}>
            <Typography variant="body2" color="white">Total Trays</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>{allTimeData.totalTrays}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: 'info.main' }}>
            <Typography variant="body2" color="white">Total Customers</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>{allTimeData.totalCustomers}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Period Comparison */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Period Comparison</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: '12px' }}>
            <Typography variant="body2" color="text.secondary">Revenue Change</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: periodData.revenueChange >= 0 ? 'success.main' : 'error.main' }}>
              {periodData.revenueChange >= 0 ? '+' : ''}{periodData.revenueChange.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(periodData.currentRevenue)} vs {formatCurrency(periodData.previousRevenue)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: '12px' }}>
            <Typography variant="body2" color="text.secondary">Expenses Change</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: periodData.expensesChange <= 0 ? 'success.main' : 'error.main' }}>
              {periodData.expensesChange >= 0 ? '+' : ''}{periodData.expensesChange.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(periodData.currentExpenses)} vs {formatCurrency(periodData.previousExpenses)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: '12px' }}>
            <Typography variant="body2" color="text.secondary">Production Change</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: periodData.traysChange >= 0 ? 'success.main' : 'error.main' }}>
              {periodData.traysChange >= 0 ? '+' : ''}{periodData.traysChange.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {periodData.currentTrays} trays vs {periodData.previousTrays} trays
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Egg Production Trend - Line Chart */}
      <Paper sx={{ p: 3, borderRadius: '12px', height: 400 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Egg Production Trend</Typography>
        {collectionTrendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={collectionTrendData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="trays" name="Trays" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
            <Typography color="text.secondary">No collection data available</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
