import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import djangoApi from '@/integrations/django/client';
import { useCompany } from '@/hooks/useCompany';
import { AppRole } from '@/lib/types';

export interface Invitation {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: AppRole;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by: string;
  expires_at: string;
  created_at: string;
}

export const useInvitations = () => {
  const { currentCompany } = useCompany();
  
  return useQuery({
    queryKey: ['invitations', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany) return [];
      const data = await djangoApi.invitations.list(currentCompany.id);
      return data as Invitation[];
    },
    enabled: !!currentCompany,
  });
};

export const useSendInvitation = () => {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  
  return useMutation({
    mutationFn: async ({
      email,
      fullName,
      role,
    }: {
      email: string;
      fullName: string;
      role: AppRole;
    }) => {
      if (!currentCompany) throw new Error('No company selected');
  
      const data = await djangoApi.invitations.send({
        companyId: currentCompany.id,
        email,
        fullName,
        role,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
};

export const useCancelInvitation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invitationId: string) => {
      await djangoApi.invitations.cancel(invitationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
};

export const useInvitationByToken = (token: string | undefined) => {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      if (!token) return null;
      const data = await djangoApi.invitations.getByToken(token);
      return data as Invitation & { company: { id: string; name: string } };
    },
    enabled: !!token,
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      const data = await djangoApi.invitations.accept(token);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
};
