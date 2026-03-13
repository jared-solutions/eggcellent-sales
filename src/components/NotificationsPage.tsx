import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  Checkbox,
} from '@mui/material';
import {
  Warning,
  Error as ErrorIcon,
  Info,
  CheckCircle,
  Delete,
  ArrowBack,
  Check,
} from '@mui/icons-material';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useCompany } from '@/hooks/useCompany';

interface NotificationsPageProps {
  onPageChange: (page: string) => void;
}

export default function NotificationsPage({ onPageChange }: NotificationsPageProps) {
  const { notifications, markAsRead, deleteNotification, markAllAsRead, clearAll } = useNotifications();
  const { currentCompany } = useCompany();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Filter notifications for current company
  const companyNotifications = notifications;

  useEffect(() => {
    // Mark all as read when page opens
    if (companyNotifications.some(n => !n.read)) {
      markAllAsRead();
    }
  }, []);

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    if (newSelected.size > 0) {
      setSelectionMode(true);
    } else {
      setSelectionMode(false);
    }
  };

  const handleLongPress = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const handleMarkSelectedRead = async () => {
    for (const id of selectedIds) {
      await markAsRead(id);
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await deleteNotification(id);
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleCancelSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        {selectionMode ? (
          <>
            <IconButton onClick={handleCancelSelection}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 600, flex: 1 }}>
              {selectedIds.size} selected
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={handleMarkSelectedRead}
              startIcon={<Check />}
            >
              Mark Read
            </Button>
            <Button 
              variant="outlined" 
              size="small" 
              color="error"
              onClick={handleDeleteSelected}
              startIcon={<Delete />}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            <IconButton onClick={() => onPageChange('dashboard')}>
              <ArrowBack />
            </IconButton>
            <Typography variant="h5" sx={{ fontWeight: 600, flex: 1 }}>
              Notifications
            </Typography>
            {notifications.length > 0 && (
              <Button 
                variant="outlined" 
                size="small" 
                onClick={clearAll}
                color="error"
              >
                Clear All
              </Button>
            )}
          </>
        )}
      </Box>

      {notifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            No notifications
          </Typography>
        </Box>
      ) : (
        <List>
          {notifications.map((notification, index) => (
            <Box key={notification.id}>
              <ListItem
                alignItems="flex-start"
                sx={{
                  bgcolor: selectedIds.has(notification.id) ? 'primary.light' : (notification.read ? 'transparent' : 'action.hover'),
                  borderRadius: 1,
                  mb: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: selectedIds.has(notification.id) ? 'primary.light' : 'action.selected' },
                  position: 'relative',
                }}
                onClick={() => {
                  if (selectionMode) {
                    handleToggleSelect(notification.id);
                  } else {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    setSelectedNotification(notification);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleLongPress(notification.id);
                }}
              >
                {selectionMode && (
                  <Checkbox
                    checked={selectedIds.has(notification.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(notification.id);
                    }}
                    sx={{ mr: 1 }}
                  />
                )}
                <ListItemIcon>
                  {notification.level === 'error' && <ErrorIcon color="error" />}
                  {notification.level === 'warning' && <Warning color="warning" />}
                  {notification.level === 'success' && <CheckCircle color="success" />}
                  {notification.level === 'info' && <Info color="info" />}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: notification.read ? 400 : 600, flex: 1 }}>
                        {notification.title}
                      </Typography>
                      {notification.read && (
                        <Chip 
                          label="Done" 
                          size="small" 
                          color="success" 
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {notification.timestamp.toLocaleString()}
                      </Typography>
                    </>
                  }
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {!selectionMode && (
                    <>
                      {!notification.read && (
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          sx={{ p: 1 }}
                          title="Mark as read"
                        >
                          <Check fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        sx={{ p: 1 }}
                        title="Delete"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              </ListItem>
              {index < notifications.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      )}
      {/* Dialog to show full notification */}
      <Dialog
        open={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '12px' }
        }}
      >
        {selectedNotification && (
          <>
            <DialogTitle sx={{ fontWeight: 600 }}>
              {selectedNotification.title}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedNotification.message}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                {selectedNotification.timestamp.toLocaleString()}
              </Typography>
              {selectedNotification.actionUrl && (
                <Chip 
                  label="Go to related page" 
                  onClick={() => {
                    onPageChange(selectedNotification.actionUrl);
                    setSelectedNotification(null);
                  }}
                  clickable
                  color="primary"
                />
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
