import { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Button, FormControl, InputLabel, Select, MenuItem, 
  Grid, Card, CardContent, Chip, Alert, Tabs, Tab, Divider, TextField, TableContainer, Table, TableHead, TableRow, TableBody, TableCell
} from '@mui/material';
import { 
  PictureAsPdf, Download, Assessment, TrendingUp, Receipt, People, 
  Inventory, CalendarMonth, Healing
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSales } from '@/hooks/useSales';
import { useCustomers } from '@/hooks/useCustomers';
import { usePayments } from '@/hooks/usePayments';
import { useExpenses } from '@/hooks/useExpenses';
import { useCollections } from '@/hooks/useCollections';
import { useSupplies } from '@/hooks/useSupplies';
import { useCompany } from '@/hooks/useCompany';
import { useCurrentPrices } from '@/hooks/usePrices';
import { useVaccinations } from '@/hooks/useVaccinations';
import { useMortalityRecords } from '@/hooks/useMortalityRecords';
import { useTreatmentRecords } from '@/hooks/useTreatmentRecords';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { BarChart, Bar, XAxis as BarXAxis, YAxis as BarYAxis, CartesianGrid as BarCartesianGrid, Tooltip as BarTooltip, ResponsiveContainer as BarResponsiveContainer } from 'recharts';

type ReportType = 'sales' | 'customers' | 'payments' | 'expenses' | 'collections' | 'summary' | 'vaccination' | 'mortality' | 'treatment';

export const ReportsPage = () => {
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const { currentCompany } = useCompany();
  const { data: sales } = useSales();
  const { data: customers } = useCustomers();
  const { data: payments } = usePayments();
  const { data: expenses } = useExpenses();
  const { data: collections } = useCollections();
  const { data: supplies } = useSupplies();
  const { data: currentPrices } = useCurrentPrices();
  const { vaccinationRecords, completedVaccinations, vaccinationDates } = useVaccinations();
  const { mortalityRecords, totalMortality, mortalityByCause, mortalityByMonth } = useMortalityRecords();
  const { completedTreatments } = useTreatmentRecords();

  // Fallback to localStorage for backwards compatibility
  const localVaccinationRecords = useMemo(() => {
    const saved = localStorage.getItem('flock_vaccination_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  }, []);

  // Use API data, fallback to localStorage
  const allVaccinationRecords = (vaccinationRecords && vaccinationRecords.length > 0) 
    ? vaccinationRecords 
    : localVaccinationRecords;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(value);
  
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const filteredData = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    
    switch (dateRange) {
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(0);
    }

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    }

    const filterByDate = <T extends { [key: string]: any }>(items: T[], dateField: string): T[] => {
      if (!items) return [];
      return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= start && itemDate <= end;
      });
    };

    return {
      sales: filterByDate(sales || [], 'sale_date'),
      customers: customers || [],
      payments: filterByDate(payments || [], 'payment_date'),
      expenses: filterByDate(expenses || [], 'expense_date'),
      collections: filterByDate(collections || [], 'collection_date'),
      supplies: supplies || []
    };
  }, [sales, customers, payments, expenses, collections, supplies, dateRange, startDate, endDate]);

  const summaryStats = useMemo(() => {
    const totalSales = filteredData.sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const totalPayments = filteredData.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalDeposits = filteredData.payments.reduce((sum, p) => sum + Number(p.deposited_amount || 0), 0);
    const outstanding = totalSales - totalPayments;

    const totalEggs = filteredData.collections.reduce((sum, c) => {
      const starter = (c.starter_trays || 0) * 30;
      const mid = (c.mid_trays || 0) * 30;
      const normal = (c.normal_trays || 0) * 30;
      const remaining = c.remaining || 0;
      return sum + starter + mid + normal + remaining;
    }, 0);

    const totalCustomers = filteredData.customers.length;

    return {
      totalSales,
      totalPayments,
      totalExpenses,
      totalDeposits,
      outstanding,
      totalEggs,
      totalCustomers
    };

  }, [filteredData.sales, filteredData.customers, filteredData.payments, filteredData.expenses, filteredData.collections, dateRange]);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const companyName = currentCompany?.name || 'Eggcellent Sales';
      const reportDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });

      const addHeader = (title: string) => {
        doc.setFontSize(18);
        doc.setTextColor(46, 125, 50);
        doc.text(companyName, 14, 22);

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(title, 14, 32);

        doc.setFontSize(10);
        doc.text(`Generated: ${reportDate}`, 14, 40);
        doc.text(`Period: ${dateRange === 'all' ? 'All Time' : dateRange}`, 14, 46);

        doc.setDrawColor(46, 125, 50);
        doc.line(14, 50, 196, 50);

        return 60;
      };

      const pdfCurrency = (value: number) => 
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(value);

      switch (reportType) {
        case 'summary': {
          let yPos = addHeader('Business Summary Report');
          
          doc.setFontSize(14);
          doc.setTextColor(0);
          doc.text('Financial Overview', 14, yPos);
          yPos += 10;

          autoTable(doc, {
            startY: yPos,
            head: [['Metric', 'Value']],
            body: [
              ['Total Sales', pdfCurrency(summaryStats.totalSales)],
              ['Total Payments Received', pdfCurrency(summaryStats.totalPayments)],
              ['Total Expenses', pdfCurrency(summaryStats.totalExpenses)],
              ['Outstanding Balance', pdfCurrency(summaryStats.outstanding)],
              ['Total Eggs Collected', summaryStats.totalEggs.toString()],
              ['Total Customers', summaryStats.totalCustomers.toString()],
            ],
            theme: 'striped',
            headStyles: { fillColor: [46, 125, 50] },
          });

          const finalY = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.text(`Total Sales: ${pdfCurrency(summaryStats.totalSales)}`, 14, finalY);
          break;
        }

        case 'sales': {
          let yPos = addHeader('Sales Report');
          
          autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Customer', 'Trays', 'Amount', 'Status']],
            body: filteredData.sales.map((s: any) => [
              formatDate(s.sale_date),
              (s.customer as any)?.name || 'Unknown',
              (s.tray_count || 0).toString(),
              pdfCurrency(s.total_amount || 0),
              s.payment_status || 'N/A'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [46, 125, 50] },
          });

          const finalY = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.text(`Total Sales: ${pdfCurrency(summaryStats.totalSales)}`, 14, finalY);
          break;
        }

        case 'customers': {
          let yPos = addHeader('Customer Report');
          
          autoTable(doc, {
            startY: yPos,
            head: [['Name', 'Phone', 'Email', 'Balance']],
            body: filteredData.customers.map((c: any) => [
              c.name || 'N/A',
              c.phone || '-',
              c.email || '-',
              pdfCurrency(c.balance || 0)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [46, 125, 50] },
          });
          break;
        }

        case 'payments': {
          let yPos = addHeader('Payments Report');
          
          autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Customer', 'Amount', 'Deposited', 'Method', 'Notes']],
            body: filteredData.payments.map((p: any) => [
              formatDate(p.payment_date),
              (p.customer as any)?.name || 'Unknown',
              pdfCurrency(p.amount || 0),
              pdfCurrency(p.deposited_amount || 0),
              p.payment_method || '-',
              p.notes || '-'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [46, 125, 50] },
          });
          
          const finalY = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.text(`Total Received: ${pdfCurrency(summaryStats.totalPayments)}`, 14, finalY);
          doc.text(`Total Deposited: ${pdfCurrency(summaryStats.totalDeposits)}`, 14, finalY + 7);
          break;
        }

        case 'expenses': {
          let yPos = addHeader('Expenses Report');
          
          autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Category', 'Description', 'Amount', 'Method']],
            body: filteredData.expenses.map((e: any) => [
              formatDate(e.expense_date),
              e.category,
              e.description,
              pdfCurrency(e.amount || 0),
              e.payment_method || '-'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [46, 125, 50] },
          });

          const catFinalY = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.text(`Total Expenses: ${pdfCurrency(summaryStats.totalExpenses)}`, 14, catFinalY);
          break;
        }

        case 'collections': {
          let yPos = addHeader('Collections Report');
          
          autoTable(doc, {
            startY: yPos,
            head: [['Date', 'Starter', 'Mid', 'Normal', 'Remaining', 'Total Eggs', 'Status']],
            body: filteredData.collections.map((c: any) => [
              formatDate(c.collection_date),
              (c.starter_trays || 0).toString(),
              (c.mid_trays || 0).toString(),
              (c.normal_trays || 0).toString(),
              (c.remaining || 0).toString(),
              ((((c.starter_trays || 0) + (c.mid_trays || 0) + (c.normal_trays || 0)) * 30 + (c.remaining || 0))).toString(),
              c.status || '-'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [46, 125, 50] },
          });

          const finalY = (doc as any).lastAutoTable.finalY + 10;
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.text(`Total Eggs Collected: ${summaryStats.totalEggs}`, 14, finalY);
          doc.text(`Total Trays: ${Math.floor(summaryStats.totalEggs / 30)}`, 14, finalY + 7);
          break;
        }

        case 'treatment': {
          let yPos = addHeader('Treatment & Vaccination Report');
          
          // Add vaccinations section
          if (allVaccinationRecords && allVaccinationRecords.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text('Vaccinations', 14, yPos);
            yPos += 10;

            autoTable(doc, {
              startY: yPos,
              head: [['Date Given', 'Next Due', 'Vaccine', 'Notes']],
              body: allVaccinationRecords.map((v: any) => [
                formatDate(v.dateGiven),
                v.nextDue ? formatDate(v.nextDue) : '-',
                v.name || '-',
                v.notes || '-'
              ]),
              theme: 'striped',
              headStyles: { fillColor: [46, 125, 50] },
            });

            yPos = (doc as any).lastAutoTable.finalY + 15;
          }

          // Add treatments section
          if (completedTreatments && completedTreatments.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text('Treatments', 14, yPos);
            yPos += 10;

            autoTable(doc, {
              startY: yPos,
              head: [['Date', 'Type', 'Product', 'Dosage', 'Reason', 'Duration']],
              body: completedTreatments.map((t: any) => [
                formatDate(t.dateGiven),
                t.treatmentType || '-',
                t.productName || '-',
                t.dosage || '-',
                t.reason || '-',
                t.daysGiven ? `${t.daysGiven} days` : '-'
              ]),
              theme: 'striped',
              headStyles: { fillColor: [46, 125, 50] },
            });
          }
          
          if ((!allVaccinationRecords || allVaccinationRecords.length === 0) && (!completedTreatments || completedTreatments.length === 0)) {
            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text('No health records found.', 14, yPos);
          }
          break;
        }

        case 'vaccination': {
          let yPos = addHeader('Vaccination Report');
          
          const vaxRecords = allVaccinationRecords || [];
          
          if (vaxRecords.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [['Date Given', 'Next Due', 'Vaccine', 'Status', 'Notes']],
              body: vaxRecords.map((v: any) => [
                formatDate(v.dateGiven),
                v.nextDue ? formatDate(v.nextDue) : '-',
                v.name || '-',
                v.completed ? 'Completed' : 'Pending',
                v.notes || '-'
              ]),
              theme: 'striped',
              headStyles: { fillColor: [46, 125, 50] },
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`Total Vaccinations: ${vaxRecords.length}`, 14, finalY);
          } else {
            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text('No vaccination records found.', 14, yPos);
          }
          break;
        }

        case 'mortality': {
          let yPos = addHeader('Mortality Report');
          
          if (mortalityRecords && mortalityRecords.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [['Date', 'Count', 'Cause', 'Notes']],
              body: mortalityRecords.map((m: any) => [
                formatDate(m.date),
                m.count.toString(),
                m.cause || '-',
                m.notes || '-'
              ]),
              theme: 'striped',
              headStyles: { fillColor: [46, 125, 50] },
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text(`Total Mortality: ${totalMortality}`, 14, finalY);
            doc.text(`Total Records: ${mortalityRecords.length}`, 14, finalY + 7);
          } else {
            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text('No mortality records found.', 14, yPos);
          }
          break;
        }
      }

      const filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const reportTypes = [
    { value: 'summary', label: 'Business Summary', icon: <Assessment />, desc: 'Overview of all business metrics' },
    { value: 'sales', label: 'Sales Report', icon: <TrendingUp />, desc: 'Detailed sales transactions' },
    { value: 'customers', label: 'Customer Report', icon: <People />, desc: 'Customer balances and activity' },
    { value: 'payments', label: 'Payments Report', icon: <Receipt />, desc: 'Payment records and deposits' },
    { value: 'expenses', label: 'Expenses Report', icon: <Receipt />, desc: 'Expense breakdown by category' },
    { value: 'collections', label: 'Collections Report', icon: <Inventory />, desc: 'Egg collection records' },
    { value: 'vaccination', label: 'Vaccination Impact', icon: <TrendingUp />, desc: 'Egg production vs vaccination analysis' },
    { value: 'mortality', label: 'Mortality Report', icon: <TrendingUp />, desc: 'Mortality records and analysis' },
    { value: 'treatment', label: 'Treatment Report', icon: <Healing />, desc: 'Treatment records and analysis' },
  ];

  return (
    <Box p={{ xs: 2, sm: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PictureAsPdf color="primary" /> Reports & Export
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generate PDF reports for your business data
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Report Type</Typography>
            <FormControl fullWidth>
              <InputLabel>Select Report</InputLabel>
              <Select
                value={reportType}
                label="Select Report"
                onChange={(e) => setReportType(e.target.value as ReportType)}
              >
                {reportTypes.map((rt) => (
                  <MenuItem key={rt.value} value={rt.value}>
                    <Box>
                      <Typography variant="body1">{rt.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{rt.desc}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 2 }}>Date Range</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={dateRange}
                label="Period"
                onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              >
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">This Quarter</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
                <MenuItem value="all">All Time</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Or set custom dates:
            </Typography>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              sx={{ mb: 1 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 9 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {reportTypes.find(rt => rt.value === reportType)?.label || 'Report'}
            </Typography>
            
            {reportType === 'summary' && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card sx={{ bgcolor: 'success.light' }}>
                    <CardContent>
                      <Typography variant="body2" color="success.dark">Total Sales</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.dark' }}>
                        {formatCurrency(summaryStats.totalSales)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card sx={{ bgcolor: 'info.light' }}>
                    <CardContent>
                      <Typography variant="body2" color="info.dark">Payments Received</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.dark' }}>
                        {formatCurrency(summaryStats.totalPayments)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card sx={{ bgcolor: 'error.light' }}>
                    <CardContent>
                      <Typography variant="body2" color="error.dark">Total Expenses</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.dark' }}>
                        {formatCurrency(summaryStats.totalExpenses)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card sx={{ bgcolor: 'warning.light' }}>
                    <CardContent>
                      <Typography variant="body2" color="warning.dark">Outstanding</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.dark' }}>
                        {formatCurrency(summaryStats.outstanding)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Total Eggs Collected</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {summaryStats.totalEggs.toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">Total Customers</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {summaryStats.totalCustomers}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {reportType === 'sales' && filteredData.sales.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Showing {filteredData.sales.length} sales records
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell align="right">Trays</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredData.sales.slice(0, 10).map((s: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{formatDate(s.sale_date)}</TableCell>
                          <TableCell>{(s.customer as any)?.name || 'Unknown'}</TableCell>
                          <TableCell align="right">{s.tray_count || 0}</TableCell>
                          <TableCell align="right">{formatCurrency(s.total_amount || 0)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={s.payment_status || 'N/A'} 
                              size="small" 
                              color={s.payment_status === 'paid' ? 'success' : 'warning'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {reportType === 'collections' && filteredData.collections.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Showing {filteredData.collections.length} collection records
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Starter</TableCell>
                        <TableCell align="right">Mid</TableCell>
                        <TableCell align="right">Normal</TableCell>
                        <TableCell align="right">Remaining</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredData.collections.slice(0, 10).map((c: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{formatDate(c.collection_date)}</TableCell>
                          <TableCell align="right">{c.starter_trays || 0}</TableCell>
                          <TableCell align="right">{c.mid_trays || 0}</TableCell>
                          <TableCell align="right">{c.normal_trays || 0}</TableCell>
                          <TableCell align="right">{c.remaining || 0}</TableCell>
                          <TableCell align="right">{((c.starter_trays || 0) + (c.mid_trays || 0) + (c.normal_trays || 0)) * 30 + (c.remaining || 0)}</TableCell>
                          <TableCell>{c.status || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Vaccination Impact Report */}
            {reportType === 'vaccination' && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Analysis of egg production around vaccination dates
                </Typography>
                
                {/* Vaccination History */}
                {completedVaccinations.length > 0 ? (
                  <>
                    <Paper sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>💉 Vaccination History</Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Vaccine</TableCell>
                              <TableCell>Notes</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {completedVaccinations.map((vax) => (
                              <TableRow key={vax.id}>
                                <TableCell>{formatDate(vax.dateGiven)}</TableCell>
                                <TableCell>{vax.name}</TableCell>
                                <TableCell>{vax.notes || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>

                    {/* Production Chart around Vaccination Dates */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>📈 Production Around Vaccination Dates</Typography>
                      
                      {(() => {
                        // Calculate production data around each vaccination
                        const productionData: any[] = [];
                        const DAYS_BEFORE = 7;
                        const DAYS_AFTER = 7;
                        
                        completedVaccinations.forEach((vax) => {
                          const vaxDate = new Date(vax.dateGiven);
                          
                          // Find collections around this vaccination date
                          const relevantCollections = (collections || []).filter((c: any) => {
                            const collDate = new Date(c.collection_date);
                            const diffDays = Math.floor((collDate.getTime() - vaxDate.getTime()) / (1000 * 60 * 60 * 24));
                            return diffDays >= -DAYS_BEFORE && diffDays <= DAYS_AFTER;
                          }).sort((a: any, b: any) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime());
                          
                          relevantCollections.forEach((c: any) => {
                            const collDate = new Date(c.collection_date);
                            const diffDays = Math.floor((collDate.getTime() - vaxDate.getTime()) / (1000 * 60 * 60 * 24));
                            const totalTrays = (c.starter_trays || 0) + (c.mid_trays || 0) + (c.normal_trays || 0);
                            productionData.push({
                              date: collDate.toISOString().split('T')[0],
                              label: diffDays === 0 ? `Vax: ${vax.name}` : (diffDays < 0 ? `${Math.abs(diffDays)} days before` : `${diffDays} days after`),
                              trays: totalTrays,
                              isVaxDay: diffDays === 0,
                              vaccine: vax.name,
                            });
                          });
                        });
                        
                        if (productionData.length === 0) {
                          return (
                            <Alert severity="info">
                              No collection data available around vaccination dates. Make sure to record daily collections.
                            </Alert>
                          );
                        }
                        
                        return (
                          <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={productionData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip 
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <Paper sx={{ p: 2 }}>
                                        <Typography variant="body2">{label}</Typography>
                                        <Typography variant="caption" color="primary">{data.label}</Typography>
                                        <Typography variant="body2">
                                          Production: {data.trays} trays
                                        </Typography>
                                      </Paper>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Legend />
                              <ReferenceLine 
                                stroke="red" 
                                strokeDasharray="5 5" 
                                label="Vaccination Day"
                              />
                              <Line 
                                type="monotone" 
                                dataKey="trays" 
                                stroke="#8884d8" 
                                strokeWidth={2}
                                dot={(props: any) => {
                                  const { cx, cy, payload } = props;
                                  if (payload.isVaxDay) {
                                    return <circle cx={cx} cy={cy} r={6} fill="red" />;
                                  }
                                  return <circle cx={cx} cy={cy} r={4} fill="#8884d8" />;
                                }}
                                name="Egg Production (Trays)"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </Paper>

                    {/* Impact Analysis */}
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>📊 Vaccination Impact Analysis</Typography>
                      
                      {(() => {
                        const IMPACT_WINDOW_DAYS = 5;
                        const impactData: any[] = [];
                        
                        completedVaccinations.forEach((vax) => {
                          const vaxDate = new Date(vax.dateGiven);
                          
                          // Get production before vaccination
                          const beforeCollections = (collections || []).filter((c: any) => {
                            const collDate = new Date(c.collection_date);
                            const diffDays = Math.floor((collDate.getTime() - vaxDate.getTime()) / (1000 * 60 * 60 * 24));
                            return diffDays >= -IMPACT_WINDOW_DAYS && diffDays < 0;
                          });
                          
                          const beforeTotal = beforeCollections.reduce((sum: number, c: any) => 
                            sum + (c.starter_trays || 0) + (c.mid_trays || 0) + (c.normal_trays || 0), 0);
                          const beforeAvg = beforeCollections.length > 0 ? beforeTotal / beforeCollections.length : 0;
                          
                          // Get production after vaccination
                          const afterCollections = (collections || []).filter((c: any) => {
                            const collDate = new Date(c.collection_date);
                            const diffDays = Math.floor((collDate.getTime() - vaxDate.getTime()) / (1000 * 60 * 60 * 24));
                            return diffDays > 0 && diffDays <= IMPACT_WINDOW_DAYS;
                          });
                          
                          const afterTotal = afterCollections.reduce((sum: number, c: any) => 
                            sum + (c.starter_trays || 0) + (c.mid_trays || 0) + (c.normal_trays || 0), 0);
                          const afterAvg = afterCollections.length > 0 ? afterTotal / afterCollections.length : 0;
                          
                          const change = beforeAvg > 0 ? ((afterAvg - beforeAvg) / beforeAvg) * 100 : 0;
                          
                          impactData.push({
                            vaccine: vax.name,
                            date: formatDate(vax.dateGiven),
                            beforeCount: beforeCollections.length,
                            beforeAvg: beforeAvg.toFixed(1),
                            afterCount: afterCollections.length,
                            afterAvg: afterAvg.toFixed(1),
                            change: change.toFixed(1),
                            impact: change > 5 ? '↑ Increased' : (change < -5 ? '↓ Decreased' : '→ No significant change'),
                          });
                        });
                        
                        if (impactData.length === 0) {
                          return (
                            <Alert severity="info">
                              No enough collection data to analyze vaccination impact.
                            </Alert>
                          );
                        }
                        
                        return (
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Vaccine</TableCell>
                                  <TableCell>Date</TableCell>
                                  <TableCell align="right">Before (Avg)</TableCell>
                                  <TableCell align="right">After (Avg)</TableCell>
                                  <TableCell align="right">Change %</TableCell>
                                  <TableCell>Impact</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {impactData.map((data, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>{data.vaccine}</TableCell>
                                    <TableCell>{data.date}</TableCell>
                                    <TableCell align="right">{data.beforeAvg} trays</TableCell>
                                    <TableCell align="right">{data.afterAvg} trays</TableCell>
                                    <TableCell align="right" sx={{ 
                                      color: parseFloat(data.change) > 0 ? 'green' : (parseFloat(data.change) < 0 ? 'red' : 'inherit')
                                    }}>
                                      {data.change}%
                                    </TableCell>
                                    <TableCell>{data.impact}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        );
                      })()}
                    </Paper>
                  </>
                ) : (
                  <Alert severity="info">
                    No vaccination records found. Go to Flock Health page to record vaccinations.
                  </Alert>
                )}
              </Box>
            )}

            {/* Mortality Report */}
            {reportType === 'mortality' && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Mortality records and analysis
                </Typography>
                
                {mortalityRecords.length > 0 ? (
                  <>
                    {/* Summary Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" color="error">Total Mortality</Typography>
                            <Typography variant="h3">{totalMortality}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Records</Typography>
                            <Typography variant="h3">{mortalityRecords.length}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Avg per Incident</Typography>
                            <Typography variant="h3">
                              {(totalMortality / mortalityRecords.length).toFixed(1)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Mortality by Cause */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>📊 Mortality by Cause</Typography>
                      {mortalityByCause.length > 0 ? (
                        <BarResponsiveContainer width="100%" height={300}>
                          <BarChart data={mortalityByCause}>
                            <BarXAxis dataKey="cause" />
                            <BarYAxis />
                            <BarTooltip />
                            <Bar dataKey="count" fill="#ef4444" name="Deaths" />
                          </BarChart>
                        </BarResponsiveContainer>
                      ) : (
                        <Typography color="text.secondary">No data available</Typography>
                      )}
                    </Paper>

                    {/* Mortality by Month */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>📈 Mortality Trend by Month</Typography>
                      {mortalityByMonth.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={mortalityByMonth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} name="Deaths" />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <Typography color="text.secondary">No data available</Typography>
                      )}
                    </Paper>

                    {/* Detailed Records */}
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>📋 Detailed Records</Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell align="right">Count</TableCell>
                              <TableCell>Cause</TableCell>
                              <TableCell>Notes</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {mortalityRecords
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell>{formatDate(record.date)}</TableCell>
                                  <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>{record.count}</TableCell>
                                  <TableCell>{record.cause}</TableCell>
                                  <TableCell>{record.notes || '-'}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  </>
                ) : (
                  <Alert severity="info">
                    No mortality records found. Go to Flock Health page to record mortality.
                  </Alert>
                )}
              </Box>
            )}

            {/* Treatment Report */}
            {reportType === 'treatment' && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Health records including treatments and vaccinations
                </Typography>
                
                {/* Vaccinations Section */}
                {allVaccinationRecords && allVaccinationRecords.length > 0 && (
                  <>
                    <Paper sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>💉 Vaccinations ({allVaccinationRecords.length})</Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date Given</TableCell>
                              <TableCell>Next Due</TableCell>
                              <TableCell>Vaccine</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Notes</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {allVaccinationRecords
                              .sort((a: any, b: any) => new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime())
                              .map((vax: any) => (
                                <TableRow key={vax.id}>
                                  <TableCell>{formatDate(vax.dateGiven)}</TableCell>
                                  <TableCell>{vax.nextDue ? formatDate(vax.nextDue) : '-'}</TableCell>
                                  <TableCell>{vax.name}</TableCell>
                                  <TableCell>
                                    {vax.completed ? (
                                      <Chip size="small" label="Completed" color="success" />
                                    ) : (
                                      <Chip size="small" label="Pending" variant="outlined" />
                                    )}
                                  </TableCell>
                                  <TableCell>{vax.notes || '-'}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  </>
                )}

                {/* Treatments Section */}
                {completedTreatments.length > 0 ? (
                  <>
                    {/* Summary Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" color="primary">Total Treatments</Typography>
                            <Typography variant="h3">{completedTreatments.length}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Treatment Types</Typography>
                            <Typography variant="h3">{new Set(completedTreatments.map(r => r.treatmentType)).size}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6">Products Used</Typography>
                            <Typography variant="h3">{new Set(completedTreatments.map(r => r.productName)).size}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Treatments by Type */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>💊 Treatments by Type</Typography>
                      {(() => {
                        const treatmentByType = Object.entries(
                          completedTreatments.reduce((acc: Record<string, number>, r) => {
                          const type = r.treatmentType || 'Unknown';
                          acc[type] = (acc[type] || 0) + 1;
                          return acc;
                        }, {})
                        ).map(([type, count]) => ({ type, count }));
                        
                        return treatmentByType.length > 0 ? (
                          <BarResponsiveContainer width="100%" height={300}>
                            <BarChart data={treatmentByType}>
                              <BarXAxis dataKey="type" />
                              <BarYAxis />
                              <BarTooltip />
                              <Bar dataKey="count" fill="#3b82f6" name="Treatments" />
                            </BarChart>
                          </BarResponsiveContainer>
                        ) : (
                          <Typography color="text.secondary">No data available</Typography>
                        );
                      })()}
                    </Paper>

                    {/* Treatments by Month */}
                    <Paper sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>📈 Treatment Trend by Month</Typography>
                      {(() => {
                        const treatmentByMonth = Object.entries(
                          completedTreatments.reduce((acc: Record<string, number>, r) => {
                          const month = new Date(r.dateGiven).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                          acc[month] = (acc[month] || 0) + 1;
                          return acc;
                        }, {})
                        ).map(([month, count]) => ({ month, count })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
                        
                        return treatmentByMonth.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={treatmentByMonth}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Treatments" />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <Typography color="text.secondary">No data available</Typography>
                        );
                      })()}
                    </Paper>

                    {/* Detailed Records */}
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>📋 Treatment Details</Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Treatment Type</TableCell>
                              <TableCell>Product</TableCell>
                              <TableCell>Dosage</TableCell>
                              <TableCell>Reason</TableCell>
                              <TableCell>Duration</TableCell>
                              <TableCell>Notes</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {completedTreatments
                              .sort((a, b) => new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime())
                              .map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell>{formatDate(record.dateGiven)}</TableCell>
                                  <TableCell>{record.treatmentType || '-'}</TableCell>
                                  <TableCell>{record.productName || '-'}</TableCell>
                                  <TableCell>{record.dosage || '-'}</TableCell>
                                  <TableCell>{record.reason || '-'}</TableCell>
                                  <TableCell>{record.daysGiven ? `${record.daysGiven} days` : '-'}</TableCell>
                                  <TableCell>{record.notes || '-'}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  </>
                ) : (
                  <Alert severity="info">
                    No health records found. Go to Flock Health page to record treatments or vaccinations.
                  </Alert>
                )}
              </Box>
            )}

            {reportType === 'payments' && filteredData.payments.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Showing {filteredData.payments.length} payment records
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Method</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredData.payments.slice(0, 10).map((p: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{formatDate(p.payment_date)}</TableCell>
                          <TableCell>{(p.customer as any)?.name || 'Unknown'}</TableCell>
                          <TableCell align="right">{formatCurrency(p.amount || 0)}</TableCell>
                          <TableCell>{p.payment_method || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {reportType === 'expenses' && filteredData.expenses.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Showing {filteredData.expenses.length} expense records
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredData.expenses.slice(0, 10).map((e: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{formatDate(e.expense_date)}</TableCell>
                          <TableCell>{e.category}</TableCell>
                          <TableCell>{e.description}</TableCell>
                          <TableCell align="right">{formatCurrency(e.amount || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {reportType === 'customers' && filteredData.customers.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Showing {filteredData.customers.length} customers
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell align="right">Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredData.customers.slice(0, 10).map((c: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{c.name}</TableCell>
                          <TableCell>{c.phone || '-'}</TableCell>
                          <TableCell>{c.email || '-'}</TableCell>
                          <TableCell align="right">{formatCurrency(c.balance || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="contained"
                size="large"
                startIcon={generating ? undefined : <Download />}
                onClick={generatePDF}
                disabled={generating}
                sx={{ 
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                  py: 1.5,
                  px: 4
                }}
              >
                {generating ? 'Generating...' : 'Download PDF Report'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
