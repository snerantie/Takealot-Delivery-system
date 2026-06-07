import { DepositStatus, VerificationStatus } from '@prisma/client';
import { getBankProvider } from './bankVerification';

export interface VerificationOutcome {
  depositStatus: DepositStatus;
  verificationStatus: VerificationStatus;
  verifiedAmount: number | null;
  discrepancyAmount: number;
  discrepancyReason: string | null;
  verifiedAt: Date | null;
  bankReference: string | null;
  message: string;
}

/**
 * Run automated verification of an ATM deposit against the expected (collected)
 * amount and return the resulting status fields. Pure-ish: only side effect is
 * the provider lookup. The caller persists the outcome.
 */
export const verifyDeposit = async (params: {
  atmReference: string;
  amountCollected: number;
  bankName?: string;
  depositTime?: Date;
}): Promise<VerificationOutcome> => {
  const result = await getBankProvider().lookupDeposit({
    atmReference: params.atmReference,
    expectedAmount: params.amountCollected,
    bankName: params.bankName,
    depositTime: params.depositTime,
  });

  if (!result.found || result.confirmedAmount === null) {
    return {
      depositStatus: 'disputed',
      verificationStatus: 'failed',
      verifiedAmount: null,
      discrepancyAmount: 0,
      discrepancyReason: 'No matching deposit found for the provided ATM reference',
      verifiedAt: null,
      bankReference: result.bankReference,
      message: 'Deposit could not be found. Please double-check the ATM reference.',
    };
  }

  const discrepancy = Number((params.amountCollected - result.confirmedAmount).toFixed(2));

  if (discrepancy !== 0) {
    return {
      depositStatus: 'disputed',
      verificationStatus: 'failed',
      verifiedAmount: result.confirmedAmount,
      discrepancyAmount: discrepancy,
      discrepancyReason: `Collected R${params.amountCollected.toFixed(2)} but deposit confirms R${result.confirmedAmount.toFixed(2)}`,
      verifiedAt: null,
      bankReference: result.bankReference,
      message: 'Deposit amount does not match the cash collected. Flagged for review.',
    };
  }

  return {
    depositStatus: 'verified',
    verificationStatus: 'verified',
    verifiedAmount: result.confirmedAmount,
    discrepancyAmount: 0,
    discrepancyReason: null,
    verifiedAt: result.confirmedAt ?? new Date(),
    bankReference: result.bankReference,
    message: 'Deposit verified successfully.',
  };
};
