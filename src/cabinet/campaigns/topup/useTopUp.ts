import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { queryKeys } from '../../queryKeys';
import { CABINET_LINKS } from '../../sections';
import { CampaignRpcError, extendCampaign, type TopUpInvoice } from '../api';
import type { TopUpCampaign, TopUpTerms } from './model';
import type { TopUpReceipt } from './receipt';

interface TopUpOptions {
  userId: string;
  campaign: TopUpCampaign;
  terms: TopUpTerms;
  /** Fallback address for the success screen when the invoice doesn't name one. */
  email: string;
  /** Reloads the campaign when the server says its terms changed meanwhile. */
  refetch: () => Promise<unknown>;
}

function demoExtend(amount: number, pricePerPlay: number): Promise<TopUpInvoice> {
  return new Promise((resolve) => window.setTimeout(() => resolve({ amount, sentTo: 'marketing@company.kz', pricePerPlay }), 600));
}

/** The top-up form: amount, consent to changed terms, and the `extend_campaign` call. */
export function useTopUp({ userId, campaign, terms, email, refetch }: TopUpOptions) {
  const [amount, setAmount] = useState<number | null>(terms.minimum);
  // Consent is given to a version of the terms; a newer version needs it again.
  const [agreedVersion, setAgreedVersion] = useState<number | null>(null);
  const [attempted, setAttempted] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const invoice = useMutation({
    mutationFn: (value: number) => (userId === 'demo' ? demoExtend(value, terms.pricePerPlay) : extendCampaign(campaign.id, value, terms.version)),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home(userId) });
      const receipt: TopUpReceipt = {
        name: campaign.name,
        tariff: campaign.tariff,
        amount: result.amount,
        pricePerPlay: result.pricePerPlay ?? terms.pricePerPlay,
        email: result.sentTo ?? email,
      };
      navigate(CABINET_LINKS.campaignTopUpSent(campaign.id), { replace: true, state: receipt });
    },
    onError: (error) => {
      if (error instanceof CampaignRpcError && error.code === 'tariff_changed') void refetch();
    },
  });

  const code = invoice.error ? (invoice.error instanceof CampaignRpcError ? invoice.error.code : 'network') : null;
  const agreed = !terms.changed || agreedVersion === terms.version;
  let amountError: 'required' | 'min' | null = null;
  if (attempted || code === 'invalid_amount') {
    if (amount === null) amountError = 'required';
    else if (amount < terms.minimum || code === 'invalid_amount') amountError = 'min';
  }

  const send = () => {
    setAttempted(true);
    if (amount === null || amount < terms.minimum || !agreed) return;
    invoice.mutate(amount);
  };

  return {
    amount,
    setAmount: (value: number | null) => {
      setAmount(value);
      if (code === 'invalid_amount') invoice.reset();
    },
    agreed,
    setAgreed: (value: boolean) => setAgreedVersion(value ? terms.version : null),
    amountError,
    submitting: invoice.isPending,
    /** Server check that failed (`missing_email`, `tariff_changed`…), `network` for anything else; field errors are not here. */
    error: code === 'invalid_amount' ? null : code,
    submit: send,
  };
}

export type TopUpState = ReturnType<typeof useTopUp>;
