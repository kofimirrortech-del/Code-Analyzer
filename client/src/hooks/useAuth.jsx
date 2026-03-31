import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api.js';

export function useAuth() {
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').catch(() => null),
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: ({ username, password }) => api.post('/auth/login', { username, password }),
    onSuccess: (data) => {
      qc.setQueryData(['me'], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      qc.setQueryData(['me'], null);
      qc.clear();
      window.location.hash = '/login';
    },
    onError: () => {
      qc.setQueryData(['me'], null);
      window.location.hash = '/login';
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error?.message,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
