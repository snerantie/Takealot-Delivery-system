/**
 * Bank / ATM deposit verification.
 *
 * This module abstracts the "confirm a cash deposit" capability behind a small
 * provider interface so a real banking integration (e.g. a bank's deposit
 * reference lookup API, or statement reconciliation feed) can be dropped in
 * without touching the COD business logic.
 *
 * Selection is driven by env:
 *   BANK_VERIFICATION_PROVIDER = "simulated" (default) | "http"
 *   BANK_API_URL / BANK_API_KEY  (used by the http provider)
 *
 * NOTE: The simulated provider is for development/demo only. It deterministically
 * derives a result from the reference so every code path is exercisable:
 *   - reference containing "NOTFOUND"  -> deposit not found
 *   - reference containing "MISMATCH"  -> found, but amount is short by R50
 *   - otherwise                        -> found, amount matches what was collected
 */

export interface DepositLookupRequest {
  atmReference: string;
  expectedAmount: number;
  bankName?: string;
  depositTime?: Date;
}

export interface DepositLookupResult {
  found: boolean;
  confirmedAmount: number | null;
  confirmedAt: Date | null;
  bankReference: string | null;
  /** Raw provider payload, useful for audit/debugging. */
  raw?: unknown;
}

export interface BankVerificationProvider {
  readonly name: string;
  lookupDeposit(req: DepositLookupRequest): Promise<DepositLookupResult>;
}


class SimulatedBankProvider implements BankVerificationProvider {
  readonly name = 'simulated';

  async lookupDeposit(req: DepositLookupRequest): Promise<DepositLookupResult> {
    const ref = req.atmReference.toUpperCase();

    // Simulate network latency
    await new Promise((r) => setTimeout(r, 150));

    if (ref.includes('NOTFOUND')) {
      return { found: false, confirmedAmount: null, confirmedAt: null, bankReference: null };
    }

    const confirmedAmount = ref.includes('MISMATCH')
      ? Math.max(0, req.expectedAmount - 50)
      : req.expectedAmount;

    return {
      found: true,
      confirmedAmount,
      confirmedAt: req.depositTime ?? new Date(),
      bankReference: `SIM-${req.atmReference}`,
      raw: { provider: 'simulated', matched: confirmedAmount === req.expectedAmount },
    };
  }
}

/**
 * Skeleton for a real HTTP-based provider. Left intentionally minimal — wire it
 * to the chosen bank's deposit-confirmation endpoint and map the response.
 */
class HttpBankProvider implements BankVerificationProvider {
  readonly name = 'http';

  async lookupDeposit(req: DepositLookupRequest): Promise<DepositLookupResult> {
    const baseUrl = process.env.BANK_API_URL;
    const apiKey = process.env.BANK_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error('BANK_API_URL and BANK_API_KEY must be set for the http provider');
    }

    const res = await fetch(`${baseUrl}/deposits/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        reference: req.atmReference,
        amount: req.expectedAmount,
        bank: req.bankName,
      }),
    });

    if (!res.ok) {
      return { found: false, confirmedAmount: null, confirmedAt: null, bankReference: null };
    }

    const data = (await res.json()) as {
      found?: boolean;
      amount?: number;
      confirmedAt?: string;
      reference?: string;
    };

    return {
      found: !!data.found,
      confirmedAmount: typeof data.amount === 'number' ? data.amount : null,
      confirmedAt: data.confirmedAt ? new Date(data.confirmedAt) : null,
      bankReference: data.reference ?? null,
      raw: data,
    };
  }
}

let provider: BankVerificationProvider | null = null;

export const getBankProvider = (): BankVerificationProvider => {
  if (provider) return provider;
  provider =
    process.env.BANK_VERIFICATION_PROVIDER === 'http'
      ? new HttpBankProvider()
      : new SimulatedBankProvider();
  return provider;
};
