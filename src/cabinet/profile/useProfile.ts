import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, requestContactChange, resendContactCode, saveProfile, verifyContactChange } from './api';

export function useProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => {
      if (!userId) throw new Error('Authentication required');
      return getProfile(userId);
    },
    enabled: Boolean(userId),
  });
}

export function useProfileActions(userId: string | undefined) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: saveProfile,
    onSuccess: async () => {
      if (!userId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['account', userId] }),
      ]);
    },
  });

  const requestChange = useMutation({ mutationFn: requestContactChange });
  const resendCode = useMutation({ mutationFn: resendContactCode });
  const verifyChange = useMutation({
    mutationFn: verifyContactChange,
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: ['account', userId] });
    },
  });

  return { save, requestChange, resendCode, verifyChange };
}
