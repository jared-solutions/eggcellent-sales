import { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, Button, Paper, Alert, Card, CardContent, Grid, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Save, Edit, Calculate, Warning, Error as ErrorIcon, Agriculture, Home, Business, Inventory } from '@mui/icons-material';
import { useFlockSettings, HousingType } from '@/hooks/useFlockSettings';
import { useCompany } from '@/hooks/useCompany';
import { useFeedInventory } from '@/hooks/useFeedInventory';
import { useNotifications } from '@/hooks/useNotifications';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

interface SettingsPageProps {
  highlightAction?: string | null;
  onActionComplete?: () => void;
}

export const SettingsPage = ({ highlightAction, onActionComplete }: SettingsPageProps) => {
  const [tabValue, setTabValue] = useState(0);
  
  // Use the flock settings hook
  const { settings, feedPerChicken, isFeedAbnormal, getFeedWarning, saveSettings } = useFlockSettings();
  // Use company hook for company settings
  const { currentCompany, updateCompany, isAdmin } = useCompany();
  // Use feed inventory hook
  const feedInventory = useFeedInventory();
  // Use notifications hook
  const { notifications, markAsRead } = useNotifications();
  
  // Local state for company name
  const [companyName, setCompanyName] = useState<string>('');
  const [companySaved, setCompanySaved] = useState(false);
  const [companyError, setCompanyError] = useState<string>('');
  const [savingCompany, setSavingCompany] = useState(false);
  
  // Local state for inputs
  const [chickenInput, setChickenInput] = useState<string>('');
  const [defaultFeedInput, setDefaultFeedInput] = useState<string>('');
  const [housingType, setHousingType] = useState<HousingType>('cages');
  const [flockStartDate, setFlockStartDate] = useState<string>('');
  const [saved, setSaved] = useState(false);
  
  // Highlight dialog state
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [highlightMessage, setHighlightMessage] = useState('');
  const feedSectionRef = useRef<HTMLDivElement>(null);
  
  // Handle highlight action from notifications
  useEffect(() => {
    if (highlightAction) {
      // Show appropriate message based on action
      if (highlightAction === 'settings' || highlightAction === 'feed-settings') {
        setHighlightMessage('🐔 Please set your daily feed amount per chicken in the Flock Settings section below. This helps track feed consumption accurately.');
        setHighlightOpen(true);
      } else if (highlightAction === 'housing-settings') {
        setHighlightMessage('🏠 Please set your housing type (cages, deep litter, or free range) in the Flock Settings section.');
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
  
  const handleScrollToFeed = () => {
    setHighlightOpen(false);
    // Scroll to feed section
    feedSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (onActionComplete) {
      onActionComplete();
    }
  };
  
  // Initialize inputs from settings
  useEffect(() => {
    if (settings.totalChickens > 0) {
      setChickenInput(settings.totalChickens.toString());
    } else {
      setChickenInput('0');
    }
    
    if (settings.defaultDailyFeed > 0) {
      setDefaultFeedInput(settings.defaultDailyFeed.toString());
    } else {
      setDefaultFeedInput('');
    }
    
    if (settings.housingType) {
      setHousingType(settings.housingType);
    }
    
    if (settings.flockStartDate) {
      setFlockStartDate(settings.flockStartDate);
    }
    
    // Initialize company name from current company
    if (currentCompany) {
      setCompanyName(currentCompany.name);
    }
  }, [settings, currentCompany]);

  // Save company name
  const handleSaveCompany = async () => {
    if (!companyName.trim()) {
      setCompanyError('Company name cannot be empty');
      return;
    }
    setCompanyError('');
    setSavingCompany(true);
    
    try {
      await updateCompany(currentCompany!.id, { name: companyName.trim() });
      setCompanySaved(true);
      setTimeout(() => setCompanySaved(false), 3000);
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : 'Failed to update company');
    } finally {
      setSavingCompany(false);
    }
  };
  
  const handleSave = () => {
    const chickens = parseInt(chickenInput) || 0;
    const defaultFeed = parseFloat(defaultFeedInput) || 0;
    
    saveSettings({
      totalChickens: chickens,
      defaultDailyFeed: defaultFeed,
      housingType: housingType,
      flockStartDate: flockStartDate || undefined
    });
    
    // Mark relevant notifications as completed when settings are saved
    // This includes: Feed, Flock, and System setup notifications
    const settingRelatedTitles = [
      'Feed Amount Required',
      'Flock Information Needed',
      'Flock Start Date Required',
      'Farm Setup Required',
      'Feed Stock Alert',
      'Feed Stock Low',
      'Feed Stock Warning'
    ];
    notifications
      .filter(n => !n.read && (settingRelatedTitles.some(t => n.title.includes(t)) || n.type === 'feed' || n.type === 'system'))
      .forEach(n => markAsRead(n.id));
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Get feed warning based on current input values
  const totalFeed = parseFloat(defaultFeedInput) || 0;
  const inputFeedPerChicken = settings.totalChickens > 0 && totalFeed > 0 
    ? (totalFeed / settings.totalChickens) 
    : 0;
  const isInputFeedAbnormal = inputFeedPerChicken > 0.3;
  const getInputFeedWarning = () => {
    if (settings.totalChickens === 0 || totalFeed === 0) {
      return null;
    }
    if (inputFeedPerChicken > 0.3) {
      return {
        level: 'error' as const,
        message: `⚠️ ABNORMAL: ${inputFeedPerChicken.toFixed(2)} kg per chicken per day is extremely high! Normal is 0.1-0.15 kg. Check your feed amount.`
      };
    } else if (inputFeedPerChicken > 0.2) {
      return {
        level: 'warning' as const,
        message: `⚠️ High: ${inputFeedPerChicken.toFixed(2)} kg per chicken per day (above normal 0.1-0.15 kg range).`
      };
    } else if (inputFeedPerChicken > 0 && inputFeedPerChicken < 0.08) {
      return {
        level: 'warning' as const,
        message: `⚠️ Low: ${inputFeedPerChicken.toFixed(2)} kg per chicken per day is below normal range.`
      };
    }
    return null;
  };
  const feedWarning = getInputFeedWarning();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <>
      <Box p={{ xs: 2, sm: 3 }} maxWidth="900px" mx="auto">
      {/* Header */}
      <Box mb={2}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'success.main', fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
          ⚙️ Settings
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="settings tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Company" icon={<Business />} iconPosition="start" />
          <Tab label="Flock" icon={<Agriculture />} iconPosition="start" />
          <Tab label="Feed" icon={<Inventory />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      
      {/* COMPANY TAB */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Configure your company details
        </Typography>

        {companySaved && (
          <Alert severity="success" sx={{ mb: 3 }}>
            ✓ Company name updated successfully!
          </Alert>
        )}

        {companyError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {companyError}
          </Alert>
        )}

        {/* Company Settings Card - editable by admin only */}
        {isAdmin && (
          <Paper sx={{ p: 3, border: '1px solid', borderColor: 'primary.main' }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Business color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Company Name
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This name appears in the header and on reports
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                label="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                size="medium"
                placeholder="e.g., Sunrise Eggs Farm"
              />
              <Button 
                variant="contained" 
                startIcon={<Save />}
                onClick={handleSaveCompany}
                disabled={savingCompany || !companyName.trim() || companyName === currentCompany?.name}
                sx={{ 
                  bgcolor: 'primary.main', 
                  '&:hover': { bgcolor: 'primary.dark' },
                  py: 1.8,
                  minWidth: 120
                }}
              >
                {savingCompany ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Paper>
        )}

        {!isAdmin && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary">
              Company: <strong>{currentCompany?.name}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Contact an admin to change company settings.
            </Typography>
          </Paper>
        )}
      </TabPanel>

      {/* FLOCK TAB */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage your flock size and housing system
        </Typography>

        {saved && (
          <Alert severity="success" sx={{ mb: 3 }}>
            ✓ Settings saved successfully!
          </Alert>
        )}

        {/* Current Flock Size Card */}
        <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Agriculture />
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Current Flock
              </Typography>
            </Box>
            <Typography variant="h2" sx={{ fontWeight: 'bold' }}>
              {settings.totalChickens}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              hens/chickens
            </Typography>
            {settings.lastUpdated && (
              <Typography variant="caption" sx={{ opacity: 0.7, mt: 1, display: 'block' }}>
                Updated: {settings.lastUpdated}
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Housing System Selection */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Home color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Housing System
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose your farming method
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              variant={housingType === 'cages' ? 'contained' : 'outlined'}
              onClick={() => setHousingType('cages')}
              sx={{ 
                py: 2,
                bgcolor: housingType === 'cages' ? 'primary.main' : 'transparent',
                color: housingType === 'cages' ? 'white' : 'primary.main',
                borderColor: 'primary.main',
                '&:hover': {
                  bgcolor: housingType === 'cages' ? 'primary.dark' : 'primary.light'
                }
              }}
            >
              <Box textAlign="center">
                <Typography variant="h4">🐔</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>Cage System</Typography>
              </Box>
            </Button>
            <Button
              fullWidth
              variant={housingType === 'freerange' ? 'contained' : 'outlined'}
              onClick={() => setHousingType('freerange')}
              sx={{ 
                py: 2,
                bgcolor: housingType === 'freerange' ? 'warning.main' : 'transparent',
                color: housingType === 'freerange' ? 'white' : 'warning.main',
                borderColor: 'warning.main',
                '&:hover': {
                  bgcolor: housingType === 'freerange' ? 'warning.dark' : 'warning.light'
                }
              }}
            >
              <Box textAlign="center">
                <Typography variant="h4">🌳</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>Free-Range</Typography>
              </Box>
            </Button>
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary', bgcolor: 'grey.100', p: 1.5, borderRadius: 1 }}>
            {housingType === 'cages' 
              ? '📝 Record eggs by cage number with grid inputs + shade eggs'
              : '🥚 Record eggs as trays + remaining (no cage breakdown)'
            }
          </Typography>
        </Paper>

        {/* Update Chicken Count - Admin only */}
        {isAdmin && (
          <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Edit color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Update Flock Size
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter your current number of hens
          </Typography>
          
          <TextField
            fullWidth
            label="Total Chickens"
            type="number"
            value={chickenInput}
            onChange={(e) => setChickenInput(e.target.value)}
            size="medium"
            inputProps={{ min: 0 }}
            placeholder="e.g., 50"
          />
        </Paper>
        )}

        {/* Flock Start Date - for vaccination tracking - Admin only */}
        {isAdmin && (
          <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Edit color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Flock Start Date
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            When did you get this flock? Used for vaccination schedule tracking.
          </Typography>
          
          <TextField
            fullWidth
            label="Flock Start Date"
            type="date"
            value={flockStartDate}
            onChange={(e) => setFlockStartDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            placeholder="Select date"
          />
        </Paper>
        )}

        {/* Save Button - Admin only */}
        {isAdmin && (
          <Box mt={3} display="flex" justifyContent="center">
          <Button 
            variant="contained" 
            size="large"
            startIcon={<Save />}
            onClick={handleSave}
            sx={{ 
              bgcolor: 'success.main', 
              '&:hover': { bgcolor: 'success.dark' },
              py: 1.5,
              px: 6,
              fontSize: '1.1rem'
            }}
          >
            Save Flock Settings
          </Button>
        </Box>
        )}
      </TabPanel>

      {/* FEED TAB */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Track feed consumption and inventory
        </Typography>

        {saved && (
          <Alert severity="success" sx={{ mb: 3 }}>
            ✓ Settings saved successfully!
          </Alert>
        )}

        {/* Daily Feed Consumption */}
        <Paper sx={{ p: 3, mb: 3 }} ref={feedSectionRef}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Calculate color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Daily Feed Consumption
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter total feed used per day for all chickens
          </Typography>
          
          <TextField
            fullWidth
            label="Feed (kg per day)"
            type="number"
            value={defaultFeedInput}
            onChange={(e) => setDefaultFeedInput(e.target.value)}
            placeholder="e.g., 7.5"
            size="medium"
            inputProps={{ min: 0, step: 0.1 }}
            helperText="Total kg of feed for all chickens daily"
          />

          {/* Feed Calculation Results */}
          {settings.totalChickens > 0 && parseFloat(defaultFeedInput) > 0 && (
            <Box sx={{ mt: 3, p: 2, bgcolor: isInputFeedAbnormal ? 'error.lighter' : 'success.lighter', borderRadius: 2, border: `1px solid ${isInputFeedAbnormal ? '#f44336' : '#4caf50'}` }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                📊 Calculation:
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: isInputFeedAbnormal ? 'error.main' : 'success.main' }}>
                {inputFeedPerChicken.toFixed(3)} kg/hen/day
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                ({settings.totalChickens} hens × {defaultFeedInput} kg = {inputFeedPerChicken.toFixed(3)} kg/hen)
              </Typography>
              
              {/* Abnormal Feed Warning */}
              {feedWarning && (
                <Alert 
                  severity={feedWarning.level} 
                  sx={{ mt: 2 }}
                  icon={feedWarning.level === 'error' ? <ErrorIcon /> : <Warning />}
                >
                  {feedWarning.message}
                </Alert>
              )}
              
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                ✓ Normal range: 0.10 - 0.15 kg per hen per day
              </Typography>
            </Box>
          )}

          {settings.totalChickens > 0 && parseFloat(defaultFeedInput) <= 0 && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                💡 Enter your daily feed amount above to see the per-chicken calculation
              </Typography>
            </Box>
          )}

          {settings.totalChickens === 0 && isAdmin && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.lighter', borderRadius: 2, border: '1px solid #ff9800' }}>
              <Typography variant="body2" color="warning.dark">
                ⚠️ Please set your flock size first (go to Flock tab)
              </Typography>
            </Box>
          )}

          {settings.totalChickens === 0 && !isAdmin && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Flock size has not been configured by the admin yet.
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Feed Inventory Summary */}
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'success.main' }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Inventory color="success" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Feed Inventory
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your current feed stock status
          </Typography>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card sx={{ borderRadius: 2, bgcolor: feedInventory.inventory.currentStock <= 0 ? 'error.light' : 'success.light' }}>
                <CardContent>
                  <Typography variant="body2" color={feedInventory.inventory.currentStock <= 0 ? 'error.dark' : 'success.dark'}>
                    Current Stock
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {feedInventory.inventory.currentStock.toFixed(1)} kg
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Total Purchased</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {feedInventory.inventory.totalPurchased.toFixed(1)} kg
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Daily Consumption</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {feedInventory.dailyConsumption.toFixed(1)} kg/day
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Based on {settings.totalChickens} chickens
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Card sx={{ borderRadius: 2, bgcolor: feedInventory.inventory.daysRemaining !== null && feedInventory.inventory.daysRemaining <= 7 ? 'warning.light' : 'grey.100' }}>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Days Remaining</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {feedInventory.inventory.daysRemaining !== null ? feedInventory.inventory.daysRemaining : 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            💡 To add more feed, go to the <strong>Expenses page</strong> and record a Feed purchase
          </Typography>
        </Paper>

        {/* Save Button */}
        <Box mt={3} display="flex" justifyContent="center">
          <Button 
            variant="contained" 
            size="large"
            startIcon={<Save />}
            onClick={handleSave}
            sx={{ 
              bgcolor: 'success.main', 
              '&:hover': { bgcolor: 'success.dark' },
              py: 1.5,
              px: 6,
              fontSize: '1.1rem'
            }}
          >
            Save Feed Settings
          </Button>
        </Box>
      </TabPanel>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
        These settings help the system calculate laying percentages and feed efficiency
      </Typography>
    </Box>
    
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
          onClick={handleScrollToFeed} 
          variant="contained" 
          sx={{ bgcolor: 'primary.main' }}
        >
          Go to Settings ↓
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};
