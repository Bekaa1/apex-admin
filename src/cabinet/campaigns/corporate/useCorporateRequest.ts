import { useMutation } from '@tanstack/react-query';
import { CampaignRpcError, submitCorporateRequest } from '../api';

/** Sends the corporate request; `errorCode` is the failed server check (`invalid_phone`, `too_many_requests`…) or `network`. */
export function useCorporateRequest() {
  const mutation = useMutation({ mutationFn: submitCorporateRequest });
  let errorCode: string | null = null;
  if (mutation.error) errorCode = mutation.error instanceof CampaignRpcError ? mutation.error.code : 'network';
  return { send: mutation.mutate, sending: mutation.isPending, sent: mutation.isSuccess, errorCode };
}
