import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import djangoApi from '@/integrations/django/client';
import { useAuth } from '@/hooks/useAuth';
import { Company, UserRole, AppRole } from '@/lib/types';

interface CompanyContextType {
  companies: Company[];
  currentCompany: Company | null;
  userRole: AppRole | null;
  loading: boolean;
  selectCompany: (company: Company) => void;
  createCompany: (name: string, slug: string) => Promise<Company>;
  updateCompany: (id: string, data: { name?: string; slug?: string }) => Promise<Company>;
  isAdmin: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const COMPANY_STORAGE_KEY = 'eggtrack_selected_company';

export const CompanyProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  // Restore company from localStorage immediately before any API calls
  const [currentCompany, setCurrentCompany] = useState<Company | null>(() => {
    const savedId = localStorage.getItem(COMPANY_STORAGE_KEY);
    if (savedId) {
      // Return placeholder - will be synced with full data when API loads
      return { id: savedId, name: '', slug: '', logo_url: null, created_at: '', updated_at: '' } as Company;
    }
    return null;
  });
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const queryClient = useQueryClient();

  // Fetch user's companies
  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const roles = await djangoApi.companies.getMyRoles();
      return roles as (UserRole & { company: Company })[];
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
  });

  const companies = userRoles.map((ur: any) => ur.company);

  // Keep userRole in sync with the selected company
  useEffect(() => {
    if (!currentCompany || !currentCompany.name) {
      setUserRole(null);
      return;
    }
    const role = userRoles.find((ur: any) => ur.company?.id === currentCompany?.id)?.role;
    setUserRole(role || null);
  }, [currentCompany, userRoles]);

  // Auto-select an admin company if current company is invalid or user has no access
  useEffect(() => {
    if (rolesLoading || companies.length === 0) return;
    
    // Check if current company is still valid for this user
    const hasAccessToCurrentCompany = currentCompany && 
      companies.some((c: Company) => c.id === currentCompany.id);
    
    if (!hasAccessToCurrentCompany) {
      // Current company is not valid - auto-select an admin company
      // First priority: company where user is admin
      const adminRole = userRoles.find((ur: any) => ur.role === 'admin');
      if (adminRole) {
        setCurrentCompany(adminRole.company);
        setUserRole('admin');
        localStorage.setItem(COMPANY_STORAGE_KEY, adminRole.company.id);
      } else if (userRoles.length > 0) {
        // No admin role, select first company
        setCurrentCompany(userRoles[0].company);
        setUserRole(userRoles[0].role);
        localStorage.setItem(COMPANY_STORAGE_KEY, userRoles[0].company.id);
      }
    }
  }, [rolesLoading, companies, currentCompany, userRoles]);

  // Sync company data when API loads
  useEffect(() => {
    if (rolesLoading || companies.length === 0) return;
    
    // If currentCompany is a placeholder (no name), find the full data
    if (currentCompany && !currentCompany.name) {
      const fullCompany = companies.find((c: Company) => c.id === currentCompany.id);
      if (fullCompany) {
        setCurrentCompany(fullCompany);
      } else {
        // Company not found in user's companies - need to select a new one
        // Prioritize company where user is admin
        const adminRole = userRoles.find((ur: any) => ur.role === 'admin');
        if (adminRole) {
          setCurrentCompany(adminRole.company);
          localStorage.setItem(COMPANY_STORAGE_KEY, adminRole.company.id);
        } else if (userRoles.length > 0) {
          // No admin role, select first company
          setCurrentCompany(userRoles[0].company);
          localStorage.setItem(COMPANY_STORAGE_KEY, userRoles[0].company.id);
        }
      }
    }
  }, [companies, currentCompany, rolesLoading, userRoles]);

  const selectCompany = useCallback((company: Company) => {
    setCurrentCompany(company);
    localStorage.setItem(COMPANY_STORAGE_KEY, company.id);
    const role = userRoles.find((ur: any) => ur.company?.id === company.id)?.role;
    setUserRole(role || null);
    // Invalidate all queries when company changes
    queryClient.invalidateQueries();
  }, [userRoles, queryClient]);

  const createCompanyMutation = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const company = await djangoApi.companies.createWithAdmin(name, slug);
      return company as Company;
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      selectCompany(company);
    }
  });

  const createCompany = async (name: string, slug: string): Promise<Company> => {
    return createCompanyMutation.mutateAsync({ name, slug });
  };

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; slug?: string } }) => {
      const company = await djangoApi.companies.update(id, data);
      return company as Company;
    },
    onSuccess: (company) => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      // Update current company if it's the one being edited
      if (currentCompany?.id === company.id) {
        setCurrentCompany(company);
      }
    }
  });

  const updateCompany = async (id: string, data: { name?: string; slug?: string }): Promise<Company> => {
    return updateCompanyMutation.mutateAsync({ id, data });
  };

  return (
    <CompanyContext.Provider 
      value={{ 
        companies, 
        currentCompany, 
        userRole,
        loading: rolesLoading,
        selectCompany,
        createCompany,
        updateCompany,
        isAdmin: userRole === 'admin'
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
