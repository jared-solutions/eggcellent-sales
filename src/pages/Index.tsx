import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box, Typography } from '@mui/material';
import theme from '@/lib/theme';
import { useAuth } from '@/hooks/useAuth';
import { CompanyProvider, useCompany } from '@/hooks/useCompany';
import { AuthPage } from '@/components/AuthPage';
import { CompanySetupPage } from '@/components/CompanySetupPage';
import { OnboardingPage, shouldShowOnboarding } from '@/components/OnboardingPage';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DashboardPage } from '@/components/DashboardPage';
import { CustomersPage } from '@/components/CustomersPage';
import { SuppliesPage } from '@/components/SuppliesPage';
import { SalesPage } from '@/components/SalesPage';
import { UsersPage } from '@/components/UsersPage';
import { PaymentsPage } from '@/components/PaymentsPage';
import { PricingPage } from '@/components/PricingPage';
import { ExpensesPage } from '@/components/ExpensesPage';
import DepositsPage from '@/components/DepositsPage';
import { CollectionsPage } from '@/components/CollectionsPage';
import { SettingsPage } from '@/components/SettingsPage';
import { ReportsPage } from '@/components/ReportsPage';
import { FlockHealthPage } from '@/components/FlockHealthPage';
import { ProfilePage } from '@/components/ProfilePage';
import NotificationsPage from '@/components/NotificationsPage';
import djangoApi from '@/integrations/django/client';

const PAGE_STORAGE_KEY = 'eggtrack_current_page';
const LAST_LOGIN_KEY = 'eggtrack_last_login';
const COMPANY_STORAGE_KEY = 'eggtrack_selected_company';
const FIRST_LOGIN_KEY = 'eggtrack_first_login_done';

const AppContent = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, onboardingCompleted } = useAuth();
  const { currentCompany, loading: companyLoading } = useCompany();
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem(PAGE_STORAGE_KEY);
    return saved || 'dashboard';
  });
  const [showCompanySetup, setShowCompanySetup] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [highlightAction, setHighlightAction] = useState<string | null>(null);

  // Show company setup when user has no current company
  // Also check for pending invitations
  useEffect(() => {
    const checkCompanyAndInvitations = async () => {
      // Skip if there's a saved company in localStorage
      // CompanyProvider will restore it after loading
      const savedCompanyId = localStorage.getItem(COMPANY_STORAGE_KEY);
      if (savedCompanyId) {
        // Wait for CompanyProvider to restore the company
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (user && !companyLoading && !currentCompany) {
        // Use a ref to track if we're already checking to avoid infinite loops
        if ((checkCompanyAndInvitations as any).isChecking) return;
        (checkCompanyAndInvitations as any).isChecking = true;
        
        try {
          // Check if user has pending invitations
          const pendingInvites = await djangoApi.invitations.getPendingByEmail(user.email);
          
          if (pendingInvites && pendingInvites.length > 0) {
            // User has pending invitations - redirect to accept the first one
            const firstInvite = pendingInvites[0];
            navigate(`/accept-invite/${firstInvite.token}`);
          } else {
            // No pending invitations - show company setup
            setShowCompanySetup(true);
          }
        } catch (err) {
          console.error('Error checking invitations:', err);
          // On error, show company setup as fallback
          setShowCompanySetup(true);
        } finally {
          (checkCompanyAndInvitations as any).isChecking = false;
        }
      }
    };

    checkCompanyAndInvitations();
  }, [user, companyLoading, currentCompany, navigate]);

  // Check if this is a new login (clear saved page for new users)
  useEffect(() => {
    const lastLogin = localStorage.getItem(LAST_LOGIN_KEY);
    const currentTime = Date.now();
    const firstLoginDone = localStorage.getItem(FIRST_LOGIN_KEY);
    
    // If last login was more than 30 minutes ago, or no login recorded, start fresh
    if (!lastLogin || (currentTime - parseInt(lastLogin)) > 30 * 60 * 1000) {
      localStorage.setItem(PAGE_STORAGE_KEY, 'dashboard');
      setCurrentPage('dashboard');
    }
    
    // Update last login time
    localStorage.setItem(LAST_LOGIN_KEY, currentTime.toString());
    
    // Mark first login as done after first login completes
    if (!firstLoginDone) {
      localStorage.setItem(FIRST_LOGIN_KEY, 'true');
    }
  }, []);

  // Check if onboarding should be shown - only for new users who haven't completed it
  // Uses the onboardingCompleted from auth context (set during login from backend)
  useEffect(() => {
    if (!currentCompany || !currentCompany.id) return;
    if (!user) return;
    
    // Only show onboarding if onboardingCompleted is explicitly false
    // For existing members, onboardingCompleted should be true (or undefined, which defaults to not showing)
    if (onboardingCompleted === false) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [currentCompany, user, onboardingCompleted]);

  if (authLoading || (user && companyLoading)) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
          gap: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Box
          component="img"
          src="/real logo and favicon.png"
          alt="Logo"
          sx={{
            width: 80,
            height: 80,
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        />
        <CircularProgress sx={{ color: 'white' }} size={40} />
        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
          Loading EggTrack Pro...
        </Typography>
      </Box>
    );
  }

  if (!user) return <AuthPage />;

  // If there's no current company at all (not even a placeholder), show setup
  // The company is now restored immediately from localStorage in useCompany hook
  if (!currentCompany) {
    return <CompanySetupPage onComplete={() => setShowCompanySetup(false)} />;
  }

  if (showCompanySetup) {
    return <CompanySetupPage onComplete={() => {
      setShowCompanySetup(false);
      // After company setup, show onboarding for first-time users
      if (shouldShowOnboarding()) {
        setShowOnboarding(true);
      }
    }} />;
  }

  // Show onboarding for new users
  if (showOnboarding) {
    return <OnboardingPage onComplete={() => setShowOnboarding(false)} />;
  }

  const handlePageChange = (page: string, action?: string) => {
    setCurrentPage(page);
    localStorage.setItem(PAGE_STORAGE_KEY, page);
    // Set highlight action if provided (from notification click)
    // Map action_url to the correct highlight action
    let highlightAction: string | null = null;
    if (action) {
      // Map the action URL to highlight action
      if (action === 'settings') {
        highlightAction = 'feed-settings';
      } else if (action === 'prices') {
        highlightAction = 'prices';
      } else if (action === 'health') {
        highlightAction = 'vaccination';
      } else {
        highlightAction = action;
      }
      setHighlightAction(highlightAction);
    } else {
      setHighlightAction(null);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'customers': return <CustomersPage />;
      case 'collections': return <CollectionsPage />;
      case 'supplies': return <SuppliesPage />;
      case 'sales': return <SalesPage />;
      case 'payments': return <PaymentsPage />;
      case 'expenses': return <ExpensesPage />;
      case 'deposits': return <DepositsPage />;
      case 'settings': return <SettingsPage highlightAction={highlightAction} onActionComplete={() => setHighlightAction(null)} />;
      case 'prices': return <PricingPage highlightAction={highlightAction} onActionComplete={() => setHighlightAction(null)} />;
      case 'users': return <UsersPage />;
      case 'reports': return <ReportsPage />;
      case 'health': return <FlockHealthPage highlightAction={highlightAction} onActionComplete={() => setHighlightAction(null)} />;
      case 'profile': return <ProfilePage />;
      case 'notifications': return <NotificationsPage onPageChange={handlePageChange} />;
      default: return <DashboardPage />;
    }
  };

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={handlePageChange}>
      {renderPage()}
    </DashboardLayout>
  );
};

const AppWithCompany = () => (
  <CompanyProvider>
    <AppContent />
  </CompanyProvider>
);

const Index = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AppWithCompany />
  </ThemeProvider>
);

export default Index;
