import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
  Chip, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, Tabs, Tab, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction, 
  Accordion, AccordionSummary, AccordionDetails, Divider
} from '@mui/material';
import { 
  Add, Warning, Healing, LocalHospital, Delete, Edit, TrendingDown, 
  CheckCircle, Schedule, Vaccines, Warning as WarningIcon, CalendarMonth, School, ExpandMore
} from '@mui/icons-material';
import { useFlockSettings } from '@/hooks/useFlockSettings';
import { useMortalityRecords } from '@/hooks/useMortalityRecords';
import { useVaccinations } from '@/hooks/useVaccinations';
import { useTreatmentRecords, TreatmentRecord } from '@/hooks/useTreatmentRecords';

// ?? Vaccination Schedule - exact dates starting from March 18, 2025
// Week 0 = Day 0 = flock start date
const VACCINATION_SCHEDULE = [
  { week: 0, name: "Marek's Disease", description: 'Injection (Subcutaneous)', intervalDays: 0 },
  { week: 0, name: 'Newcastle (HB1)', description: 'Eye Drop', intervalDays: 0 },
  { week: 1, name: 'Gumboro', description: 'Drinking Water', intervalDays: 7 },
  { week: 2, name: 'Gumboro Booster', description: 'Drinking Water', intervalDays: 7 },
  { week: 3, name: 'Newcastle (Lasota)', description: 'Drinking Water', intervalDays: 7 },
  { week: 4, name: 'Fowl Pox', description: 'Wing Stab', intervalDays: 7 },
  { week: 5, name: 'Fowl Typhoid', description: 'Injection', intervalDays: 7 },
  { week: 6, name: 'Infectious Bronchitis (IB)', description: 'Drinking Water', intervalDays: 7 },
  { week: 8, name: 'Newcastle Booster', description: 'Drinking Water', intervalDays: 14 },
  { week: 10, name: 'Fowl Typhoid Booster', description: 'Injection', intervalDays: 14 },
  { week: 16, name: 'Newcastle (Killed)', description: 'Injection', intervalDays: 42 },
  { week: 16, name: 'Egg Drop Syndrome (EDS)', description: 'Injection', intervalDays: 0 },
  // Regular Newcastle boosters every 12 weeks (84 days) after week 16
  { week: 28, name: 'Newcastle (Lasota)', description: 'Drinking Water - 12 week booster', intervalDays: 84 },
  { week: 40, name: 'Newcastle (Lasota)', description: 'Drinking Water - 24 week booster', intervalDays: 84 },
  { week: 52, name: 'Newcastle (Lasota)', description: 'Drinking Water - 36 week booster', intervalDays: 84 },
  { week: 64, name: 'Newcastle (Lasota)', description: 'Drinking Water - 48 week booster', intervalDays: 84 },
  { week: 76, name: 'Newcastle (Lasota)', description: 'Drinking Water - 60 week booster', intervalDays: 84 },
  { week: 88, name: 'Newcastle (Lasota)', description: 'Drinking Water - 72 week booster', intervalDays: 84 },
  { week: 100, name: 'Newcastle (Lasota)', description: 'Drinking Water - 84 week booster', intervalDays: 84 },
  { week: 112, name: 'Newcastle (Lasota)', description: 'Drinking Water - 96 week booster', intervalDays: 84 },
];

// Types for health records
interface MortalityRecord {
  id: string;
  date: string;
  count: number;
  cause: string;
  notes: string;
}

interface VaccinationRecord {
  id: string;
  name: string;
  dateGiven: string;
  nextDue: string;
  notes: string;
  completed: boolean;
}

// Local storage keys
const MORTALITY_KEY = 'flock_mortality_records';
const VACCINATION_KEY = 'flock_vaccination_records';

const CAUSE_OPTIONS = ['Disease', 'Predator', 'Heat Stress', 'Old Age', 'Unknown', 'Other'];

const DEFAULT_VACCINATIONS = [
  { name: 'Newcastle Disease', intervalDays: 30 },
  { name: 'Gumboro (IBD)', intervalDays: 45 },
  { name: 'Fowl Pox', intervalDays: 90 },
  { name: ' Marek\'s Disease', intervalDays: 180 },
];

interface FlockHealthPageProps {
  highlightAction?: string | null;
  onActionComplete?: () => void;
}

export const FlockHealthPage = ({ highlightAction, onActionComplete }: FlockHealthPageProps) => {
  const [tab, setTab] = useState(0);
  const [mortalityDialogOpen, setMortalityDialogOpen] = useState(false);
  const [vaccinationDialogOpen, setVaccinationDialogOpen] = useState(false);
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [editingMortality, setEditingMortality] = useState<MortalityRecord | null>(null);
  const [editingVaccination, setEditingVaccination] = useState<VaccinationRecord | null>(null);
  const [editingTreatment, setEditingTreatment] = useState<TreatmentRecord | null>(null);
  
  // Highlight dialog state
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [highlightMessage, setHighlightMessage] = useState('');
  const healthSectionRef = useRef<HTMLDivElement>(null);
  
  // Handle highlight action from notifications
  useEffect(() => {
    if (highlightAction) {
      if (highlightAction === 'health' || highlightAction === 'vaccination') {
        setHighlightMessage('?? Please check your ?? Vaccination Schedule and record any vaccinations given to your flock. Go to the Health page and add vaccination records.');
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
  
  const handleScrollToHealth = () => {
    setHighlightOpen(false);
    healthSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (onActionComplete) {
      onActionComplete();
    }
  };

  // Mortality form state
  const [mortalityDate, setMortalityDate] = useState(new Date().toISOString().split('T')[0]);
  const [mortalityCount, setMortalityCount] = useState('');
  const [mortalityCause, setMortalityCause] = useState('');
  const [mortalityNotes, setMortalityNotes] = useState('');

  // Vaccination form state
  const [vaccName, setVaccName] = useState('');
  const [vaccDate, setVaccDate] = useState(new Date().toISOString().split('T')[0]);
  const [vaccNextDue, setVaccNextDue] = useState('');
  const [vaccNotes, setVaccNotes] = useState('');
  const [vaccCompleted, setVaccCompleted] = useState(false);

  // Treatment form state
  const [treatType, setTreatType] = useState('');
  const [treatProduct, setTreatProduct] = useState('');
  const [treatDate, setTreatDate] = useState(new Date().toISOString().split('T')[0]);
  const [treatDosage, setTreatDosage] = useState('');
  const [treatReason, setTreatReason] = useState('');
  const [treatDaysGiven, setTreatDaysGiven] = useState('');
  const [treatNotes, setTreatNotes] = useState('');

  const flockSettings = useFlockSettings();
  const treatmentRecords = useTreatmentRecords();
  const totalChickens = flockSettings.settings.totalChickens;
  const currentFlockSize = flockSettings.currentFlockSize;

  // Load mortality records from API
  const { mortalityRecords: apiMortalityRecords, totalMortality } = useMortalityRecords();

  // Load vaccination records from API
  const { vaccinationRecords: apiVaccinationRecords, completedVaccinations, addRecord: addVaccination, deleteRecord: deleteVaccination } = useVaccinations();

  // Use API data, fallback to localStorage for backwards compatibility
  const mortalityRecords = apiMortalityRecords?.length > 0 ? apiMortalityRecords : (useMemo(() => {
    const saved = localStorage.getItem(MORTALITY_KEY);
    return saved ? JSON.parse(saved) : [];
  }, []));

  // Load vaccination records from localStorage (for now, will migrate to API)
  const vaccinationRecords = useMemo(() => {
    const saved = localStorage.getItem(VACCINATION_KEY);
    if (saved) return JSON.parse(saved);
    
    // Start with empty records - user should add their actual vaccinations
    return [];
  }, []);

  // Calculate mortality statistics
  const mortalityStats = useMemo(() => {
    const totalMortality = mortalityRecords.reduce((sum, r: MortalityRecord) => sum + r.count, 0);
    const mortalityRate = currentFlockSize > 0 ? (totalMortality / currentFlockSize) * 100 : 0;
    const thisMonth = mortalityRecords.filter((r: MortalityRecord) => {
      const recordDate = new Date(r.date);
      const now = new Date();
      return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
    });
    const thisMonthMortality = thisMonth.reduce((sum: number, r: MortalityRecord) => sum + r.count, 0);
    
    return { totalMortality, mortalityRate, thisMonthMortality };
  }, [mortalityRecords, currentFlockSize]);

  // Check vaccination due dates
  const vaccinationAlerts = useMemo(() => {
    const today = new Date();
    return (vaccinationRecords as VaccinationRecord[]).map((v: VaccinationRecord) => {
      const dueDate = new Date(v.nextDue);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...v, daysUntilDue, isOverdue: daysUntilDue < 0, isDue: daysUntilDue <= 7 && daysUntilDue >= 0 };
    });
  }, [vaccinationRecords]);

  const flockAgeWeeks = flockSettings.getFlockAgeInWeeks();
  
  const vaccinationSchedule = useMemo(() => {
    // If flock start date is not set, return empty - user must configure it first
    if (!flockSettings.settings.flockStartDate) {
      return [];
    }
    
    const startDateStr = flockSettings.settings.flockStartDate;
    const startDate = new Date(startDateStr);
    const now = new Date();
    const currentWeek = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    
    // Get completed vaccination records, sorted by date (newest first)
    const completedRecords = (vaccinationRecords as VaccinationRecord[])
      .filter((r: VaccinationRecord) => r.completed && r.dateGiven)
      .sort((a: VaccinationRecord, b: VaccinationRecord) => 
        new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime()
      );
    
    // Calculate past vaccinations from schedule (up to week 16)
    // Using exact dates starting from March 18, 2025
    const pastVaccinations = VACCINATION_SCHEDULE
      .filter(v => v.week <= 16) // Show all weeks 0-16
      .map(v => {
        const expectedDate = new Date(startDate.getTime() + v.week * 7 * 24 * 60 * 60 * 1000);
        return {
          ...v,
          status: 'past' as const,
          expectedDate: expectedDate.toISOString().split('T')[0],
          dateGiven: expectedDate.toISOString().split('T')[0],
          isScheduled: true
        };
      });
    
    // Calculate future vaccinations based on last recorded vaccination + 90 days
    const futureVaccinations: any[] = [];
    if (completedRecords.length > 0) {
      const lastVacc = completedRecords[0];
      // Use the DATE GIVEN as base, not nextDue
      const lastDateGiven = new Date(lastVacc.dateGiven);
      
      // Generate next 6 vaccinations at 90-day intervals from date given
      for (let i = 1; i <= 6; i++) {
        const nextDate = new Date(lastDateGiven.getTime() + i * 90 * 24 * 60 * 60 * 1000);
        futureVaccinations.push({
          week: -1, // No week number for laying period
          name: 'Newcastle (Lasota)',
          description: '90-Day Booster',
          status: 'future' as const,
          expectedDate: nextDate.toISOString().split('T')[0],
          dateGiven: lastVacc.dateGiven,
          notes: '90-Day Booster',
          isScheduled: false
        });
      }
    }
    
    // Combine past and future
    return [...pastVaccinations, ...futureVaccinations];
  }, [flockSettings.settings.flockStartDate, vaccinationRecords]);

  // Get next vaccination from the schedule
  const nextVaccination = useMemo(() => {
    if (!vaccinationSchedule) return null;
    // Find the first future vaccination
    return vaccinationSchedule.find(v => v.status === 'future') || null;
  }, [vaccinationSchedule]);

  // Save mortality records
  const saveMortalityRecord = () => {
    const newRecord: MortalityRecord = {
      id: editingMortality?.id || `mortality-${Date.now()}`,
      date: mortalityDate,
      count: parseInt(mortalityCount) || 0,
      cause: mortalityCause,
      notes: mortalityNotes
    };

    let updated: MortalityRecord[];
    if (editingMortality) {
      updated = mortalityRecords.map((r: MortalityRecord) => r.id === editingMortality.id ? newRecord : r);
    } else {
      updated = [...mortalityRecords, newRecord];
    }

    localStorage.setItem(MORTALITY_KEY, JSON.stringify(updated));
    closeMortalityDialog();
  };

  // Save vaccination records to API
  const saveVaccinationRecord = async () => {
    // Auto-calculate next due date if not provided
    const nextDueDate = vaccNextDue || calculateNextDueDate(vaccName, vaccDate) || 
      new Date(new Date(vaccDate).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const newRecord = {
      name: vaccName,
      dateGiven: vaccDate,
      nextDue: nextDueDate,
      notes: vaccNotes,
    };

    try {
      // Save to API
      await addVaccination(newRecord);
    } catch (error) {
      console.error('Error saving vaccination to API:', error);
    }
    
    // Also save to localStorage for backwards compatibility
    const saved = localStorage.getItem(VACCINATION_KEY);
    let localRecords: VaccinationRecord[] = saved ? JSON.parse(saved) : [];
    
    const recordWithId: VaccinationRecord = {
      ...newRecord,
      id: editingVaccination?.id || `vacc-${Date.now()}`,
      completed: true
    };

    if (editingVaccination) {
      localRecords = localRecords.map((r: VaccinationRecord) => r.id === editingVaccination.id ? recordWithId : r);
    } else {
      localRecords = [...localRecords, recordWithId];
    }
    localStorage.setItem(VACCINATION_KEY, JSON.stringify(localRecords));
    closeVaccinationDialog();
  };

  // Delete mortality record
  const deleteMortalityRecord = (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      const updated = mortalityRecords.filter((r: MortalityRecord) => r.id !== id);
      localStorage.setItem(MORTALITY_KEY, JSON.stringify(updated));
    }
  };

  // Open/close dialogs
  const openMortalityDialog = (record?: MortalityRecord) => {
    if (record) {
      setEditingMortality(record);
      setMortalityDate(record.date);
      setMortalityCount(String(record.count));
      setMortalityCause(record.cause);
      setMortalityNotes(record.notes);
    } else {
      setEditingMortality(null);
      setMortalityDate(new Date().toISOString().split('T')[0]);
      setMortalityCount('');
      setMortalityCause('');
      setMortalityNotes('');
    }
    setMortalityDialogOpen(true);
  };

  const closeMortalityDialog = () => {
    setMortalityDialogOpen(false);
    setEditingMortality(null);
  };

  const openVaccinationDialog = (record?: VaccinationRecord) => {
    if (record) {
      setEditingVaccination(record);
      setVaccName(record.name);
      setVaccDate(record.dateGiven);
      setVaccNextDue(record.nextDue);
      setVaccNotes(record.notes);
      setVaccCompleted(record.completed);
    } else {
      setEditingVaccination(null);
      setVaccName('');
      setVaccDate(new Date().toISOString().split('T')[0]);
      setVaccNextDue('');
      setVaccNotes('');
      setVaccCompleted(false);
    }
    setVaccinationDialogOpen(true);
  };

  const closeVaccinationDialog = () => {
    setVaccinationDialogOpen(false);
    setEditingVaccination(null);
  };

  const openTreatmentDialog = (record?: TreatmentRecord) => {
    if (record) {
      setEditingTreatment(record);
      setTreatType(record.treatmentType);
      setTreatProduct(record.productName);
      setTreatDate(record.dateGiven);
      setTreatDosage(record.dosage);
      setTreatReason(record.reason);
      // Use the stored days given value
      setTreatDaysGiven(record.daysGiven || '');
      setTreatNotes(record.notes);
    } else {
      setEditingTreatment(null);
      setTreatType('');
      setTreatProduct('');
      setTreatDate(new Date().toISOString().split('T')[0]);
      setTreatDosage('');
      setTreatReason('');
      setTreatDaysGiven('');
      setTreatNotes('');
    }
    setTreatmentDialogOpen(true);
  };

  const closeTreatmentDialog = () => {
    setTreatmentDialogOpen(false);
    setEditingTreatment(null);
  };

  const saveTreatmentRecord = async () => {
    try {
      if (editingTreatment) {
        await treatmentRecords.updateRecord(editingTreatment.id, {
          treatmentType: treatType,
          productName: treatProduct,
          dateGiven: treatDate,
          dosage: treatDosage,
          reason: treatReason,
          daysGiven: treatDaysGiven,
          notes: treatNotes,
        });
      } else {
        await treatmentRecords.addRecord({
          treatmentType: treatType,
          productName: treatProduct,
          dateGiven: treatDate,
          dosage: treatDosage,
          reason: treatReason,
          daysGiven: treatDaysGiven,
          notes: treatNotes,
        });
      }
      closeTreatmentDialog();
    } catch (error: any) {
      console.error('Error saving treatment record:', error);
      alert('Error saving treatment: ' + (error.message || 'Unknown error'));
    }
  };

  const deleteTreatmentRecord = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this treatment record?')) {
      try {
        await treatmentRecords.deleteRecord(id);
      } catch (error) {
        console.error('Error deleting treatment record:', error);
      }
    }
  };

  // Auto-calculate next due date based on vaccine name
  const calculateNextDueDate = (vaccineName: string, dateGiven: string): string => {
    if (!vaccineName || !dateGiven) return '';
    
    const name = vaccineName.toLowerCase();
    
    // Determine interval based on vaccine type (in days)
    let intervalDays = 90; // Default 12 weeks
    
    if (name.includes('newcastle') && (name.includes('lasota') || name.includes('killed'))) {
      intervalDays = 90; // 12 weeks for Newcastle boosters
    } else if (name.includes('newcastle') && name.includes('hb1')) {
      intervalDays = 14; // 2 weeks for HB1 booster
    } else if (name.includes('gumboro') || name.includes('ibd')) {
      intervalDays = 14; // 2 weeks for Gumboro boosters
    } else if (name.includes('fowl') && name.includes('pox')) {
      intervalDays = 63; // 9 weeks for Fowl Pox
    } else if (name.includes('fowl') && name.includes('typhoid')) {
      intervalDays = 42; // 6 weeks for Fowl Typhoid boosters
    } else if (name.includes('marek')) {
      intervalDays = 180; // 26 weeks for Marek's
    } else if (name.includes('infectious bronchitis') || name.includes(' ib ')) {
      intervalDays = 56; // 8 weeks for IB
    } else if (name.includes('egg drop') || name.includes('eds')) {
      intervalDays = 84; // 12 weeks for EDS
    }
    
    const givenDate = new Date(dateGiven);
    const nextDue = new Date(givenDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    
    return nextDue.toISOString().split('T')[0];
  };

  // Handle vaccine name change - auto-calculate next due date
  const handleVaccNameChange = (name: string) => {
    setVaccName(name);
    // Auto-calculate next due date with default 12 weeks if no date given yet
    const dateToUse = vaccDate || new Date().toISOString().split('T')[0];
    const nextDue = calculateNextDueDate(name, dateToUse);
    if (nextDue) {
      setVaccNextDue(nextDue);
    }
  };

  // Handle date given change - auto-calculate next due date
  const handleVaccDateChange = (date: string) => {
    setVaccDate(date);
    if (vaccName && date) {
      const nextDue = calculateNextDueDate(vaccName, date);
      if (nextDue) {
        setVaccNextDue(nextDue);
      }
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'short', day: 'numeric' 
  });

  const getTreatmentColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'multivitamin': return 'warning';
      case 'deworming': return 'error';
      case 'antibiotic': return 'error';
      case 'probiotic': return 'success';
      case 'herbal': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box p={{ xs: 2, sm: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalHospital color="primary" /> Flock Health Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track mortality, vaccinations, and health records
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }} ref={healthSectionRef}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white', borderRadius: '12px' }}>
            <CardContent>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Current Flock Size</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>{currentFlockSize}</Typography>
              {totalChickens !== currentFlockSize && (
                <Typography variant="caption" color="text.secondary">
                  (Started with {totalChickens})
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ borderRadius: '12px' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Mortality</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: mortalityStats.totalMortality > 0 ? 'error.main' : 'success.main' }}>
                {mortalityStats.totalMortality}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {mortalityStats.mortalityRate.toFixed(1)}% of flock
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ borderRadius: '12px' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">This Month</Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {mortalityStats.thisMonthMortality}
              </Typography>
              <Typography variant="caption" color="text.secondary">deaths recorded</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ borderRadius: '12px', bgcolor: vaccinationAlerts.some((v: any) => v.isOverdue) ? 'error.light' : vaccinationAlerts.some((v: any) => v.isDue) ? 'warning.light' : 'success.light' }}>
            <CardContent>
              <Typography variant="body2" color={vaccinationAlerts.some((v: any) => v.isOverdue) ? 'error.dark' : vaccinationAlerts.some((v: any) => v.isDue) ? 'warning.dark' : 'success.dark'}>
                Vaccination Status
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {vaccinationAlerts.filter((v: any) => v.completed && !v.isOverdue).length}/{vaccinationAlerts.length}
              </Typography>
              <Typography variant="caption">
                {vaccinationAlerts.filter((v: any) => v.isOverdue).length} overdue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: '12px' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }} variant="scrollable" scrollButtons="auto">
          <Tab icon={<Vaccines />} label="Vaccines" />
          <Tab icon={<Healing />} label="Treatments" />
          <Tab icon={<School />} label="Training" />
          <Tab icon={<TrendingDown />} label="Mortality" />
        </Tabs>
      </Paper>

        {/* Mortality Tab */}
        {tab === 3 && (
          <Box p={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Mortality Records</Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => openMortalityDialog()}>
                Record Mortality
              </Button>
            </Box>

            {mortalityStats.totalMortality > 0 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                ?? Total of {mortalityStats.totalMortality} chickens have been lost. Consider reviewing your flock management practices.
              </Alert>
            )}

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Count</TableCell>
                    <TableCell>Cause</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mortalityRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No mortality records yet</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    mortalityRecords.map((record: MortalityRecord) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell><Chip label={record.count} color="error" size="small" /></TableCell>
                        <TableCell>{record.cause}</TableCell>
                        <TableCell>{record.notes || '-'}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => openMortalityDialog(record)}><Edit /></IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteMortalityRecord(record.id)}><Delete /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Vaccinations Tab (includes Schedule and Chart) */}
        {tab === 0 && (
          <Box p={3}>
            {/* ?? Vaccination Schedule Table */}
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>?? ?? Vaccination Schedule</Typography>
            
            {!flockSettings.settings.flockStartDate ? (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  ?? ?? Flock Start Date Not Set
                </Typography>
                <Typography variant="body2">
                  Please set your flock start date in Settings to see your personalized ?? Vaccination Schedule. 
                  The vaccination dates are calculated based on when your flock started, so they will be different for each farm.
                </Typography>
              </Alert>
            ) : (
              <>
                <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>?? Past Vaccinations (based on your flock start date: {flockSettings.settings.flockStartDate})</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.light' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Week</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Vaccine</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Description</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {VACCINATION_SCHEDULE.filter(v => v.week <= 52).map((v) => {
                        const vaccDate = new Date(new Date(flockSettings.settings.flockStartDate).getTime() + v.week * 7 * 24 * 60 * 60 * 1000);
                        const dateStr = vaccDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        const isPast = vaccDate <= new Date();
                        return (
                          <TableRow key={v.week + '-' + v.name} sx={{ bgcolor: isPast ? 'grey.50' : 'grey.100' }}>
                            <TableCell>{v.week}</TableCell>
                            <TableCell>{v.name}</TableCell>
                            <TableCell>{v.description}</TableCell>
                            <TableCell sx={{ fontWeight: isPast ? 400 : 600, color: isPast ? 'text.primary' : 'primary.main' }}>{dateStr}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

            {/* Future Vaccinations - 90 day intervals after week 16 */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>?? Future Vaccinations (90-day interval after week 16)</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'success.light' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Week</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Vaccine</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Description</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {VACCINATION_SCHEDULE.filter(v => v.week >= 16).map((v) => {
                      const week16Date = new Date(new Date(flockSettings.settings.flockStartDate).getTime() + 16 * 7 * 24 * 60 * 60 * 1000);
                      // For laying period, calculate 90-day intervals from week 16
                      const vaccDate = new Date(week16Date.getTime() + 90 * 24 * 60 * 60 * 1000);
                      const dateStr = vaccDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      const isFuture = vaccDate > new Date();
                      if (!isFuture) return null;
                      return (
                        <TableRow key={'future-' + v.week + '-' + v.name}>
                          <TableCell>16+</TableCell>
                          <TableCell>{v.name}</TableCell>
                          <TableCell>{v.description}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{dateStr}</TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Show additional 90-day boosters */}
                    {(() => {
                      const rows = [];
                      const today = new Date();
                      const week16Date = new Date(new Date(flockSettings.settings.flockStartDate).getTime() + 16 * 7 * 24 * 60 * 60 * 1000);
                      for (let i = 1; i <= 6; i++) {
                        const nextDate = new Date(week16Date.getTime() + (90 * i + 90) * 24 * 60 * 60 * 1000);
                        if (nextDate <= today) continue;
                        const dateStr = nextDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        rows.push(
                          <TableRow key={'booster-' + i}>
                            <TableCell>16+{(i * 12)}w</TableCell>
                            <TableCell>Newcastle (Lasota)</TableCell>
                            <TableCell>{i * 12} week booster</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'success.main' }}>{dateStr}</TableCell>
                          </TableRow>
                        );
                      }
                      return rows;
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

          </>
        )}

        </Box>
        )}

        {/* Farmer Training Tab */}
        {tab === 2 && (
          <Box p={3}>
            <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)', color: 'white', borderRadius: '12px' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>?? Comprehensive Farming Guide</Typography>
            </Paper>

            {/* Table of Contents */}
            <Accordion defaultExpanded sx={{ mb: 3, borderRadius: '12px', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: 'grey.100', borderRadius: '12px' }}>
                <Typography sx={{ fontWeight: 600 }}>?? Table of Contents</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <List dense>
                      <ListItem><ListItemText primary="1. Brooding Stage (Day 1 - Week 2)" /></ListItem>
                      <ListItem><ListItemText primary="2. Grower Stage (Week 3 - Week 8)" /></ListItem>
                      <ListItem><ListItemText primary="3. Pre-Layer & Laying Stage (Week 9 - 18)" /></ListItem>
                      <ListItem><ListItemText primary="4. Peak Production (Week 22 - 40)" /></ListItem>
                      <ListItem><ListItemText primary="5. Vaccination Guide" /></ListItem>
                    </List>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <List dense>
                      <ListItem><ListItemText primary="6. Common Diseases & Prevention" /></ListItem>
                      <ListItem><ListItemText primary="7. Biosecurity Measures" /></ListItem>
                      <ListItem><ListItemText primary="8. Nutrition & Feeding" /></ListItem>
                      <ListItem><ListItemText primary="9. Record Keeping" /></ListItem>
                      <ListItem><ListItemText primary="10. Best Practices" /></ListItem>
                    </List>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? BROODING STAGE (Day 1 - Week 2)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Temperature Management:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Day 1-7: Keep temperature at 33-35?C (90-95?F) at chick level" /></ListItem>
                  <ListItem><ListItemText primary="Day 8-14: Reduce temperature by 2-3?C per week to 30-32?C" /></ListItem>
                  <ListItem><ListItemText primary="Use brooder guards to prevent chicks from wandering far from heat" /></ListItem>
                  <ListItem><ListItemText primary="Observe chick behavior - spreading out = too hot, huddling = too cold" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Feeding & Watering:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Provide clean, fresh water immediately upon arrival" /></ListItem>
                  <ListItem><ListItemText primary="Use chick starter feed with 20-22% protein for first 6 weeks" /></ListItem>
                  <ListItem><ListItemText primary="Feed should be available 24/7 - chicks eat little but often" /></ListItem>
                  <ListItem><ListItemText primary="Use shallow trays or paper under feeders for easy access" /></ListItem>
                  <ListItem><ListItemText primary="Add glucose or electrolytes to water for first 3 days" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Lighting:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Provide 23-24 hours of light for first week" /></ListItem>
                  <ListItem><ListItemText primary="Use 60-watt bulb per 100 chicks" /></ListItem>
                  <ListItem><ListItemText primary="Light should be at chick level, not overhead" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Key Tips:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Check chicks every 2-3 hours, especially first 48 hours" /></ListItem>
                  <ListItem><ListItemText primary="Vaccinate for Marek's Disease and Newcastle at day old" /></ListItem>
                  <ListItem><ListItemText primary="Keep litter dry - wet litter causes coccidiosis" /></ListItem>
                  <ListItem><ListItemText primary="Never restrict water or feed - this stunts growth permanently" /></ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? GROWER STAGE (Week 3 - Week 8)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Feeding:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Switch to grower feed at week 6 (16-18% protein)" /></ListItem>
                  <ListItem><ListItemText primary="Feed consumption: 60-80g per bird per day" /></ListItem>
                  <ListItem><ListItemText primary="Ensure feeders have enough space - 4cm per bird" /></ListItem>
                  <ListItem><ListItemText primary="Provide clean water at all times - 2cm drinking space per bird" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Housing & Space:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Space requirement: 375 cm? per bird at 6 weeks" /></ListItem>
                  <ListItem><ListItemText primary="Increase space gradually as birds grow" /></ListItem>
                  <ListItem><ListItemText primary="Maintain good ventilation but avoid drafts" /></ListItem>
                  <ListItem><ListItemText primary="Keep litter dry and turn regularly" /></ListItem>
                  <ListItem><ListItemText primary="Provide perches from week 4 for leg development" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>?? Vaccination Schedule:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Week 1: Gumboro (IBD) - drinking water" /></ListItem>
                  <ListItem><ListItemText primary="Week 2: Gumboro Booster - drinking water" /></ListItem>
                  <ListItem><ListItemText primary="Week 3: Newcastle (Lasota) - eye drop or drinking water" /></ListItem>
                  <ListItem><ListItemText primary="Week 4: Fowl Pox - wing stick (if needed)" /></ListItem>
                  <ListItem><ListItemText primary="Week 7: Newcastle Booster" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Health Monitoring:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Watch for signs of respiratory disease (coughing, sneezing)" /></ListItem>
                  <ListItem><ListItemText primary="Check droppings daily - green/ watery = problem" /></ListItem>
                  <ListItem><ListItemText primary="Isolate sick birds immediately" /></ListItem>
                  <ListItem><ListItemText primary=" Weigh birds weekly - should gain 100g per week" /></ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? HOUSING & ENVIRONMENT FOR KENYA CLIMATE</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Understanding Kenya's Climate Challenges:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Kenya's moderate to hot climate (15-30?C) requires special attention to ventilation and cooling" /></ListItem>
                  <ListItem><ListItemText primary="High altitudes (e.g., Nairobi at 1,795m) are ideal - natural cooling works well" /></ListItem>
                  <ListItem><ListItemText primary="Coastal regions (Mombasa, 30?C+) need aggressive cooling measures" /></ListItem>
                  <ListItem><ListItemText primary="Rainy seasons require excellent litter management to prevent disease" /></ListItem>
                </List>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>House Design Essentials:</Typography>
                <List dense>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Orientation: East-West to minimize direct sunlight exposure" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Side walls should be 1.2-1.5m high with mesh above for ventilation" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Roof height: 2.5-3m for good air circulation" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Use reflective roofing materials (white/metal) to reduce heat" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Overhangs: 1m to shade walls and prevent rain entry" /></ListItem>
                </List>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Ventilation Systems:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Natural ventilation: openings on both sides, 20-30% of floor area" /></ListItem>
                  <ListItem><ListItemText primary="Use fans in hot areas (400mm diameter, 1 per 500 birds)" /></ListItem>
                  <ListItem><ListItemText primary="Evaporative cooling pads in extremely hot regions" /></ListItem>
                  <ListItem><ListItemText primary="Cross-ventilation is critical - install curtains that can be raised/lowered" /></ListItem>
                  <ListItem><ListItemText primary="Monitor temperature and humidity daily - ideal: 18-24?C, 50-70% humidity" /></ListItem>
                </List>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Litter Management (Kenya Conditions):</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Use wood shavings, straw, or dried grass as litter material" /></ListItem>
                  <ListItem><ListItemText primary="Initial litter depth: 10-15cm" /></ListItem>
                  <ListItem><ListItemText primary="Turn litter weekly - wet litter causes coccidiosis and respiratory problems" /></ListItem>
                  <ListItem><ListItemText primary="Replace litter completely between flocks" /></ListItem>
                  <ListItem><ListItemText primary="In rainy season, add more litter more frequently" /></ListItem>
                  <ListItem><ListItemText primary="Good litter = birds dust bathing, not sitting on wet spots" /></ListItem>
                </List>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Equipment Space Requirements:</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Equipment</TableCell>
                        <TableCell>Space per Bird</TableCell>
                        <TableCell>Notes for Kenya</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow><TableCell>Feeders</TableCell><TableCell>4-6 cm</TableCell><TableCell>Tube feeders work well</TableCell></TableRow>
                      <TableRow><TableCell>Waterers</TableCell><TableCell>2 cm</TableCell><TableCell>Nipple drinkers save water</TableCell></TableRow>
                      <TableRow><TableCell>Nest Boxes</TableCell><TableCell>4 hens/box</TableCell><TableCell>Community nests OK</TableCell></TableRow>
                      <TableRow><TableCell>Perches</TableCell><TableCell>15-20 cm</TableCell><TableCell>Essential for layers</TableCell></TableRow>
                      <TableRow><TableCell>Floor Space</TableCell><TableCell>450 cm?</TableCell><TableCell>Cage: 450 cm? minimum</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Heat Stress Alert:</strong> When temperatures exceed 28?C, implement cooling immediately. Provide cool water, increase ventilation, and consider misting systems. Heat stress can reduce production by 20-40% and cause death.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? PRE-LAYER & LAYING STAGE (Week 9 - 18)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Transition to Layer Feed:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Switch to layer feed at week 18 or at 5% egg production" /></ListItem>
                  <ListItem><ListItemText primary="Layer feed should contain 16-17% protein and 3.5-4.5% calcium" /></ListItem>
                  <ListItem><ListItemText primary="Calcium is critical for eggshell formation" /></ListItem>
                  <ListItem><ListItemText primary="Feed consumption: 110-120g per hen per day" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Housing for Layers:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Provide 15cm feeding space per hen" /></ListItem>
                  <ListItem><ListItemText primary="Minimum 4 hens per nest box" /></ListItem>
                  <ListItem><ListItemText primary="Light day length should be 14-16 hours for production" /></ListItem>
                  <ListItem><ListItemText primary="Cage density: 450 cm? per bird minimum" /></ListItem>
                  <ListItem><ListItemText primary="Keep temperature between 18-24?C for best production" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Pre-Lay Vaccinations:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Week 16: Newcastle (Lasota) booster" /></ListItem>
                  <ListItem><ListItemText primary="Week 16: Infectious Bronchitis (IB) booster" /></ListItem>
                  <ListItem><ListItemText primary="Week 18: Avian Influenza (H5/H7) if required by law" /></ListItem>
                </List>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>First Eggs:</strong> Hens will start laying at around 18-20 weeks. First eggs may be small (pullet eggs) - this is normal! Production will increase over the next 4-6 weeks.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? PEAK PRODUCTION MANAGEMENT (Week 22 - 40)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Achieving 90%+ Production:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Peak production (90-95%) occurs at weeks 28-32" /></ListItem>
                  <ListItem><ListItemText primary="Maintain consistent 14-16 hours of light daily" /></ListItem>
                  <ListItem><ListItemText primary="Keep feed and water available 24/7" /></ListItem>
                  <ListItem><ListItemText primary="Monitor feed consumption - sudden drop = problem!" /></ListItem>
                  <ListItem><ListItemText primary="Egg weight increases until week 40" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Daily Routine:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Collect eggs 2-3 times daily to prevent breakage" /></ListItem>
                  <ListItem><ListItemText primary="Check water lines for blockages twice daily" /></ListItem>
                  <ListItem><ListItemText primary="Observe birds while feeding - active appetite = healthy" /></ListItem>
                  <ListItem><ListItemText primary="Record egg production daily - track trends!" /></ListItem>
                  <ListItem><ListItemText primary="Remove dead eggs and check for blood spots" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Maintaining Production:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Do NOT change feed suddenly - causes stress" /></ListItem>
                  <ListItem><ListItemText primary="Avoid moving birds during production" /></ListItem>
                  <ListItem><ListItemText primary="Keep noise and disturbances to minimum" /></ListItem>
                  <ListItem><ListItemText primary="Ventilation is critical - poor air = reduced production" /></ListItem>
                  <ListItem><ListItemText primary="Maintain consistent temperature - heat stress hurts production" /></ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? VACCINATION GUIDE FOR LAYERS</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Why Vaccinate?</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Prevents deadly diseases that can wipe out entire flock" /></ListItem>
                  <ListItem><ListItemText primary="Reduces mortality and production losses" /></ListItem>
                  <ListItem><ListItemText primary="Many diseases have NO treatment - only prevention" /></ListItem>
                  <ListItem><ListItemText primary="Some diseases are zoonotic (can spread to humans)" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Critical Vaccines:</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Age</TableCell>
                        <TableCell>Vaccine</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow><TableCell>Day 1</TableCell><TableCell>Newcastle (B1)</TableCell><TableCell>Eye drop</TableCell><TableCell>At hatchery</TableCell></TableRow>
                      <TableRow><TableCell>Day 1</TableCell><TableCell>Marek's</TableCell><TableCell>Injection</TableCell><TableCell>At hatchery</TableCell></TableRow>
                      <TableRow><TableCell>Week 1</TableCell><TableCell>Gumboro</TableCell><TableCell>Drinking water</TableCell><TableCell>First IBD</TableCell></TableRow>
                      <TableRow><TableCell>Week 2</TableCell><TableCell>Gumboro Booster</TableCell><TableCell>Drinking water</TableCell><TableCell>Second IBD</TableCell></TableRow>
                      <TableRow><TableCell>Week 3</TableCell><TableCell>Newcastle (Lasota)</TableCell><TableCell>Eye drop/drinking</TableCell><TableCell>First Lasota</TableCell></TableRow>
                      <TableRow><TableCell>Week 7</TableCell><TableCell>Newcastle (Lasota)</TableCell><TableCell>Drinking water</TableCell><TableCell>Booster</TableCell></TableRow>
                      <TableRow><TableCell>Week 16</TableCell><TableCell>Newcastle (Killed)</TableCell><TableCell>Injection</TableCell><TableCell>Pre-layer</TableCell></TableRow>
                      <TableRow><TableCell>Every 90 days</TableCell><TableCell>Newcastle (Lasota)</TableCell><TableCell>Drinking water</TableCell><TableCell>Throughout lay</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Important:</strong> After each vaccination, monitor birds for 24-48 hours. Some mild reactions are normal. Contact a vet if birds show severe symptoms.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? COMMON DISEASES & PREVENTION</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="error" gutterBottom>Newcastle Disease (ND):</Typography>
                <List dense>
                  <ListItem><ListItemText primary="SYMPTOMS: Green diarrhea, respiratory signs, twisted neck, eggs drop, mortality" /></ListItem>
                  <ListItem><ListItemText primary="PREVENTION: Vaccinate regularly, biosecurity, don't visit other farms" /></ListItem>
                  <ListItem><ListItemText primary="MORTALITY: Can reach 100% in unvaccinated flocks" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="error" gutterBottom sx={{ mt: 2 }}>Gumboro (Infectious Bursal Disease):</Typography>
                <List dense>
                  <ListItem><ListItemText primary="SYMPTOMS: Watery diarrhea, ruffled feathers, trembling, mortality 20-30%" /></ListItem>
                  <ListItem><ListItemText primary="PREVENTION: Vaccinate at 1 and 2 weeks, keep litter dry" /></ListItem>
                  <ListItem><ListItemText primary="ATTACKS immune system - makes birds vulnerable to other diseases" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="error" gutterBottom sx={{ mt: 2 }}>Fowl Pox:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="SYMPTOMS: Warts on comb/wattles (dry form), diphtheritic membrane in mouth (wet form)" /></ListItem>
                  <ListItem><ListItemText primary="PREVENTION: Vaccination at 2-4 weeks via wing stick" /></ListItem>
                  <ListItem><ListItemText primary="MORTALITY: Up to 50% in wet form" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="error" gutterBottom sx={{ mt: 2 }}>Coccidiosis:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="SYMPTOMS: Bloo?? diarrhea, ruffled feathers, weight loss, mortality in young birds" /></ListItem>
                  <ListItem><ListItemText primary="PREVENTION: Keep litter dry, use coccidiostats in feed, good ventilation" /></ListItem>
                  <ListItem><ListItemText primary="TREATMENT: Amprolium (Coccidiostats) in water for 5-7 days" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="error" gutterBottom sx={{ mt: 2 }}>Infectious Bronchitis (IB):</Typography>
                <List dense>
                  <ListItem><ListItemText primary="SYMPTOMS: Respiratory signs, eggs drop sharply, thin/ abnormal shells" /></ListItem>
                  <ListItem><ListItemText primary="PREVENTION: Vaccination, biosecurity" /></ListItem>
                  <ListItem><ListItemText primary="IMPACT: Can cause permanent kidney damage and production loss" /></ListItem>
                </List>
                
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>EMERGENCY:</strong> If you see sudden death, respiratory distress, or production drops more than 20%, contact a veterinarian immediately! Early intervention saves flocks.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>??? BIOSECURITY - PROTECT YOUR FLOCK</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>The Golden Rules:</Typography>
                <List dense>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Change clothes and wash hands before entering bird area" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Use foot dip at entrance - change disinfectant daily" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Don't visit other poultry farms on the same day" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Quarantine new birds for 2-4 weeks before adding to flock" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Control rodents and insects - they carry disease" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Remove dead birds immediately - incinerate or bury deep" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Don't allow visitors near birds without biosecurity measures" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Clean and disinfect equipment between uses" /></ListItem>
                </List>
                
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Most diseases enter farms on:</strong> Contaminated shoes, equipment, wild birds, rodents, and by visitors who don't follow biosecurity rules.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? NUTRITION & FEEDING FOR PRODUCTION</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Feed Types:</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Feed Type</TableCell>
                        <TableCell>Protein</TableCell>
                        <TableCell>When to Use</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow><TableCell>Chick Starter</TableCell><TableCell>20-22%</TableCell><TableCell>Day 1 - Week 6</TableCell></TableRow>
                      <TableRow><TableCell>Grower</TableCell><TableCell>16-18%</TableCell><TableCell>Week 6 - Week 18</TableCell></TableRow>
                      <TableRow><TableCell>Layer</TableCell><TableCell>16-17%</TableCell><TableCell>Week 18+</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Water Requirements:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Hens drink 1.5-2x the amount of feed they eat" /></ListItem>
                  <ListItem><ListItemText primary="Clean water is essential - dirty water = poor production" /></ListItem>
                  <ListItem><ListItemText primary="Water should be at room temperature in winter" /></ListItem>
                  <ListItem><ListItemText primary="Provide 1 nipple or 2cm bell drinker per 10 hens" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Critical Nutrients:</Typography>
                <List dense>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Calcium: Essential for eggshells - provide oyster shell separately" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Phosphorus: Works with calcium for bone and eggshell" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Protein: For egg white (albumen) production" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Vitamins A, D, E, B-complex: For health and reproduction" /></ListItem>
                </List>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Tip:</strong> Always have fresh oyster shell/grit available in a separate feeder. Hens will consume what they need for eggshell quality.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? RECORD KEEPING FOR SUCCESS</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Essential Daily Records:</Typography>
                <List dense>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Number of eggs collected (by grade)" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Feed consumed (bags or kg)" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Water consumption (normal or low?)" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Mortality count and cause if known" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Vaccinations given" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Medicines/ treatments given" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Any unusual observations" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Weekly Records:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Bird weight (sample 50-100 birds)" /></ListItem>
                  <ListItem><ListItemText primary="Feed conversion ratio calculation" /></ListItem>
                  <ListItem><ListItemText primary="Egg production percentage" /></ListItem>
                  <ListItem><ListItemText primary="Egg weight (sample)" /></ListItem>
                  <ListItem><ListItemText primary="Mortality rate calculation" /></ListItem>
                </List>
                
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Why Records Matter:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Track performance trends over time" /></ListItem>
                  <ListItem><ListItemText primary="Identify problems early before they become serious" /></ListItem>
                  <ListItem><ListItemText primary="Calculate profits and losses accurately" /></ListItem>
                  <ListItem><ListItemText primary="Make informed decisions based on data" /></ListItem>
                  <ListItem><ListItemText primary="Required for veterinary consultations" /></ListItem>
                </List>
                
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Pro Tip:</strong> Use this app to record all your data! It tracks mortality, vaccinations, collections, and generates reports automatically. Good records = better profits.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? BEST PRACTICES FOR MAXIMUM PRODUCTION</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">1</Typography></ListItemIcon>
                    <ListItemText primary="Buy quality day-old chicks from reputable hatcheries - healthy start = productive flock" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">2</Typography></ListItemIcon>
                    <ListItemText primary="Follow ?? Vaccination Schedule strictly - it's your insurance policy" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">3</Typography></ListItemIcon>
                    <ListItemText primary="Provide fresh feed and water 24/7 - never let feeders run empty" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">4</Typography></ListItemIcon>
                    <ListItemText primary="Maintain 14-16 hours of consistent light daily for layers" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">5</Typography></ListItemIcon>
                    <ListItemText primary="Keep temperature between 18-24?C - heat/cold stress reduces eggs" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">6</Typography></ListItemIcon>
                    <ListItemText primary="Good ventilation is essential - fresh air without drafts" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">7</Typography></ListItemIcon>
                    <ListItemText primary="Practice strict biosecurity - prevention is cheaper than cure" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">8</Typography></ListItemIcon>
                    <ListItemText primary="Record everything - you can't manage what you don't measure" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">9</Typography></ListItemIcon>
                    <ListItemText primary="Collect eggs 2-3 times daily - prevents breakage and eating" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">10</Typography></ListItemIcon>
                    <ListItemText primary="Know your birds - daily observation catches problems early" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">11</Typography></ListItemIcon>
                    <ListItemText primary="Replace flock at 72-78 weeks - production drops, feed cost rises" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Typography color="primary" fontWeight="bold">12</Typography></ListItemIcon>
                    <ListItemText primary="Work with a veterinarian - preventative care saves money" />
                  </ListItem>
                </List>
                
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Remember:</strong> Egg production is a numbers game. Every 1% increase in production = more profit. Follow these practices consistently and your flock will reward you with high egg production!
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            {/* NEW: ECONOMICS & PROFITABILITY SECTION */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? ECONOMICS & PROFITABILITY IN KENYA</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Understanding Your Costs (Kenya 2025):</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Cost Item</TableCell>
                        <TableCell>Approximate Cost (KES)</TableCell>
                        <TableCell>% of Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow><TableCell>Day-old chicks (point of lay)</TableCell><TableCell>500-800</TableCell><TableCell>15-20%</TableCell></TableRow>
                      <TableRow><TableCell>Feed (per layer/year)</TableCell><TableCell>3,000-4,000</TableCell><TableCell>50-60%</TableCell></TableRow>
                      <TableRow><TableCell>Vaccinations & Medicine</TableCell><TableCell>300-500</TableCell><TableCell>5-8%</TableCell></TableRow>
                      <TableRow><TableCell>Electricity & Water</TableCell><TableCell>200-400</TableCell><TableCell>3-5%</TableCell></TableRow>
                      <TableRow><TableCell>Labor</TableCell><TableCell>500-1,000</TableCell><TableCell>10-15%</TableCell></TableRow>
                      <TableRow><TableCell>Other (bedding, equipment)</TableCell><TableCell>200-400</TableCell><TableCell>3-5%</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>Revenue Streams:</Typography>
                <List dense>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Egg Sales: 280-320 eggs/layer/year @ KES 12-15 per egg = KES 3,360-4,800" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Spent Hens: KES 200-400 per bird at 72 weeks" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Manure: KES 50-100 per bag - excellent organic fertilizer" /></ListItem>
                </List>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>Key Profitability Metrics:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="<strong>Feed Conversion Ratio (FCR):</strong> 1.6-2.0 kg feed per kg eggs - lower is better" /></ListItem>
                  <ListItem><ListItemText primary="<strong>Egg Production %:</strong> 75-90% peak production target" /></ListItem>
                  <ListItem><ListItemText primary="<strong>Mortality Rate:</strong> Should be under 5% annually" /></ListItem>
                  <ListItem><ListItemText primary="<strong>Cost per Egg:</strong> KES 8-12 including all costs" /></ListItem>
                  <ListItem><ListItemText primary="<strong>Profit per Egg:</strong> KES 3-5 at market price of KES 12-15" /></ListItem>
                </List>

                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Breakeven Analysis:</strong> With 500 layers, you need approximately KES 2,000,000 total investment. At 85% production selling at KES 14/egg, monthly revenue is ~KES 178,500. Breakeven typically occurs in 12-18 months.
                  </Typography>
                </Alert>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>Cost Reduction Strategies:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Buy feed in bulk - 50kg bag prices drop significantly at 10+ bags" /></ListItem>
                  <ListItem><ListItemText primary="Grow your own greens for supplemental feeding (kales, spinach)" /></ListItem>
                  <ListItem><ListItemText primary="Use solar power for lighting to reduce electricity costs" /></ListItem>
                  <ListItem><ListItemText primary="Practice perfect biosecurity to avoid disease treatment costs" /></ListItem>
                  <ListItem><ListItemText primary="Negotiate group discounts for vaccines and supplies" /></ListItem>
                  <ListItem><ListItemText primary="Sell directly to consumers/hotels for better margins" /></ListItem>
                </List>
              </AccordionDetails>
            </Accordion>

            {/* NEW: HEAT STRESS MANAGEMENT */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>??? HEAT STRESS MANAGEMENT (KENYA CLIMATE)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="error" gutterBottom>Understanding Heat Stress:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Chickens don't sweat - they pant to cool down" /></ListItem>
                  <ListItem><ListItemText primary="Optimal temperature: 18-24?C - above 28?C, production drops" /></ListItem>
                  <ListItem><ListItemText primary="Above 35?C, mortality can occur within hours" /></ListItem>
                  <ListItem><ListItemText primary="Heat stress affects feed intake, egg size, and shell quality" /></ListItem>
                </List>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Warning Signs to Watch:</Typography>
                <List dense>
                  <ListItem><ListItemIcon><WarningIcon color="warning" /></ListItemIcon><ListItemText primary="Panting (open-mouth breathing)" /></ListItem>
                  <ListItem><ListItemIcon><WarningIcon color="warning" /></ListItemIcon><ListItemText primary="Wings spread out, feathers ruffled" /></ListItem>
                  <ListItem><ListItemIcon><WarningIcon color="warning" /></ListItemIcon><ListItemText primary="Reduced feed intake, increased water consumption" /></ListItem>
                  <ListItem><ListItemIcon><WarningIcon color="warning" /></ListItemIcon><ListItemText primary="Lethargy, birds gathering near walls" /></ListItem>
                  <ListItem><ListItemIcon><WarningIcon color="warning" /></ListItemIcon><ListItemText primary="Pale combs, thin eggshells" /></ListItem>
                  <ListItem><ListItemIcon><WarningIcon color="warning" /></ListItemIcon><ListItemText primary="Sudden death with wings and legs extended" /></ListItem>
                </List>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Prevention Strategies:</Typography>
                <List dense>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Install fans or evaporative cooling pads" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Provide shade trees or reflective roofing" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Ensure constant cool water supply - change twice daily" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Feed during cooler hours (early morning, evening)" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Add electrolytes to drinking water during hot periods" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Vitamin C (100-200mg/L) helps birds cope with heat" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Avoid handling birds during hottest hours" /></ListItem>
                </List>

                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Emergency Response:</strong> If birds are heat-stressed, immediately spray with cool (not cold) water, provide electrolyte water, increase ventilation, and remove dead birds. Do not use ice water - causes shock.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            {/* NEW: TROUBLESHOOTING GUIDE */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? COMMON PROBLEMS & TROUBLESHOOTING</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Egg Production Problems:</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Problem</TableCell>
                        <TableCell>Possible Cause</TableCell>
                        <TableCell>Solution</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Sudden drop in eggs</TableCell>
                        <TableCell>Heat stress, disease, predators</TableCell>
                        <TableCell>Check temperature, examine birds, check for predators</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Eggs too small</TableCell>
                        <TableCell>Young pullets, poor nutrition</TableCell>
                        <TableCell>Wait for maturity, improve feed protein</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Thin/soft shells</TableCell>
                        <TableCell>Calcium deficiency, heat stress</TableCell>
                        <TableCell>Add oyster shell, check temperature</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Blood on eggs</TableCell>
                        <TableCell>New layer, vent pecking</TableCell>
                        <TableCell>Normal for first eggs, check for cannibalism</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Misshapen eggs</TableCell>
                        <TableCell>Disease, stress, calcium issues</TableCell>
                        <TableCell>Check for disease, reduce stress</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>Health Problems:</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Symptom</TableCell>
                        <TableCell>Possible Cause</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Green diarrhea</TableCell>
                        <TableCell>Newcastle, Salmonella</TableCell>
                        <TableCell>Isolate, call vet immediately</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Blood in droppings</TableCell>
                        <TableCell>Coccidiosis</TableCell>
                        <TableCell>Amprolium treatment, dry litter</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Coughing, sneezing</TableCell>
                        <TableCell>IB, Mycoplasma, Newcastle</TableCell>
                        <TableCell>Isolate, vet consultation</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Twisted neck</TableCell>
                        <TableCell>Newcastle, Vitamin E deficiency</TableCell>
                        <TableCell>Emergency vet care</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Lameness</TableCell>
                        <TableCell>Marek's, injury, gout</TableCell>
                        <TableCell>Separate, check for Marek's</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Loss of appetite</TableCell>
                        <TableCell>Many causes</TableCell>
                        <TableCell>Check water first, then observe</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 3 }}>Feed & Water Problems:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="<strong>Feed not being consumed:</strong> Check feeder position, freshness, and water availability" /></ListItem>
                  <ListItem><ListItemText primary="<strong>Water not being drunk:</strong> Check waterer height, cleanliness, and water temperature" /></ListItem>
                  <ListItem><ListItemText primary="<strong>Feed waste:</strong> Adjust feeder height, use proper feeders" /></ListItem>
                  <ListItem><ListItemText primary="<strong>Poor growth:</strong> Check feed quality, protein level, and for parasites" /></ListItem>
                </List>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>When in Doubt:</strong> Always consult with a qualified veterinarian. Early intervention saves birds and money. Keep your local vet's number han?? at all times.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            {/* NEW: MARKETING & SALES */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? MARKETING & SELLING YOUR EGGS IN KENYA</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Understanding the Kenya Egg Market:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Nairobi market: Highest demand, premium prices (KES 14-18/egg)" /></ListItem>
                  <ListItem><ListItemText primary="Mombasa: Good demand, slightly lower prices (KES 12-15/egg)" /></ListItem>
                  <ListItem><ListItemText primary="Kisumu/Eldoret: Growing markets, KES 10-14/egg" /></ListItem>
                  <ListItem><ListItemText primary="Rural areas: Lower prices but less competition" /></ListItem>
                </List>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Market Channels:</Typography>
                <List dense>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="<strong>Hotels & Restaurants:</strong> Stea?? orders, negotiate contracts" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="<strong>Supermarkets:</strong> Consistent volume, may require supply agreements" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="<strong>Hawkers & Resellers:</strong> Lower margins but larger volumes" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="<strong>Farmers Markets:</strong> Best margins, build loyal customer base" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="<strong>Direct to Consumers:</strong> Use WhatsApp groups and social media" /></ListItem>
                </List>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Egg Grading for Market:</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Grade</TableCell>
                        <TableCell>Weight</TableCell>
                        <TableCell>Price (KES)</TableCell>
                        <TableCell>Best For</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow><TableCell>Extra Large</TableCell><TableCell>65g+</TableCell><TableCell>15-20</TableCell><TableCell>Hotels, exports</TableCell></TableRow>
                      <TableRow><TableCell>Large</TableCell><TableCell>55-64g</TableCell><TableCell>13-16</TableCell><TableCell>Supermarkets</TableCell></TableRow>
                      <TableRow><TableCell>Medium</TableCell><TableCell>45-54g</TableCell><TableCell>10-13</TableCell><TableCell>Wholesale</TableCell></TableRow>
                      <TableRow><TableCell>Small/Pulet</TableCell><TableCell>&lt;45g</TableCell><TableCell>8-10</TableCell><TableCell>Local markets</TableCell></TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Building Your Brand:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Use clean, attractive packaging - branded cartons sell better" /></ListItem>
                  <ListItem><ListItemText primary="Grade your eggs consistently - customers value uniformity" /></ListItem>
                  <ListItem><ListItemText primary="Maintain freshness - collect eggs daily, refrigerate if storing" /></ListItem>
                  <ListItem><ListItemText primary="Build relationships with regular buyers" /></ListItem>
                  <ListItem><ListItemText primary="Consider free range or organic premium positioning" /></ListItem>
                  <ListItem><ListItemText primary="Use social media to showcase your farm and build trust" /></ListItem>
                </List>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Pro Tip:</strong> Join Kenya Poultry Farmers Association or local farmer groups. Collective marketing and bulk buying improve profits significantly.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            {/* NEW: WATER MANAGEMENT */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>?? WATER MANAGEMENT ESSENTIALS</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" color="primary" gutterBottom>Water Requirements for Layers:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Hens consume 1.5-2 liters per day per 100 birds" /></ListItem>
                  <ListItem><ListItemText primary="Water intake increases 1.5x during hot weather" /></ListItem>
                  <ListItem><ListItemText primary="Egg is 75% water - poor water = poor egg production" /></ListItem>
                  <ListItem><ListItemText primary="Feed conversion improves with clean, cool water" /></ListItem>
                </List>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Water Quality Standards:</Typography>
                <List dense>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="pH: 6.5-7.5 (neutral)" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Bacteria: Zero coliforms per 100ml" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Clean, clear, no odor" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Nitrates: Less than 50mg/L" /></ListItem>
                  <ListItem><ListItemIcon><CheckCircle color="primary" /></ListItemIcon><ListItemText primary="Hardness: Less than 180mg/L calcium" /></ListItem>
                </List>

                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>Water System Management:</Typography>
                <List dense>
                  <ListItem><ListItemText primary="Clean waterers daily - scrub with disinfectant weekly" /></ListItem>
                  <ListItem><ListItemText primary="Check nipple drinkers for leaks and blockages twice weekly" /></ListItem>
                  <ListItem><ListItemText primary="Flush water lines monthly to prevent biofilm buildup" /></ListItem>
                  <ListItem><ListItemText primary="In hot areas, use black pipes underground to keep water cool" /></ListItem>
                  <ListItem><ListItemText primary="Install water filters if supply is questionable" /></ListItem>
                  <ListItem><ListItemText primary="Have backup water source for emergencies" /></ListItem>
                </List>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2"><strong>Critical:</strong> Never restrict water access - even short periods cause production drops that take weeks to recover. Always have backup water supply.
                  </Typography>
                </Alert>
              </AccordionDetails>
            </Accordion>

            {/* Footer - Author Attribution */}
            <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50', borderRadius: '12px', textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>About This Guide</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                This comprehensive farming guide is designed for small to medium layer operations in East Africa. 
                Follow these proven practices to maximize your egg production and flock health.
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  ?? Last Updated: 2025 | ?? For Kenya Climate
                </Typography>
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>?? Disclaimer:</strong> Always consult with a local veterinarian for specific advice. 
                  This guide provides general best practices - adjust based on your specific conditions and local regulations.
                </Typography>
              </Alert>
            </Paper>
          </Box>
        )}

      {/* Mortality Dialog */}
      <Dialog open={mortalityDialogOpen} onClose={closeMortalityDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingMortality ? 'Edit Mortality Record' : 'Record Mortality'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField 
              label="Date" 
              type="date" 
              value={mortalityDate} 
              onChange={(e) => setMortalityDate(e.target.value)} 
              fullWidth 
              required 
              slotProps={{ inputLabel: { shrink: true } }} 
            />
            <TextField 
              label="Number of Chickens" 
              type="number" 
              value={mortalityCount} 
              onChange={(e) => setMortalityCount(e.target.value)} 
              fullWidth 
              required 
              inputProps={{ min: 1 }}
              helperText={`Current flock size: ${currentFlockSize}`}
            />
            <FormControl fullWidth>
              <InputLabel>Cause</InputLabel>
              <Select value={mortalityCause} label="Cause" onChange={(e) => setMortalityCause(e.target.value)}>
                {CAUSE_OPTIONS.map(cause => (
                  <MenuItem key={cause} value={cause}>{cause}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField 
              label="Notes" 
              value={mortalityNotes} 
              onChange={(e) => setMortalityNotes(e.target.value)} 
              fullWidth 
              multiline 
              rows={2} 
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeMortalityDialog} variant="outlined">Cancel</Button>
          <Button onClick={saveMortalityRecord} variant="contained" disabled={!mortalityDate || !mortalityCount}>
            {editingMortality ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

        {/* Treatment Records Tab (includes Vaccinations) */}
        {tab === 1 && (
          <Box p={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Health & Treatments</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" color="primary" startIcon={<Vaccines />} onClick={() => openVaccinationDialog()}>
                  Add Vaccination
                </Button>
                <Button variant="contained" startIcon={<Add />} onClick={() => openTreatmentDialog()}>
                  Add Treatment
                </Button>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              ?? Record vaccinations and treatments like multivitamins, deworming, antibiotics, probiotics, and herbal remedies here.
            </Alert>

            {/* Vaccinations Section */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: '2' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>?? Vaccinations</Typography>
              {vaccinationAlerts.filter((v: any) => v.isOverdue).length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  ?? {vaccinationAlerts.filter((v: any) => v.isOverdue).length} vaccination(s) are overdue!
                </Alert>
              )}
              {(vaccinationRecords as VaccinationRecord[]).length === 0 ? (
                <Typography variant="body2" sx={{ color: 'primary.contrastText' }}>No vaccination records yet. Click "Add Vaccination" to record.</Typography>
              ) : (
                <List dense>
                  {(vaccinationRecords as VaccinationRecord[]).map((record: any) => (
                    <ListItem 
                      key={record.id}
                      sx={{ 
                        bgcolor: record.isOverdue ? 'error.light' : record.isDue ? 'warning.light' : 'rgba(255,255,255,0.1)',
                        borderRadius: 1,
                        mb: 0.5,
                        color: 'primary.contrastText'
                      }}
                    >
                      <ListItemIcon sx={{ color: 'primary.contrastText' }}>
                        {record.isOverdue ? <WarningIcon color="error" /> : record.isDue ? <Schedule color="warning" /> : <CheckCircle color="success" />}
                      </ListItemIcon>
                      <ListItemText 
                        primary={record.name}
                        secondary={`Given: ${formatDate(record.dateGiven)} ? Next: ${formatDate(record.nextDue)}`}
                      />
                      <IconButton size="small" onClick={() => openVaccinationDialog(record)} sx={{ color: 'primary.contrastText' }}><Edit /></IconButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            {/* Treatments Section */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>?? Treatments</Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Treatment Type</TableCell>
                    <TableCell>Product Name</TableCell>
                    <TableCell>Dosage</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Days Given</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {treatmentRecords.completedTreatments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No treatment records yet</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    treatmentRecords.completedTreatments.map((record: TreatmentRecord) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.dateGiven)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={record.treatmentType} 
                            color={getTreatmentColor(record.treatmentType)} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>{record.productName}</TableCell>
                        <TableCell>{record.dosage || '-'}</TableCell>
                        <TableCell>{record.reason || '-'}</TableCell>
                        <TableCell>{record.daysGiven ? `${record.daysGiven} days` : '-'}</TableCell>
                        <TableCell>{record.notes || '-'}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => openTreatmentDialog(record)}><Edit /></IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteTreatmentRecord(record.id)}><Delete /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

      {/* Vaccination Dialog */}
      <Dialog open={vaccinationDialogOpen} onClose={closeVaccinationDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingVaccination ? 'Edit Vaccination' : 'Add Vaccination'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField 
              label="Vaccination Name" 
              value={vaccName} 
              onChange={(e) => handleVaccNameChange(e.target.value)} 
              fullWidth 
              required 
              helperText="Type a vaccine name (e.g., Newcastle, Gumboro) and the next due date will be auto-calculated"
            />
            <TextField 
              label="Date Given" 
              type="date" 
              value={vaccDate} 
              onChange={(e) => handleVaccDateChange(e.target.value)} 
              fullWidth 
              required 
              slotProps={{ inputLabel: { shrink: true } }} 
            />
            <TextField 
              label="Next Due Date (Auto-calculated)" 
              type="date" 
              value={vaccNextDue} 
              onChange={(e) => setVaccNextDue(e.target.value)} 
              fullWidth 
              required 
              slotProps={{ inputLabel: { shrink: true } }} 
              helperText="Auto-calculated based on vaccine schedule. You can manually adjust if needed."
            />
            <TextField 
              label="Notes" 
              value={vaccNotes} 
              onChange={(e) => setVaccNotes(e.target.value)} 
              fullWidth 
              multiline 
              rows={2} 
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeVaccinationDialog} variant="outlined">Cancel</Button>
          <Button onClick={saveVaccinationRecord} variant="contained" disabled={!vaccName || !vaccDate}>
            {editingVaccination ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Treatment Dialog */}
      <Dialog open={treatmentDialogOpen} onClose={closeTreatmentDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>
          {editingTreatment ? 'Edit Treatment Record' : 'Add Treatment Record'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Treatment Type</InputLabel>
              <Select
                value={treatType}
                label="Treatment Type"
                onChange={(e) => setTreatType(e.target.value)}
              >
                <MenuItem value="multivitamin">Multivitamin</MenuItem>
                <MenuItem value="deworming">Deworming</MenuItem>
                <MenuItem value="antibiotic">Antibiotic</MenuItem>
                <MenuItem value="probiotic">Probiotic</MenuItem>
                <MenuItem value="herbal">Herbal</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField 
              label="Product Name" 
              value={treatProduct} 
              onChange={(e) => setTreatProduct(e.target.value)} 
              fullWidth 
              required 
              placeholder="e.g., Vitafert, Albendazole, Enrofloxacin"
            />
            <TextField 
              label="Date Given" 
              type="date" 
              value={treatDate} 
              onChange={(e) => setTreatDate(e.target.value)} 
              fullWidth 
              required 
              slotProps={{ inputLabel: { shrink: true } }} 
            />
            <TextField 
              label="Dosage" 
              value={treatDosage} 
              onChange={(e) => setTreatDosage(e.target.value)} 
              fullWidth 
              placeholder="e.g., 1ml per bird, 5g per 10 liters"
            />
            <TextField 
              label="Reason" 
              value={treatReason} 
              onChange={(e) => setTreatReason(e.target.value)} 
              fullWidth 
              placeholder="e.g., General health, after illness, preventive"
            />
            <TextField 
              label="Days given" 
              type="number" 
              value={treatDaysGiven} 
              onChange={(e) => setTreatDaysGiven(e.target.value)} 
              fullWidth 
              placeholder="e.g., 5"
              helperText="How many days the medication was given"
            />
            <TextField 
              label="Notes" 
              value={treatNotes} 
              onChange={(e) => setTreatNotes(e.target.value)} 
              fullWidth 
              multiline 
              rows={2} 
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeTreatmentDialog} variant="outlined">Cancel</Button>
          <Button onClick={saveTreatmentRecord} variant="contained" disabled={!treatType || !treatProduct || !treatDate}>
            {editingTreatment ? 'Update' : 'Save'}
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
          ?? Action Required
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
            onClick={handleScrollToHealth} 
            variant="contained" 
            sx={{ bgcolor: 'primary.main' }}
          >
            Go to Health ?
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};









