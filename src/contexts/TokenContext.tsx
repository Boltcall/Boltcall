import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { TOKEN_REWARDS } from '../lib/tokens';
import type { TokenRewardType, TokenCostType } from '../lib/tokens';

interface TokenBalance {
  id: string;
  user_id: string;
  balance: number;
  bonus_balance: number;
  plan_tokens_monthly: number;
  tokens_used_this_period: number;
  period_start: string;
  period_end: string | null;
  created_at: string;
  updated_at: string;
}

interface ConsumeResult {
  success: boolean;
  remainingBalance: number;
  error?: string;
}

interface ClaimResult {
  success: boolean;
  alreadyClaimed: boolean;
  tokensAwarded: number;
  error?: string;
}

interface TokenContextType {
  balance: number;
  bonusBalance: number;
  totalAvailable: number;
  monthlyAllocation: number;
  tokensUsed: number;
  isLoading: boolean;
  consumeTokens: (amount: number, category: TokenCostType, description: string) => Promise<ConsumeResult>;
  claimReward: (rewardType: TokenRewardType) => Promise<ClaimResult>;
  refetch: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTokenBalance = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setTokenBalance(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('token_balances')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching token balance:', error);
      }

      // Auto-create token balance with 50 free credits. Upsert (not insert)
      // so concurrent mounts don't race into a 409 on user_id.
      if (!data && !error) {
        const { error: upsertError } = await supabase
          .from('token_balances')
          .upsert(
            {
              user_id: user.id,
              balance: 0,
              bonus_balance: 50,
              tokens_used_this_period: 0,
            },
            { onConflict: 'user_id', ignoreDuplicates: true },
          );
        if (!upsertError) {
          const { data: created } = await supabase
            .from('token_balances')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          setTokenBalance(created as TokenBalance | null);
          return;
        }
      }

      setTokenBalance(data as TokenBalance | null);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setTokenBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    fetchTokenBalance();
  }, [fetchTokenBalance]);

  const consumeTokens = async (
    amount: number,
    category: TokenCostType,
    description: string
  ): Promise<ConsumeResult> => {
    if (!user?.id || !tokenBalance) {
      return { success: false, remainingBalance: 0, error: 'Not authenticated or no token balance found.' };
    }

    const totalAvailable = tokenBalance.balance + tokenBalance.bonus_balance;
    if (totalAvailable < amount) {
      return { success: false, remainingBalance: totalAvailable, error: `Insufficient tokens. You need ${amount} but only have ${totalAvailable} available.` };
    }

    // Deduct from bonus_balance first, then balance
    let bonusDeduct = Math.min(tokenBalance.bonus_balance, amount);
    let balanceDeduct = amount - bonusDeduct;

    const newBonusBalance = tokenBalance.bonus_balance - bonusDeduct;
    const newBalance = tokenBalance.balance - balanceDeduct;
    const newTokensUsed = tokenBalance.tokens_used_this_period + amount;

    // Update token_balances
    const { error: updateError } = await supabase
      .from('token_balances')
      .update({
        balance: newBalance,
        bonus_balance: newBonusBalance,
        tokens_used_this_period: newTokensUsed,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating token balance:', updateError);
      return { success: false, remainingBalance: totalAvailable, error: 'Failed to update token balance. Please try again.' };
    }

    // Insert transaction record
    const { error: txError } = await supabase
      .from('token_transactions')
      .insert({
        user_id: user.id,
        amount,
        type: 'debit',
        category,
        description,
        metadata: { bonus_deducted: bonusDeduct, balance_deducted: balanceDeduct },
      });

    if (txError) {
      console.error('Error inserting token transaction:', txError);
    }

    // Update local state
    setTokenBalance((prev) =>
      prev
        ? {
            ...prev,
            balance: newBalance,
            bonus_balance: newBonusBalance,
            tokens_used_this_period: newTokensUsed,
            updated_at: new Date().toISOString(),
          }
        : null
    );

    return { success: true, remainingBalance: newBalance + newBonusBalance };
  };

  const claimReward = async (rewardType: TokenRewardType): Promise<ClaimResult> => {
    if (!user?.id) {
      return { success: false, alreadyClaimed: false, tokensAwarded: 0, error: 'Not authenticated.' };
    }

    const reward = TOKEN_REWARDS[rewardType];

    // Check if already claimed
    const { data: existing, error: checkError } = await supabase
      .from('token_rewards')
      .select('id')
      .eq('user_id', user.id)
      .eq('reward_type', rewardType)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking reward:', checkError);
      return { success: false, alreadyClaimed: false, tokensAwarded: 0, error: 'Failed to check reward status.' };
    }

    if (existing) {
      return { success: false, alreadyClaimed: true, tokensAwarded: 0 };
    }

    // Insert reward record
    const { error: rewardError } = await supabase
      .from('token_rewards')
      .insert({
        user_id: user.id,
        reward_type: rewardType,
        tokens_awarded: reward.tokens,
      });

    if (rewardError) {
      console.error('Error inserting reward:', rewardError);
      return { success: false, alreadyClaimed: false, tokensAwarded: 0, error: 'Failed to claim reward. Please try again.' };
    }

    // Add to bonus_balance
    const currentBonus = tokenBalance?.bonus_balance ?? 0;
    const newBonusBalance = currentBonus + reward.tokens;

    const { error: updateError } = await supabase
      .from('token_balances')
      .update({
        bonus_balance: newBonusBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating bonus balance:', updateError);
      // Reward was inserted but balance update failed — still return success
    }

    // Insert credit transaction
    const { error: txError } = await supabase
      .from('token_transactions')
      .insert({
        user_id: user.id,
        amount: reward.tokens,
        type: 'credit',
        category: rewardType,
        description: reward.label,
        metadata: { reward_type: rewardType },
      });

    if (txError) {
      console.error('Error inserting reward transaction:', txError);
    }

    // Update local state
    setTokenBalance((prev) =>
      prev
        ? {
            ...prev,
            bonus_balance: newBonusBalance,
            updated_at: new Date().toISOString(),
          }
        : null
    );

    return { success: true, alreadyClaimed: false, tokensAwarded: reward.tokens };
  };

  const value: TokenContextType = {
    balance: tokenBalance?.balance ?? 0,
    bonusBalance: tokenBalance?.bonus_balance ?? 0,
    totalAvailable: (tokenBalance?.balance ?? 0) + (tokenBalance?.bonus_balance ?? 0),
    monthlyAllocation: tokenBalance?.plan_tokens_monthly ?? 0,
    tokensUsed: tokenBalance?.tokens_used_this_period ?? 0,
    isLoading,
    consumeTokens,
    claimReward,
    refetch: fetchTokenBalance,
  };

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTokens = () => {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useTokens must be used within a TokenProvider');
  }
  return context;
};
