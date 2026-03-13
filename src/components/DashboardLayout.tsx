import { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useMediaQuery,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  Select,
  FormControl,
  Chip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import NotificationsPage from './NotificationsPage';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  LocalShipping,
  ShoppingCart,
  Payment,
  PriceChange,
  Logout,
  Egg,
  ChevronLeft,
  ChevronRight,
  Business,
  AdminPanelSettings,
  Group,
  Receipt,
  Inventory2,
  Settings,
  Assessment,
  Notifications,
  Warning,
  Error as ErrorIcon,
  Info,
  CheckCircle,
  LocalHospital,
  Delete,
  Person,
  CreditCard,
  Wallet,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useNotifications } from '@/hooks/useNotifications';
import djangoApi from '@/integrations/django/client';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string, action?: string) => void;
}

const drawerWidthExpanded = 280;
const drawerWidthCollapsed = 80;

const menuItems = [
  // Core - Dashboard
  { id: 'dashboard', moduleName: 'dashboard', label: 'Dashboard', icon: <Dashboard /> },
  // Daily Operations
  { id: 'collections', moduleName: 'collections', label: 'Daily Collections', icon: <Inventory2 /> },
  { id: 'sales', moduleName: 'sales', label: 'Sales', icon: <ShoppingCart /> },
  { id: 'customers', moduleName: 'customers', label: 'Customers', icon: <People /> },
  // Financial
  { id: 'payments', moduleName: 'payments', label: 'Payments', icon: <Payment /> },
  { id: 'expenses', moduleName: 'expenses', label: 'Expenses', icon: <Receipt /> },
  { id: 'deposits', moduleName: 'deposits', label: 'Deposits', icon: <Wallet /> },
  { id: 'supplies', moduleName: 'supplies', label: 'Weekly Supplies', icon: <LocalShipping /> },
  // Operations
  { id: 'health', moduleName: 'health', label: 'Flock Health', icon: <LocalHospital /> },
  { id: 'prices', moduleName: 'prices', label: 'Pricing', icon: <PriceChange />, adminOnly: true },
  { id: 'reports', moduleName: 'reports', label: 'Reports', icon: <Assessment />, adminOnly: true },
  // Administration
  { id: 'settings', moduleName: 'settings', label: 'Settings', icon: <Settings /> },
  { id: 'profile', moduleName: 'profile', label: 'Profile', icon: <Person /> },
  { id: 'users', moduleName: 'users', label: 'Team', icon: <Group />, adminOnly: true },
];

const SIDEBAR_STORAGE_KEY = 'eggtrack_sidebar_collapsed';

export const DashboardLayout = ({ children, currentPage, onPageChange }: DashboardLayoutProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved === 'true' || (saved === null && isTablet);
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationEl, setNotificationEl] = useState<null | HTMLElement>(null);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const { user, signOut } = useAuth();
  const { companies, currentCompany, selectCompany, isAdmin, userRole } = useCompany();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  
  // Fetch user's accessible modules
  const { data: userModules = [] } = useQuery({
    queryKey: ['my-modules', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const modules = await djangoApi.modules.getMyModules();
      return modules;
    },
    enabled: !!currentCompany
  });
  
  // Create a set of allowed module names for quick lookup
  const allowedModules = new Set(userModules.map((m: any) => m.name));
  
  const drawerWidth = sidebarCollapsed ? drawerWidthCollapsed : drawerWidthExpanded;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newValue));
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationEl(null);
  };

  const handleSignOut = async () => {
    handleMenuClose();
    await signOut();
  };

  const filteredMenuItems = menuItems.filter(item => {
    // Admins have access to everything
    if (isAdmin) return true;
    
    // Check if item requires admin
    if (item.adminOnly) return false;
    
    // Check module permissions (if user has permissions set)
    if (userModules.length > 0 && item.moduleName) {
      return allowedModules.has(item.moduleName);
    }
    
    // Default: allow if no specific permissions set
    return true;
  });

  const drawer = (collapsed: boolean) => (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #3D5A47 0%, #4A5F54 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: 6,
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(255,255,255,0.05)',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 3,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Logo Section */}
      <Box sx={{ p: collapsed ? 2 : 3, borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <Box 
            sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <Box
              component="img"
              src="/eggs image.png"
              alt="Logo"
              sx={{ width: 40, height: 40, objectFit: 'contain' }}
            />
          </Box>
          {!collapsed && (
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'white', fontSize: '1.1rem' }}>
                EggTrack
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                SUPPLY MANAGEMENT
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Company Selector */}
      {!collapsed && companies.length > 0 && (
        <Box sx={{ px: 2, py: 2 }}>
          <FormControl fullWidth size="small">
            <Select
              value={currentCompany?.id || ''}
              onChange={(e) => {
                const company = companies.find(c => c.id === e.target.value);
                if (company) selectCompany(company);
              }}
              displayEmpty
              sx={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                borderRadius: '10px',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiSvgIcon-root': { color: 'white' },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
                '& .MuiSelect-select': { py: 1 },
              }}
              MenuProps={{
                PaperProps: {
                  sx: { borderRadius: '12px', mt: 1, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }
                }
              }}
            >
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business fontSize="small" />
                    {company.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {userRole && (
            <Chip 
              icon={<AdminPanelSettings sx={{ color: 'inherit !important', fontSize: 16 }} />}
              label={userRole === 'admin' ? 'Admin' : 'User'}
              size="small"
              sx={{ 
                mt: 1, 
                backgroundColor: userRole === 'admin' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />
          )}
        </Box>
      )}

      {/* Navigation */}
      <List sx={{ flex: 1, px: collapsed ? 1 : 2, py: 2, overflowY: 'auto' }}>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <Tooltip title={collapsed ? item.label : ''} placement="right">
              <ListItemButton
                selected={currentPage === item.id}
                onClick={() => {
                  onPageChange(item.id);
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: '14px',
                  minHeight: { xs: 52, sm: 48 },
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 2 : 2.5,
                  backgroundColor: currentPage === item.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255,255,255,0.15)',
                  },
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: 'white', 
                    minWidth: collapsed ? 0 : 44,
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText 
                    primary={item.label} 
                    primaryTypographyProps={{ 
                      fontWeight: currentPage === item.id ? 600 : 400,
                      color: 'white',
                      fontSize: '0.9375rem',
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      {/* Collapse Toggle */}
      {!isMobile && (
        <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <IconButton 
            onClick={handleSidebarToggle}
            sx={{ 
              width: '100%', 
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
            }}
          >
            {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar 
          sx={{ 
            minHeight: { xs: 56, sm: 64 },
            px: { xs: 1, sm: 2 },
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, color: '#1E293B', display: { xs: 'none', sm: 'block' } }}>
              {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
            </Typography>
            <Typography variant="subtitle2" noWrap component="div" sx={{ fontWeight: 600, color: '#1E293B', display: { xs: 'block', sm: 'none' } }}>
              {menuItems.find(item => item.id === currentPage)?.label || 'Dashboard'}
            </Typography>
            {currentCompany && (
              <Typography variant="caption" sx={{ color: '#64748B', display: { xs: 'none', sm: 'block' } }}>
                {currentCompany.name}
              </Typography>
            )}
          </Box>
          <IconButton onClick={handleMenuClick} size="small">
            <Avatar 
              sx={{ 
                bgcolor: '#3B82F6', 
                width: { xs: 36, sm: 40 }, 
                height: { xs: 36, sm: 40 },
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
              }}
            >
              {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase()}
            </Avatar>
          </IconButton>
          <IconButton 
            onClick={() => onPageChange('notifications')} 
            size="small"
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <Notifications sx={{ color: '#1E293B' }} />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: { 
                mt: 1, 
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                minWidth: 200,
              }
            }}
          >
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                <Avatar 
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    bgcolor: '#3B82F6',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {user?.first_name} {user?.last_name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <Typography variant="caption" color="text.secondary">
                      {user?.email}
                    </Typography>
                    <Chip 
                      label={isAdmin ? 'Admin' : 'User'}
                      size="small"
                      sx={{ 
                        height: 16,
                        fontSize: '0.65rem',
                        bgcolor: isAdmin ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                        color: isAdmin ? '#22C55E' : '#64748B',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleSignOut}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Sign Out
            </MenuItem>
          </Menu>
          {/* Notifications Dropdown - Like Facebook */}
          <Menu
            anchorEl={notificationEl}
            open={Boolean(notificationEl)}
            onClose={handleNotificationClose}
            PaperProps={{
              sx: { 
                mt: 1, 
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                minWidth: 360,
                maxHeight: '70vh',
                width: '90vw',
                maxWidth: 400,
                zIndex: 1300,
                overflow: 'visible',
              }
            }}
            MenuListProps={{
              sx: {
                p: 0,
                overflow: 'auto',
              }
            }}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
          >
            <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Notifications</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <Chip 
                    label={`${unreadCount} new`} 
                    size="small" 
                    color="error" 
                    onClick={markAllAsRead}
                    sx={{ cursor: 'pointer' }}
                  />
                )}
                {notifications.length > 0 && (
                  <Chip 
                    label="Clear All" 
                    size="small" 
                    onClick={clearAll}
                    sx={{ cursor: 'pointer', bgcolor: 'grey.200' }}
                  />
                )}
              </Box>
            </Box>
            <Divider />
            {notifications.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No notifications
                </Typography>
              </Box>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <MenuItem 
                  key={notification.id}
                  onClick={() => {
                    markAsRead(notification.id);
                    handleNotificationClose();
                    const action = notification.actionUrl?.replace('/', '') || '';
                    onPageChange(action, action);
                  }}
                  sx={{ 
                    alignItems: 'flex-start',
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    py: 2,
                    px: 2,
                    minHeight: 100,
                    cursor: 'pointer',
                    whiteSpace: 'normal',
                    flexDirection: 'column',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                    <ListItemIcon sx={{ mt: 0, minWidth: 32 }}>
                      {notification.level === 'error' && <ErrorIcon color="error" fontSize="small" />}
                      {notification.level === 'warning' && <Warning color="warning" fontSize="small" />}
                      {notification.level === 'success' && <CheckCircle color="success" fontSize="small" />}
                      {notification.level === 'info' && <Info color="info" fontSize="small" />}
                    </ListItemIcon>
                    <Typography variant="body2" fontWeight={notification.read ? 500 : 700} sx={{ flex: 1 }}>
                      {notification.title}
                    </Typography>
                    {!notification.read && (
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 5, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', width: '100%' }}>
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 5 }}>
                    {notification.timestamp.toLocaleString()}
                  </Typography>
                </MenuItem>
              ))
            )}
            {notifications.length > 5 && (
              <>
                <Divider />
                <MenuItem disabled sx={{ justifyContent: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    +{notifications.length - 5} more notifications
                  </Typography>
                </MenuItem>
              </>
            )}
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ 
          width: { md: drawerWidth }, 
          flexShrink: { md: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: { xs: '85%', sm: '280px' },
              maxWidth: 320,
              border: 'none',
            },
          }}
        >
          {drawer(false)}
        </Drawer>
        
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              border: 'none',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            },
          }}
          open
        >
          {drawer(sidebarCollapsed)}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: '56px', sm: '64px' },
          backgroundColor: '#F8FAFC',
          minHeight: 'calc(100vh - 64px)',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {children}
      </Box>

      {/* Notification Detail Dialog */}
      <Dialog 
        open={!!selectedNotification} 
        onClose={() => setSelectedNotification(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedNotification && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              {selectedNotification.title}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedNotification.timestamp ? new Date(selectedNotification.timestamp).toLocaleString() : 'Unknown time'}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {selectedNotification.message}
              </Typography>
              {selectedNotification.action_url && (
                <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Typography 
                    component="button"
                    onClick={() => {
                      setSelectedNotification(null);
                      onPageChange(selectedNotification.action_url.replace('/', ''));
                    }}
                    sx={{ color: 'primary.main', textDecoration: 'none', cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, background: 'none', border: 'none', p: 0, font: 'inherit' }}
                  >
                    Go to related page →
                  </Typography>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};
