import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Tooltip,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Fade,
} from '@mui/material';
import { 
  PersonAdd, 
  AdminPanelSettings, 
  Person, 
  Edit, 
  Block, 
  CheckCircle,
  Cancel,
  Send,
  Schedule,
  Lock,
} from '@mui/icons-material';
import djangoApi from '@/integrations/django/client';
import { useCompany } from '@/hooks/useCompany';
import { AppRole, UserRoleStatus } from '@/lib/types';
import { useInvitations, useSendInvitation, useCancelInvitation } from '@/hooks/useInvitations';
 
interface UserRoleWithProfile {
  id: string;
  user_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role: AppRole;
  status: UserRoleStatus;
  created_at: string;
  full_name: string | null;
}
 
export const UsersPage = () => {
  const { currentCompany, isAdmin } = useCompany();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRoleWithProfile | null>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<AppRole>('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Module permissions state
  const [modulePermissions, setModulePermissions] = useState<Record<string, boolean>>({});
  
  // Fetch all available modules
  const { data: availableModules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const modules = await djangoApi.modules.list();
      return modules;
    },
    enabled: isAdmin
  });
  
  // Fetch user permissions when editing a user
  const { data: userPermissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['user-permissions', editingUser?.user_id, currentCompany?.id],
    queryFn: async () => {
      if (!editingUser || !currentCompany) return [];
      const permissions = await djangoApi.modules.getUserPermissions(
        currentCompany.id,
        editingUser.user_id
      );
      return permissions;
    },
    enabled: !!editingUser && !!currentCompany && editOpen
  });
  
  // Update module permissions when userPermissions changes
  useEffect(() => {
    if (userPermissions.length > 0) {
      const perms: Record<string, boolean> = {};
      userPermissions.forEach((p: any) => {
        perms[p.id] = p.can_access;
      });
      setModulePermissions(perms);
    }
  }, [userPermissions]);
  
  const updatePermissionsMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser || !currentCompany) return;
      await djangoApi.modules.updateUserPermissions(
        editingUser.user_id,
        currentCompany.id,
        modulePermissions
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      setSuccess('Permissions updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    }
  });
  
  const handleModuleToggle = (moduleId: string) => {
    setModulePermissions(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };
  
  const handleSavePermissions = () => {
    updatePermissionsMutation.mutate();
  };
 
  const { data: invitations = [], isLoading: invitationsLoading } = useInvitations();
  const sendInvitationMutation = useSendInvitation();
  const cancelInvitationMutation = useCancelInvitation();
 
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['company-users', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      
      const users = await djangoApi.companies.getCompanyUsers(currentCompany.id);
      return users.map((u: any) => ({
        ...u,
        full_name: u.full_name || u.email
      }));
    },
    enabled: !!currentCompany && isAdmin
  });
 
  const updateUserMutation = useMutation({
    mutationFn: async ({ userRoleId, updates }: { userRoleId: string; updates: { role?: AppRole; status?: UserRoleStatus } }) => {
      await djangoApi.companies.updateUserRole(userRoleId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      setEditOpen(false);
      setEditingUser(null);
      setRole('user');
      setSuccess('User updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    }
  });
 
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await sendInvitationMutation.mutateAsync({ email, fullName, role });
      setInviteOpen(false);
      setEmail('');
      setFullName('');
      setRole('user');
      setSuccess('Invitation sent successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };
 
  const handleEditUser = (user: UserRoleWithProfile) => {
    setEditingUser(user);
    setRole(user.role);
    // Reset module permissions when opening edit dialog
    setModulePermissions({});
    setEditOpen(true);
  };
 
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
    // Save role first
    updateUserMutation.mutate({ userRoleId: editingUser.id, updates: { role } });
    
    // Also save module permissions (if not admin)
    if (role !== 'admin' && currentCompany) {
      updatePermissionsMutation.mutate();
    }
    
    setEditOpen(false);
  };
 
  const handleToggleStatus = async (user: UserRoleWithProfile) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    updateUserMutation.mutate({ userRoleId: user.id, updates: { status: newStatus } });
  };
 
  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitationMutation.mutateAsync(invitationId);
      setSuccess('Invitation cancelled');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };
 
  const pendingInvitations = invitations.filter(i => i.status === 'pending');
 
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ borderRadius: '12px' }}>
          You don't have permission to manage users. Only admins can access this page.
        </Alert>
      </Box>
    );
  }
 
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {success && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
          {success}
        </Alert>
      )}
 
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Team Members
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Manage users who can access {currentCompany?.name}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setInviteOpen(true)}
          sx={{
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            whiteSpace: 'nowrap',
          }}
        >
          Invite User
        </Button>
      </Box>
 
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3, minWidth: '300px', overflowX: 'auto' }}>
        <Tab label={`Team (${users.length})`} sx={{ minWidth: 'auto', px: 2 }} />
        <Tab label={`Pending (${pendingInvitations.length})`} sx={{ minWidth: 'auto', px: 2 }} />
      </Tabs>
 
      {tabValue === 0 && (
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {/* Mobile Card View */}
          {isLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>Loading...</Box>
          ) : users.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>No users found</Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {users.map((userRole) => (
                <Paper key={userRole.id} sx={{ p: 2, borderRadius: '12px', backgroundColor: '#fff' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      {userRole.role === 'admin' ? (
                        <AdminPanelSettings sx={{ color: '#22C55E' }} />
                      ) : (
                        <Person sx={{ color: '#3B82F6' }} />
                      )}
                      <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {userRole.full_name || userRole.email || 'Unknown User'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditUser(userRole)} sx={{ color: '#3B82F6' }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={userRole.status === 'active' ? 'Deactivate' : 'Activate'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleStatus(userRole)}
                          disabled={updateUserMutation.isPending}
                          sx={{ color: userRole.status === 'active' ? '#F59E0B' : '#22C55E' }}
                        >
                          {userRole.status === 'active' ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748B', mb: 1 }}>
                    {userRole.email || '-'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={userRole.role === 'admin' ? 'Admin' : 'User'}
                      size="small"
                      sx={{
                        backgroundColor: userRole.role === 'admin' ? '#DCFCE7' : '#DBEAFE',
                        color: userRole.role === 'admin' ? '#16A34A' : '#2563EB',
                        fontWeight: 600,
                      }}
                    />
                    <Chip 
                      label={userRole.status === 'active' ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        backgroundColor: userRole.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                        color: userRole.status === 'active' ? '#16A34A' : '#DC2626',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      )}

      {tabValue === 0 && (
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">Loading...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">No users found</TableCell>
                </TableRow>
              ) : (
                users.map((userRole) => (
                  <TableRow key={userRole.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {userRole.role === 'admin' ? (
                          <AdminPanelSettings sx={{ color: '#22C55E' }} />
                        ) : (
                          <Person sx={{ color: '#3B82F6' }} />
                        )}
                        {userRole.full_name || 'Unknown User'}
                      </Box>
                    </TableCell>
                    <TableCell>{userRole.email || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={userRole.role === 'admin' ? 'Admin' : 'User'}
                        size="small"
                        sx={{
                          backgroundColor: userRole.role === 'admin' ? '#DCFCE7' : '#DBEAFE',
                          color: userRole.role === 'admin' ? '#16A34A' : '#2563EB',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={userRole.status === 'active' ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          backgroundColor: userRole.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                          color: userRole.status === 'active' ? '#16A34A' : '#DC2626',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      {new Date(userRole.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Role">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(userRole)}
                          sx={{ color: '#3B82F6' }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={userRole.status === 'active' ? 'Deactivate' : 'Activate'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleStatus(userRole)}
                          disabled={updateUserMutation.isPending}
                          sx={{ color: userRole.status === 'active' ? '#F59E0B' : '#22C55E' }}
                        >
                          {userRole.status === 'active' ? <Block /> : <CheckCircle />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>
      )}
 
      {tabValue === 1 && (
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
          {/* Mobile Card View for Invitations */}
          {invitationsLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>Loading...</Box>
          ) : pendingInvitations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>No pending invitations</Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pendingInvitations.map((invitation) => (
                <Paper key={invitation.id} sx={{ p: 2, borderRadius: '12px', backgroundColor: '#fff' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Schedule sx={{ color: '#F59E0B' }} />
                      <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {invitation.full_name || invitation.email || 'Unknown'}
                      </Typography>
                    </Box>
                    <Tooltip title="Cancel">
                      <IconButton
                        size="small"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        disabled={cancelInvitationMutation.isPending}
                        sx={{ color: '#EF4444' }}
                      >
                        <Cancel fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748B', mb: 1 }}>
                    {invitation.email}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip 
                      label={invitation.role === 'admin' ? 'Admin' : 'User'}
                      size="small"
                      sx={{
                        backgroundColor: invitation.role === 'admin' ? '#DCFCE7' : '#DBEAFE',
                        color: invitation.role === 'admin' ? '#16A34A' : '#2563EB',
                        fontWeight: 600,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Expires</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invitationsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">Loading...</TableCell>
                </TableRow>
              ) : pendingInvitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">No pending invitations</TableCell>
                </TableRow>
              ) : (
                pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule sx={{ color: '#F59E0B' }} />
                        {invitation.full_name}
                      </Box>
                    </TableCell>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={invitation.role === 'admin' ? 'Admin' : 'User'}
                        size="small"
                        sx={{
                          backgroundColor: invitation.role === 'admin' ? '#DCFCE7' : '#DBEAFE',
                          color: invitation.role === 'admin' ? '#16A34A' : '#2563EB',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Cancel Invitation">
                        <IconButton
                          size="small"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          disabled={cancelInvitationMutation.isPending}
                          sx={{ color: '#EF4444' }}
                        >
                          <Cancel />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>
      )}
 
      {/* Invite User Dialog */}
      <Dialog 
        open={inviteOpen} 
        onClose={() => setInviteOpen(false)}
        PaperProps={{ sx: { borderRadius: '16px', minWidth: { xs: '90%', sm: 400 } } }}
      >
        <form onSubmit={handleInviteUser}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Send sx={{ color: '#3B82F6' }} />
              Invite User
            </Box>
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
                {error}
              </Alert>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Send an invitation email to join {currentCompany?.name}. They'll receive a link to create an account and join your team.
            </Typography>
            <TextField
              fullWidth
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                label="Role"
                onChange={(e) => setRole(e.target.value as AppRole)}
              >
                <MenuItem value="user">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" />
                    User - Can manage sales, payments, supplies
                  </Box>
                </MenuItem>
                <MenuItem value="admin">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AdminPanelSettings fontSize="small" />
                    Admin - Full access including user management
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={sendInvitationMutation.isPending}
              startIcon={sendInvitationMutation.isPending ? <CircularProgress size={16} /> : <Send />}
              sx={{
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              }}
            >
              {sendInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
 
      {/* Edit User Dialog */}
      <Dialog 
        open={editOpen} 
        onClose={() => setEditOpen(false)}
        PaperProps={{ 
          sx: { 
            borderRadius: '16px', 
            minWidth: { xs: '90%', sm: 500 },
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          } 
        }}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Fade}
        transitionDuration={300}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              p: 0.75, 
              borderRadius: 1.5, 
              bgcolor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Edit sx={{ color: '#3B82F6', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Edit User
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Manage role and permissions for {editingUser?.full_name || 'this user'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            Manage role and module access for {editingUser?.full_name || 'this user'}.
          </Typography>
          
          {/* Role Selection */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Role
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={role}
              label="Role"
              onChange={(e) => setRole(e.target.value as AppRole)}
            >
              <MenuItem value="user">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person fontSize="small" />
                  User
                </Box>
              </MenuItem>
              <MenuItem value="admin">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AdminPanelSettings fontSize="small" />
                  Admin
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
          
          {/* Module Permissions */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock fontSize="small" /> Module Permissions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select which modules this user can access
          </Typography>
          
          {loadingPermissions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Box sx={{ 
              maxHeight: 280, 
              overflowY: 'auto', 
              border: '1px solid #e2e8f0', 
              borderRadius: 2, 
              p: 1,
              bgcolor: '#f8fafc',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                bgcolor: '#f1f5f9',
                borderRadius: 3,
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: '#cbd5e1',
                borderRadius: 3,
                '&:hover': {
                  bgcolor: '#94a3b8',
                },
              },
            }}>
              {availableModules.map((module: any, index: number) => (
                <Box
                  key={module.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    mb: 0.5,
                    borderRadius: 1.5,
                    bgcolor: modulePermissions[module.id] !== false ? '#eff6ff' : 'transparent',
                    border: '1px solid',
                    borderColor: modulePermissions[module.id] !== false ? '#bfdbfe' : 'transparent',
                    transition: 'all 0.2s ease-in-out',
                    cursor: role === 'admin' ? 'not-allowed' : 'pointer',
                    opacity: role === 'admin' ? 0.7 : 1,
                    '&:hover': {
                      bgcolor: role === 'admin' ? undefined : modulePermissions[module.id] !== false ? '#dbeafe' : '#f1f5f9',
                      transform: role === 'admin' ? undefined : 'translateX(4px)',
                    },
                  }}
                  onClick={() => role !== 'admin' && handleModuleToggle(module.id)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Checkbox
                      checked={modulePermissions[module.id] !== false}
                      onChange={() => handleModuleToggle(module.id)}
                      disabled={role === 'admin'}
                      sx={{
                        color: '#94a3b8',
                        '&.Mui-checked': {
                          color: '#3b82f6',
                        },
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.1)',
                        },
                      }}
                    />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500,
                        color: modulePermissions[module.id] !== false ? '#1e293b' : '#64748b',
                      }}
                    >
                      {module.label}
                    </Typography>
                  </Box>
                  {modulePermissions[module.id] !== false ? (
                    <Box 
                      component="span" 
                      sx={{
                        fontSize: '0.7rem',
                        color: '#22c55e',
                        fontWeight: 600,
                        bgcolor: '#dcfce7',
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                      }}
                    >
                      Allowed
                    </Box>
                  ) : (
                    <Box 
                      component="span" 
                      sx={{
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                        fontWeight: 500,
                        bgcolor: '#f1f5f9',
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                      }}
                    >
                      Denied
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
          
          {role === 'admin' && (
            <Alert 
              severity="info" 
              sx={{ 
                mt: 2, 
                borderRadius: 2,
                bgcolor: '#eff6ff',
                border: '1px solid #bfdbfe',
                '& .MuiAlert-icon': {
                  color: '#3b82f6',
                },
              }}
            >
              Admins automatically have full access to all modules. Module permissions only apply to regular users.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveEdit}
            variant="contained"
            disabled={updateUserMutation.isPending}
            sx={{
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            }}
          >
            {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
