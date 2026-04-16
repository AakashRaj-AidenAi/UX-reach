export interface Study {
  name: string;
  researcher: string;
  ownerRC: string;
  totalRequired: number;
  alreadySent: number;
  lastRun: string | null;
  newResponses: number;
  p0Ready: number;
  p0NewlyMarked: number;
}

export type StudyMap = Record<string, Study>;
