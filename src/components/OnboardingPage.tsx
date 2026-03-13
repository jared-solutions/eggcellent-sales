import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  ArrowForward,
  ArrowBack,
  CheckCircle,
  Dashboard,
  Inventory2,
  ShoppingCart,
  People,
  Payment,
  LocalHospital,
  Celebration,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import djangoApi from '@/integrations/django/client';

interface OnboardingPageProps {
  onComplete: () => void;
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Daily Collections',
    description: 'Track your egg production',
    icon: <Inventory2 sx={{ fontSize: 40 }} />,
    details: [
      'Record daily egg collections',
      'Track production by flock',
      'Monitor egg quality and grades',
      'View production trends over time',
    ],
  },
  {
    id: 2,
    title: 'Sales Management',
    description: 'Manage your egg sales',
    icon: <ShoppingCart sx={{ fontSize: 40 }} />,
    details: [
      'Record sales transactions',
      'Track sales by customer',
      'Monitor daily and monthly sales',
      'Analyze sales performance',
    ],
  },
  {
    id: 3,
    title: 'Customer Management',
    description: 'Keep track of your customers',
    icon: <People sx={{ fontSize: 40 }} />,
    details: [
      'Add and manage customers',
      'Track customer contact info',
      'View customer order history',
      'Manage customer credit limits',
    ],
  },
  {
    id: 4,
    title: 'Payments & Finances',
    description: 'Track payments and expenses',
    icon: <Payment sx={{ fontSize: 40 }} />,
    details: [
      'Record customer payments',
      'Track outstanding balances',
      'Manage business expenses',
      'View financial summaries',
    ],
  },
  {
    id: 5,
    title: 'Flock Health',
    description: 'Monitor your chicken health',
    icon: <LocalHospital sx={{ fontSize: 40 }} />,
    details: [
      'Track flock mortality',
      'Record treatments and vaccinations',
      'Monitor flock health trends',
      'Get alerts for health issues',
    ],
  },
  {
    id: 6,
    title: 'Dashboard Overview',
    description: 'See your business at a glance',
    icon: <Dashboard sx={{ fontSize: 40 }} />,
    details: [
      'View key business metrics',
      'See daily collections and sales',
      'Monitor revenue and profits',
      'Get quick insights into your business',
    ],
  },
];

const ONBOARDING_COMPLETED_KEY = 'eggtrack_onboarding_completed';

export const OnboardingPage = ({ onComplete }: OnboardingPageProps) => {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [currentStep, setCurrentStep] = useState(0);
  
  const totalSteps = onboardingSteps.length + 1; // +1 for welcome screen
  const progress = ((currentStep + 1) / totalSteps) * 100;
  
  const userName = user?.first_name || user?.email?.split('@')[0] || 'there';
  const companyName = currentCompany?.name || 'your company';

  const handleNext = () => {
    if (currentStep < onboardingSteps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGetStarted = async () => {
    // Mark onboarding as completed in backend and localStorage
    try {
      await djangoApi.auth.completeOnboarding();
    } catch (error) {
      console.error('Failed to mark onboarding as completed in backend:', error);
    }
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    onComplete();
  };

  const isWelcomeScreen = currentStep === 0;
  const isLastStep = currentStep === onboardingSteps.length;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #388E3C 100%)',
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: '100%',
          maxWidth: 600,
          p: { xs: 3, sm: 5 },
          borderRadius: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Progress Bar */}
        <Box sx={{ mb: 4 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#E8F5E9',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #4CAF50 0%, #2E7D32 100%)',
                borderRadius: 4,
              },
            }}
          />
          <Typography 
            variant="caption" 
            sx={{ color: '#666', mt: 1, display: 'block', textAlign: 'right' }}
          >
            {currentStep + 1} of {totalSteps}
          </Typography>
        </Box>

        {/* Welcome Screen */}
        {isWelcomeScreen ? (
          <Box sx={{ textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                fontSize: '2.5rem',
                fontWeight: 700,
                mx: 'auto',
                mb: 3,
                boxShadow: '0 8px 32px rgba(46, 125, 50, 0.3)',
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </Avatar>
            
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 800, 
                mb: 2, 
                color: '#1B5E20',
                fontSize: { xs: '1.75rem', sm: '2.5rem' }
              }}
            >
              Welcome, {userName}! 🎉
            </Typography>
            
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#555', 
                mb: 4,
                fontWeight: 500,
              }}
            >
              Congratulations on setting up <strong>{companyName}</strong>!
            </Typography>

            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666', 
                mb: 4,
                lineHeight: 1.8,
                maxWidth: 450,
                mx: 'auto',
              }}
            >
              Let us take a quick tour of <strong>EggTrack Pro</strong> and discover 
              how you can streamline your egg production and sales management.
            </Typography>

            <Box
              sx={{
                p: 3,
                borderRadius: '16px',
                backgroundColor: '#E8F5E9',
                mb: 4,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#2E7D32', mb: 2 }}>
                What you will learn:
              </Typography>
              <Box sx={{ textAlign: 'left', display: 'inline-block' }}>
                {onboardingSteps.map((step) => (
                  <Box key={step.id} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <CheckCircle sx={{ color: '#4CAF50', fontSize: 18, mr: 1.5 }} />
                    <Typography variant="body2" sx={{ color: '#333' }}>
                      {step.title}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={handleNext}
              endIcon={<ArrowForward />}
              sx={{
                py: 1.5,
                px: 5,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                fontSize: '1.1rem',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(46, 125, 50, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #388E3C 0%, #1B5E20 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(46, 125, 50, 0.5)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Let us Start the Tour
            </Button>
          </Box>
        ) : isLastStep ? (
          // Final Step - Get Started
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                boxShadow: '0 8px 32px rgba(255, 160, 0, 0.3)',
              }}
            >
              <Celebration sx={{ fontSize: 50, color: 'white' }} />
            </Box>
            
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 800, 
                mb: 2, 
                color: '#1B5E20',
              }}
            >
              You are All Set, {userName}! 🚀
            </Typography>
            
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666', 
                mb: 4,
                lineHeight: 1.8,
                maxWidth: 450,
                mx: 'auto',
              }}
            >
              You now have access to all the features of EggTrack Pro. 
              Start tracking your egg production, manage sales, and grow your business!
            </Typography>

            <Box
              sx={{
                p: 3,
                borderRadius: '16px',
                backgroundColor: '#FFF8E1',
                border: '2px solid #FFD700',
                mb: 4,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#F57C00', mb: 2 }}>
                💡 Quick Tips:
              </Typography>
              <Typography variant="body2" sx={{ color: '#333', mb: 1 }}>
                • Use the sidebar to navigate between sections
              </Typography>
              <Typography variant="body2" sx={{ color: '#333', mb: 1 }}>
                • Check the Dashboard for quick insights
              </Typography>
              <Typography variant="body2" sx={{ color: '#333' }}>
                • Add customers and start recording sales
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                size="large"
                onClick={handleBack}
                startIcon={<ArrowBack />}
                sx={{
                  py: 1.5,
                  px: 4,
                  borderRadius: '12px',
                  borderColor: '#4CAF50',
                  color: '#4CAF50',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#2E7D32',
                    backgroundColor: '#E8F5E9',
                  },
                }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleGetStarted}
                endIcon={<CheckCircle />}
                sx={{
                  py: 1.5,
                  px: 5,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: '#333',
                  boxShadow: '0 4px 14px rgba(255, 160, 0, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #FFC107 0%, #FF8F00 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(255, 160, 0, 0.5)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Get Started
              </Button>
            </Box>
          </Box>
        ) : (
          // Tutorial Steps
          <Box>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  color: '#2E7D32',
                }}
              >
                {onboardingSteps[currentStep - 1].icon}
              </Box>
              
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 1, 
                  color: '#1B5E20',
                }}
              >
                {onboardingSteps[currentStep - 1].title}
              </Typography>
              
              <Typography 
                variant="body1" 
                sx={{ 
                  color: '#666',
                  mb: 3,
                }}
              >
                {onboardingSteps[currentStep - 1].description}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 3,
                borderRadius: '16px',
                backgroundColor: '#FAFAFA',
                mb: 4,
              }}
            >
              {onboardingSteps[currentStep - 1].details.map((detail, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    mb: 2,
                    '&:last-child': { mb: 0 }
                  }}
                >
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      mr: 2,
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography variant="body2" sx={{ color: '#333', lineHeight: 1.6 }}>
                    {detail}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                size="large"
                onClick={handleBack}
                startIcon={<ArrowBack />}
                sx={{
                  py: 1.5,
                  px: 4,
                  borderRadius: '12px',
                  borderColor: '#9E9E9E',
                  color: '#666',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#666',
                    backgroundColor: '#F5F5F5',
                  },
                }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={handleNext}
                endIcon={<ArrowForward />}
                sx={{
                  py: 1.5,
                  px: 5,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(46, 125, 50, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #388E3C 0%, #1B5E20 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(46, 125, 50, 0.5)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {currentStep === onboardingSteps.length - 1 ? 'Finish Tour' : 'Next'}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

// Check if onboarding should be shown
export const shouldShowOnboarding = (): boolean => {
  const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
  return completed !== 'true';
};

// Reset onboarding (for testing or re-onboarding)
export const resetOnboarding = () => {
  localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
};
