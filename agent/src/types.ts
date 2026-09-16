export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type Work = {
  id: number;
  creator: string;
  title: string;
  imageUrl: string;
  watchUrls: string[];
};

export type Claim = {
  id: number;
  workId: number;
  pageUrl: string;
  imageUrl: string;
  status: string;
};

export type Candidate = {
  workId: number;
  pageUrl: string;
  imageUrl: string;
  distance: number;
};

export type FileClaimResult = {
  txHash: string;
  /** null when the claim was submitted without waiting for validators */
  ok: boolean | null;
};

export type FiledClaim = Candidate & FileClaimResult;

export type ScanSummary = {
  worksScanned: number;
  candidates: Candidate[];
  filed: FiledClaim[];
  skipped: Candidate[];
  errors: string[];
};

export interface LicenseHunterClient {
  listWorks(): Promise<Work[]>;
  listClaims(workId: number): Promise<Claim[]>;
  fileClaim(workId: number, pageUrl: string, imageUrl: string, options: { wait: boolean }): Promise<FileClaimResult>;
}
