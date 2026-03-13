import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Paper, ToggleButton, ToggleButtonGroup, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import { Add, Visibility, Edit, CalendarMonth, Inventory, Delete, Download, PictureAsPdf } from '@mui/icons-material';
import { useCollections, useCreateCollection, useUpdateCollection } from '@/hooks/useCollections';
import { useFlockSettings } from '@/hooks/useFlockSettings';
import { useNotifications } from '@/hooks/useNotifications';

// Cage Grid Display Component - shows recorded data in cage format
const CageGridDisplay = ({ cageId, cageType, eggData, shadeEggs }: { cageId: number, cageType: string, eggData: Record<string, number>, shadeEggs: number }) => {
  const cols = cageType === 'combined' ? 8 : 4;
  
  // Calculate totals for this cage
  const cageTotal = Object.entries(eggData)
    .filter(([key]) => key.startsWith(`${cageId}-`))
    .reduce((sum, [, val]) => sum + val, 0);

  return (
    <Box p={1} sx={{ maxWidth: '100%', overflowX: 'auto', bgcolor: 'grey.50', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          🐔 Cage {cageId}
        </Typography>
        <Chip 
          label={`Total: ${cageTotal} eggs`} 
          color="primary" 
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      </Box>
      
      {["Front Partition", "Back Partition"].map((partitionLabel, partitionIdx) => (
        <Box key={partitionIdx} mt={2}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, color: 'primary.main' }}>
            {partitionLabel}
          </Typography>
          
          {Array.from({ length: 4 }, (_, rowIndex) => (
            <Box 
              key={rowIndex} 
              mb={0.5} 
              sx={{ 
                overflowX: 'auto', 
                pb: 0.5, 
                '&::-webkit-scrollbar': { height: '4px' }, 
                scrollBehavior: 'smooth' 
              }}
            >
              <Box display="flex" gap={0.25} sx={{ width: 'max-content', pl: 0.5, pr: 0.5 }}>
                {Array.from({ length: cols }, (_, colIndex) => {
                  const key = `${cageId}-${partitionIdx}-${rowIndex}-${colIndex}`;
                  const value = eggData[key] || 0;
                  return (
                    <Box 
                      key={key} 
                      p={0.25} 
                      border={1} 
                      borderColor={value > 0 ? 'success.main' : 'grey.300'}
                      borderRadius={0.5} 
                      textAlign="center" 
                      width={{ xs: '32px', sm: '45px' }} 
                      flexShrink={0}
                      sx={{ bgcolor: value > 0 ? 'success.light' : 'white' }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.55rem', display: 'block', fontWeight: 'bold', lineHeight: 1 }}>
                        {colIndex + 1}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', sm: '0.85rem' } }}>
                        {value > 0 ? value : '-'}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

// Input Cage Grid (existing)
const CageGridInput = ({ cageId, cageType, eggData, onEggDataChange }: { cageId: number, cageType: string, eggData: Record<string, number>, onEggDataChange: (data: Record<string, number>) => void }) => {
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});

  const handleEggChange = (partitionIndex: number, rowIndex: number, colIndex: number, value: string, event: any) => {
    const numValue = parseInt(value, 10);
    const key = `${cageId}-${partitionIndex}-${rowIndex}-${colIndex}`;
    
    if (numValue > 4) {
      setErrorMessages(prevErrors => ({ ...prevErrors, [key]: "Max 4" }));
      return;
    }

    setErrorMessages(prevErrors => {
      const newErrors = { ...prevErrors };
      delete newErrors[key];
      return newErrors;
    });

    const newEggData = { ...eggData, [key]: numValue || 0 };
    onEggDataChange(newEggData);

    if (numValue >= 0 && numValue <= 4 && event) {
      setTimeout(() => {
        const currentInput = event.target;
        const allInputs = document.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
        const currentIndex = Array.from(allInputs).indexOf(currentInput);

        if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
          const nextInput = allInputs[currentIndex + 1];
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        }
      }, 100);
    }
  };

  const cols = cageType === 'combined' ? 8 : 4;

  return (
    <Box p={1} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
        Cage {cageId}
      </Typography>
      
      {["Front Partition", "Back Partition"].map((partitionLabel, partitionIdx) => (
        <Box key={partitionIdx} mt={2}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>{partitionLabel}</Typography>
          
          {Array.from({ length: 4 }, (_, rowIndex) => (
            <Box 
              key={rowIndex} 
              mb={0.5} 
              sx={{ 
                overflowX: 'auto', 
                pb: 0.5, 
                '&::-webkit-scrollbar': { height: '4px' }, 
                scrollBehavior: 'smooth' 
              }}
            >
              <Box display="flex" gap={0.25} sx={{ width: 'max-content', pl: 0.5, pr: 0.5 }}>
                {Array.from({ length: cols }, (_, colIndex) => {
                  const key = `${cageId}-${partitionIdx}-${rowIndex}-${colIndex}`;
                  return (
                    <Box 
                      key={key} 
                      p={0.25} 
                      border={1} 
                      borderColor="grey.400"
                      borderRadius={0.5} 
                      textAlign="center" 
                      width={{ xs: '32px', sm: '40px' }} 
                      flexShrink={0}
                      sx={{ bgcolor: eggData[key] ? 'primary.light' : 'white' }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.55rem', display: 'block', lineHeight: 1 }}>
                        {colIndex + 1}
                      </Typography>
                      <TextField
                        type="number"
                        variant="standard"
                        size="small"
                        value={eggData[key] || ''}
                        onChange={(e) => handleEggChange(partitionIdx, rowIndex, colIndex, e.target.value, e)}
                        error={!!errorMessages[key]}
                        helperText={errorMessages[key]}
                        inputProps={{
                          style: { textAlign: 'center', padding: '0px', fontSize: '0.7rem', height: '18px' },
                          min: 0,
                          max: 4
                        }}
                        sx={{ 
                          width: '100%',
                          '& .MuiInput-input': { textAlign: 'center', padding: '0' },
                          '& .MuiFormHelperText-root': { fontSize: '0.45rem', margin: '0' }
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
};

// Helper to parse egg data from notes
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
    // Distribute cage eggs evenly (for display purposes)
    const totalCageEggs = parseInt(cageMatch[1], 10);
    // Just store total - actual distribution is unknown from old data
    for (let i = 0; i < totalCageEggs; i++) {
      eggData[`1-0-${Math.floor(i/8)}-${i%8}`] = 1;
    }
  }
  
  if (shadeMatch) {
    shadeEggs = parseInt(shadeMatch[1], 10);
  }
  
  return { eggData, shadeEggs };
};

export const CollectionsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'data'>('form');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [collectionDate, setCollectionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [eggData, setEggData] = useState<Record<string, number>>({});
  const [shadeEggs, setShadeEggs] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [freeRangeTrays, setFreeRangeTrays] = useState('');
  const [freeRangeRemaining, setFreeRangeRemaining] = useState('');

  const { data: collections, error, isLoading } = useCollections();
  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const { notifications, markAsRead } = useNotifications();

  // Get flock settings using the hook for reactivity
  const flockSettingsHook = useFlockSettings();
  const flockSettings = flockSettingsHook.settings;
  const isFeedAbnormal = flockSettingsHook.isFeedAbnormal;
  const feedWarning = flockSettingsHook.getFeedWarning();
  const housingType = flockSettings.housingType || 'cages';

  // Recording mode based on housing type
  const recordingMode = housingType;

  // Get today's date string
  const today = new Date().toISOString().split('T')[0];

  // Check if collection exists for today
  const todayCollection = useMemo(() => {
    if (!collections) return null;
    return collections.find(c => c.collection_date === today) || null;
  }, [collections, today]);

  // Get unique dates for the date filter
  const availableDates = useMemo(() => {
    if (!collections) return [];
    const dates = collections.map(c => c.collection_date);
    return [...new Set(dates)].sort().reverse();
  }, [collections]);

  // Auto-select the most recent date when collections are loaded and in data view
  useEffect(() => {
    if (viewMode === 'data' && availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [viewMode, availableDates, selectedDate]);

  // Get selected collection
  const selectedCollection = useMemo(() => {
    if (!collections || !selectedDate) return null;
    return collections.find(c => c.collection_date === selectedDate) || null;
  }, [collections, selectedDate]);

  // Parse egg data from selected collection
  const parsedEggData = useMemo(() => {
    if (!selectedCollection) return { eggData: {}, shadeEggs: 0, totalEggs: 0 };
    
    // Get from notes (new JSON format with cage eggs)
    const parsed = parseEggDataFromNotes(selectedCollection.notes);
    const cageEggs = Object.values(parsed.eggData).reduce((a: number, b: number) => a + b, 0);
    const shadeEggs = parsed.shadeEggs || 0;
    const eggsFromNotes = cageEggs + shadeEggs;
    
    // Also get from old tray fields
    const eggsFromTrays = (selectedCollection.starter_trays || 0) * 30 + 
                         (selectedCollection.mid_trays || 0) * 30 + 
                         (selectedCollection.normal_trays || 0) * 30;
    
    // Use whichever has data
    const totalEggs = Math.max(eggsFromNotes, eggsFromTrays);
    
    return { eggData: parsed.eggData, shadeEggs, totalEggs };
  }, [selectedCollection]);

  const handleClose = () => {
    setDialogOpen(false);
    setCollectionDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setEggData({});
    setShadeEggs('');
    setEditingId(null);
    setFreeRangeTrays('');
    setFreeRangeRemaining('');
  };

  const handleEggDataChange = (data: Record<string, number>) => {
    setEggData(data);
  };

  const calculateTotalEggs = () => {
    if (recordingMode === 'freerange') {
      const trays = parseInt(freeRangeTrays) || 0;
      const remaining = parseInt(freeRangeRemaining) || 0;
      return (trays * 30) + remaining;
    }
    const cageEggs = Object.values(eggData).reduce((sum: number, val: number) => sum + (val || 0), 0);
    const shade = parseInt(shadeEggs) || 0;
    return cageEggs + shade;
  };

  const handleSubmit = async () => {
    try {
      const totalEggs = calculateTotalEggs();
      const totalTrays = Math.floor(totalEggs / 30);
      
      // Prepare data based on recording mode
      let detailedNotes: string;
      let cageEggs: number;
      let shade: number;
      
      if (recordingMode === 'freerange') {
        shade = totalEggs; // All eggs go to shade in free-range mode
        cageEggs = 0;
        detailedNotes = JSON.stringify({
          eggData: {},
          shadeEggs: shade,
          cageEggs: 0,
          totalEggs,
          totalTrays,
          isFreeRange: true,
          freeRangeTrays: parseInt(freeRangeTrays) || 0,
          freeRangeRemaining: parseInt(freeRangeRemaining) || 0
        });
      } else {
        shade = parseInt(shadeEggs) || 0;
        cageEggs = totalEggs - shade;
        detailedNotes = JSON.stringify({
          eggData,
          shadeEggs: shade,
          cageEggs,
          totalEggs,
          totalTrays
        });
      }
      
      if (editingId) {
        // Update existing collection
        await updateMutation.mutateAsync({
          id: editingId,
          collection_date: collectionDate,
          starter_trays: 0,
          mid_trays: 0,
          normal_trays: totalTrays,
          notes: detailedNotes,
        });
      } else {
        // Create new collection
        await createMutation.mutateAsync({
          collection_date: collectionDate,
          starter_trays: 0,
          mid_trays: 0,
          normal_trays: totalTrays,
          notes: detailedNotes,
        });
      }
      
      // Mark egg collection notification as completed when eggs are recorded
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      notifications
        .filter(n => n.title === 'Egg Collection Not Recorded' && n.message.includes(todayStr) && !n.read)
        .forEach(n => markAsRead(n.id));
      
      handleClose();
    } catch (err) {
      console.error('Error saving collection:', err);
    }
  };

  if (error) {
    return <Alert severity="error">Error loading collections: {error.message}</Alert>;
  }

  // Store inventory key for localStorage
  const STORE_INVENTORY_KEY = 'egg_store_inventory';
  
  // Get store inventory from localStorage
  const getStoreInventory = (): number => {
    const saved = localStorage.getItem(STORE_INVENTORY_KEY);
    return saved ? parseInt(saved, 10) : 0;
  };
  
  // Set store inventory in localStorage
  const setStoreInventory = (count: number) => {
    localStorage.setItem(STORE_INVENTORY_KEY, count.toString());
  };

  // Calculate store totals (from all collections minus sold/emptied)
  const storeTotals = useMemo(() => {
    if (!collections) return { eggs: 0, trays: 0, remaining: 0 };
    
    let totalEggs = 0;
    collections.forEach(c => {
      // Get from notes (new JSON format with cage eggs)
      const parsed = parseEggDataFromNotes(c.notes);
      const cageEggs = Object.values(parsed.eggData).reduce((a: number, b: number) => a + b, 0);
      const shadeEggs = parsed.shadeEggs || 0;
      const eggsFromNotes = cageEggs + shadeEggs;
      
      // Also get from old tray fields
      const eggsFromTrays = (c.starter_trays || 0) * 30 + (c.mid_trays || 0) * 30 + (c.normal_trays || 0) * 30;
      
      // Use whichever has data
      totalEggs += Math.max(eggsFromNotes, eggsFromTrays);
    });
    
    // Get sold eggs from localStorage
    let eggsSold = getStoreInventory();
    
    // Auto-reset store inventory if total eggs is greater than sold
    // This handles fresh database starts
    if (totalEggs > 0 && eggsSold >= totalEggs) {
      eggsSold = 0;
      setStoreInventory(0);
    }
    
    const availableEggs = Math.max(0, totalEggs - eggsSold);
    
    const trays = Math.floor(availableEggs / 30);
    const remaining = availableEggs % 30;
    
    return { eggs: availableEggs, trays, remaining };
  }, [collections]);
  
  // Handle empty store - reset inventory
  const handleEmptyStore = () => {
    const currentTotal = storeTotals.trays * 30 + storeTotals.remaining;
    if (currentTotal === 0) {
      alert('Store is already empty!');
      return;
    }
    
    if (window.confirm(`Are you sure you want to empty all eggs from store? This will mark ${currentTotal} eggs as sold/delivered.`)) {
      // Add current store count to sold inventory
      const currentSold = getStoreInventory();
      setStoreInventory(currentSold + currentTotal);
    }
  };

  // Export data to CSV
  const exportToCSV = () => {
    if (!collections || collections.length === 0) {
      alert('No data to export');
      return;
    }

    // If a specific date is selected, export only that date
    const dataToExport = selectedDate 
      ? collections.filter(c => c.collection_date === selectedDate)
      : collections;

    if (dataToExport.length === 0) {
      alert('No data to export for selected date');
      return;
    }

    const headers = ['Date', 'Starter Trays', 'Mid Trays', 'Normal Trays', 'Total Trays', 'Total Eggs'];
    const rows = dataToExport.map(c => [
      new Date(c.collection_date).toLocaleDateString(),
      c.starter_trays,
      c.mid_trays,
      c.normal_trays,
      c.starter_trays + c.mid_trays + c.normal_trays,
      (c.starter_trays + c.mid_trays + c.normal_trays) * 30
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // Filename based on selection
    const filename = selectedDate 
      ? `egg_collection_${selectedDate}.csv`
      : `egg_collections_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.download = filename;
    link.click();
  };

  // Export daily summary to PDF (print)
  const exportToPDF = () => {
    if (!selectedCollection) {
      alert('Please select a date to export');
      return;
    }

    const totalEggs = parsedEggData.shadeEggs + Object.values(parsedEggData.eggData).reduce((a, b) => a + b, 0);
    const totalTrays = Math.floor(totalEggs / 30);
    const remainingEggs = totalEggs % 30;
    const layingPercent = flockSettings.totalChickens > 0 
      ? ((totalEggs / flockSettings.totalChickens) * 100).toFixed(1) 
      : '0';
    
    let performance = 'Unknown';
    const layingNum = parseFloat(layingPercent);
    if (layingNum >= 80) performance = 'Excellent';
    else if (layingNum >= 60) performance = 'Good';
    else if (layingNum >= 40) performance = 'Fair';
    else performance = 'Critical';

    const printContent = `
EGG COLLECTION DAILY SUMMARY
============================
Date: ${new Date(selectedCollection.collection_date).toLocaleDateString()}

Cage Eggs: ${Object.values(parsedEggData.eggData).reduce((a, b) => a + b, 0)}
Shade Eggs: ${parsedEggData.shadeEggs}
Grand Total: ${totalEggs} eggs

Laying Percentage: ${layingPercent}%
Performance: ${performance}

Trays: ${totalTrays} full trays + ${remainingEggs} remaining eggs

Generated: ${new Date().toLocaleString()}
    `.trim();

    // Open print dialog
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Egg Collection Summary - ${selectedCollection.collection_date}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; white-space: pre-line; }
              h1 { color: #2E7D32; }
            </style>
          </head>
          <body>
            <h1>🥚 Egg Collection Daily Summary</h1>
            <pre>${printContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, mx: 2, mt: 2, bgcolor: 'success.main', color: 'white', borderRadius: 2, boxShadow: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Daily Collections</Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Store Stats */}
            <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'warning.main', animation: 'pulse 2s infinite', cursor: 'pointer' }}
              onClick={handleEmptyStore}
            >
              <Inventory sx={{ color: 'black', fontSize: 28 }} />
              <Box>
                <Typography variant="caption" sx={{ display: 'block', lineHeight: 1, color: 'black', fontWeight: 'bold' }}>
                  🧅 EGGS IN STORE
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: 'black' }}>
                  {storeTotals.trays} Trays + {storeTotals.remaining} Eggs
                </Typography>
              </Box>
              <Delete sx={{ color: 'black', ml: 1 }} />
            </Paper>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newValue) => {
                if (newValue === 'data' && availableDates.length > 0 && !selectedDate) {
                  setSelectedDate(availableDates[0]);
                }
                newValue && setViewMode(newValue);
              }}
              size="small"
              sx={{ bgcolor: 'white', borderRadius: 2 }}
            >
              <ToggleButton value="form" sx={{ color: 'success.dark', fontWeight: 'bold', px: 2 }}>
                <Edit sx={{ mr: 1 }} /> Record
              </ToggleButton>
              <ToggleButton value="data" sx={{ color: 'success.dark', fontWeight: 'bold', px: 2 }}>
                <Visibility sx={{ mr: 1 }} /> View Data
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Paper>

      {/* Flock Settings Info Bar */}
      {flockSettings.totalChickens > 0 && (
        <Paper sx={{ p: 2, mb: 2, mx: 2, bgcolor: isFeedAbnormal ? 'error.light' : 'info.light', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                🐔 Flock Size: {flockSettings.totalChickens} hens
              </Typography>
              <Typography variant="body2">
                📊 Daily Feed: {flockSettings.defaultDailyFeed} kg ({flockSettingsHook.feedPerChicken.toFixed(2)} kg/hen/day)
              </Typography>
            </Box>
            {feedWarning && (
              <Alert severity={feedWarning.level} sx={{ py: 0.5 }}>
                {feedWarning.message}
              </Alert>
            )}
          </Box>
        </Paper>
      )}

      {viewMode === 'form' ? (
          <Box sx={{ p: 2 }}>
          {todayCollection && !editingId ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="h6">✅ Todays collection has been recorded!</Typography>
              <Typography variant="body2">Click "View Data" to see the recorded tables.</Typography>
            </Alert>
          ) : (
            <Typography variant="h6" gutterBottom>
              Click Record Collection to add new egg collection data
            </Typography>
          )}
          {!todayCollection && (
            <Button 
            variant="contained" 
            startIcon={<Add />} 
            onClick={() => {
              const todayStr = new Date().toISOString().split('T')[0];
              setCollectionDate(todayStr);
              setEggData({});
              setShadeEggs('');
              setEditingId(null);
              setDialogOpen(true);
            }}
            size="large"
            sx={{ mt: 2 }}
          >
            Record Collection
          </Button>
          )}
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          {/* Date Filter */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <CalendarMonth color="primary" />
            <Typography variant="h6">Select Date:</Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Collection Date</InputLabel>
              <Select
                value={selectedDate}
                label="Collection Date"
                onChange={(e) => setSelectedDate(e.target.value)}
              >
                <MenuItem value="">
                  <em>-- Select a date --</em>
                </MenuItem>
                {availableDates.map(date => (
                  <MenuItem key={date} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              color="primary"
              startIcon={<PictureAsPdf />}
              onClick={exportToPDF}
              disabled={!selectedCollection}
              sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
            >
              Download PDF
            </Button>
          </Box>

          {isLoading ? (
            <Typography>Loading...</Typography>
          ) : !selectedDate ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Please select a date to view recorded data
              </Typography>
            </Box>
          ) : selectedCollection ? (
            <Box>
              {/* Collection Summary - Show only Date and Total Eggs from cage grid */}
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ minWidth: '120px' }}>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>Date</Typography>
                    <Typography variant="h5">{new Date(selectedCollection.collection_date).toLocaleDateString()}</Typography>
                  </Box>
                  <Box sx={{ minWidth: '120px' }}>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Eggs</Typography>
                    <Typography variant="h5">{parsedEggData.totalEggs}</Typography>
                  </Box>
                  <Box sx={{ minWidth: '120px', display: 'flex', alignItems: 'center' }}>
                    {selectedCollection.collection_date === today && (
                      <Button 
                        variant="contained" 
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => {
                          setCollectionDate(selectedCollection.collection_date);
                          const existingData = parseEggDataFromNotes(selectedCollection.notes);
                          setEggData(existingData.eggData);
                          setShadeEggs(existingData.shadeEggs.toString());
                          setEditingId(selectedCollection.id);
                          setViewMode('form');
                          setDialogOpen(true);
                        }}
                        sx={{ bgcolor: 'warning.main', '&:hover': { bgcolor: 'warning.dark' } }}
                      >
                        Edit
                      </Button>
                    )}
                  </Box>
                </Box>
              </Paper>

              {/* Cage Grid Display */}
              <CageGridDisplay 
                cageId={1} 
                cageType="combined" 
                eggData={parsedEggData.eggData} 
                shadeEggs={parsedEggData.shadeEggs}
              />
              
              <Box sx={{ mt: 2 }}>
                <CageGridDisplay 
                  cageId={2} 
                  cageType="standard" 
                  eggData={parsedEggData.eggData} 
                  shadeEggs={0}
                />
              </Box>

              {/* Shade Section Display */}
              <Box sx={{ mt: 2, p: 2, border: 2, borderColor: 'success.main', borderRadius: 2, textAlign: 'center', bgcolor: 'rgba(40, 167, 69, 0.1)' }}>
                <Typography variant="h5" sx={{ mb: 1, color: 'success.main' }}>🌳 Eggs from Shade Areas</Typography>
                <Typography variant="h4" sx={{ color: 'success.dark' }}>
                  {parsedEggData.shadeEggs} eggs
                </Typography>
              </Box>

              {/* Total Summary */}
              {selectedCollection && (
                <Box sx={{ mt: 3 }}>
                  <Paper sx={{ p: 3, bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
                    <Typography variant="h5" align="center" sx={{ mb: 2, fontWeight: 'bold' }}>
                      📊 Daily Summary
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between' }}>
                      <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '120px', textAlign: 'center', p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>Cage Eggs</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                          {Object.values(parsedEggData.eggData).reduce((a, b) => a + b, 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: '120px', textAlign: 'center', p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>Shade Eggs</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                          {parsedEggData.shadeEggs}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: '1 1 100%', minWidth: '120px', textAlign: 'center', p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>Grand Total</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '1.75rem' } }}>
                          {parsedEggData.totalEggs}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                      <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>Laying Percentage</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: { xs: '1.75rem', sm: '2.125rem' }, color: flockSettings.totalChickens > 0 && (parsedEggData.totalEggs / flockSettings.totalChickens * 100) >= 60 ? 'lightgreen' : 'orange' }}>
                        {flockSettings.totalChickens > 0 
                          ? (parsedEggData.totalEggs / flockSettings.totalChickens * 100).toFixed(1) 
                          : 0}%
                      </Typography>
                    </Box>

                    <Box sx={{ mt: 2, p: 1, bgcolor: flockSettings.totalChickens > 0 && (parsedEggData.totalEggs / flockSettings.totalChickens * 100) >= 80 ? 'success.dark' : flockSettings.totalChickens > 0 && (parsedEggData.totalEggs / flockSettings.totalChickens * 100) >= 60 ? 'warning.dark' : 'error.dark', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Performance: {flockSettings.totalChickens > 0 ? (
                          (parsedEggData.totalEggs / flockSettings.totalChickens * 100) >= 80 ? 'Excellent - Great production!' :
                          (parsedEggData.totalEggs / flockSettings.totalChickens * 100) >= 60 ? 'Good - Normal production' :
                          (parsedEggData.totalEggs / flockSettings.totalChickens * 100) >= 40 ? 'Fair - Production below target' :
                          'Critical - Very low production. Urgent attention needed.'
                        ) : 'Set chicken count in Flock Settings'}
                      </Typography>
                    </Box>

                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>Trays</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                        {Math.floor(parsedEggData.totalEggs / 30)} full trays + {parsedEggData.totalEggs % 30} remaining eggs
                      </Typography>
                    </Box>

                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Date: {new Date(selectedCollection.collection_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No collection found for the selected date
              </Typography>
            </Box>
          )}
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Record Daily Collection</DialogTitle>
        <DialogContent>
          {editingId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You are adding more eggs to today's existing collection. This will update the existing record.
            </Alert>
          )}
          <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
              📅 Today's Date: {collectionDate ? new Date(collectionDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Loading...'}
            </Typography>
          </Box>
          
          {/* Recording mode is now controlled by Settings - just show indicator */}
          <Box sx={{ mb: 3, p: 2, bgcolor: recordingMode === 'freerange' ? 'warning.light' : 'primary.light', borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: recordingMode === 'freerange' ? 'warning.dark' : 'white', fontWeight: 'bold' }}>
              {recordingMode === 'freerange' ? '🌳 Free-Range Mode - Enter trays and remaining eggs' : '🐔 Cage System - Enter eggs by cage'}
            </Typography>
          </Box>
          
          {recordingMode === 'cages' ? (
            <>
              <CageGridInput cageId={1} cageType="combined" eggData={eggData} onEggDataChange={handleEggDataChange} />
              <CageGridInput cageId={2} cageType="standard" eggData={eggData} onEggDataChange={handleEggDataChange} />

              {/* Shade Section - green border like chicken-app */}
              <Box sx={{ mt: 4, p: 2, border: 2, borderColor: 'success.main', borderRadius: 2, textAlign: 'center', bgcolor: 'rgba(40, 167, 69, 0.1)' }}>
                <Typography variant="h5" sx={{ mb: 2, color: 'success.main' }}>🌳 Eggs from Shade Areas</Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>Number of eggs collected from shade:</Typography>
                <TextField 
                  type="number" 
                  value={shadeEggs} 
                  onChange={(e) => setShadeEggs(e.target.value)} 
                  placeholder="Enter eggs from shade"
                  inputProps={{ min: 0 }}
                  sx={{ width: '200px', bgcolor: 'white' }}
                />
              </Box>
            </>
          ) : (
            /* Free-Range Mode Input */
            <Box sx={{ p: 3, border: 2, borderColor: 'warning.main', borderRadius: 2, bgcolor: 'rgba(255, 152, 0, 0.1)' }}>
              <Typography variant="h5" sx={{ mb: 3, color: 'warning.dark', fontWeight: 'bold', textAlign: 'center' }}>
                🌳 Free-Range Egg Collection
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, textAlign: 'center' }}>
                Enter the total eggs collected from free-range birds (no cages)
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', mb: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Trays (30 eggs each)</Typography>
                  <TextField 
                    type="number" 
                    value={freeRangeTrays} 
                    onChange={(e) => setFreeRangeTrays(e.target.value)} 
                    placeholder="0"
                    inputProps={{ min: 0 }}
                    sx={{ width: '120px', bgcolor: 'white' }}
                  />
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Remaining Eggs</Typography>
                  <TextField 
                    type="number" 
                    value={freeRangeRemaining} 
                    onChange={(e) => setFreeRangeRemaining(e.target.value)} 
                    placeholder="0"
                    inputProps={{ min: 0, max: 29 }}
                    sx={{ width: '120px', bgcolor: 'white' }}
                  />
                </Box>
              </Box>
              
              <Typography variant="h6" sx={{ textAlign: 'center', color: 'warning.dark' }}>
                Total: {((parseInt(freeRangeTrays) || 0) * 30) + (parseInt(freeRangeRemaining) || 0)} eggs
              </Typography>
            </Box>
          )}

          {/* Summary */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="h5">Total Eggs: {calculateTotalEggs()} = {Math.floor(calculateTotalEggs() / 30)} trays + {calculateTotalEggs() % 30} eggs</Typography>
          </Box>

          <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={2} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} variant="outlined">Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={createMutation.isPending || updateMutation.isPending || !collectionDate || calculateTotalEggs() === 0}
            sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
          >
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingId ? 'Update Collection' : 'Submit All Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
