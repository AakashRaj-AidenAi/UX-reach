import { Candidate } from '../models/candidate.model';

function makePool(studyId: string, dist: [string, string, number][]): Candidate[] {
  const pool: Candidate[] = [];
  let idx = 0;
  dist.forEach(([country, customerType, count]) => {
    for (let i = 0; i < count; i++) {
      pool.push({
        id: `${studyId}-C${String(++idx).padStart(3, '0')}`,
        country,
        customerType
      });
    }
  });
  return pool;
}

export const SHORTLISTING_POOLS: Record<string, Candidate[]> = {
  '1234567': makePool('1234567', [
    ['US', 'Large Enterprise', 4], ['US', 'Media Agency', 2], ['US', 'SMB', 2],
    ['Japan', 'Media Agency', 3], ['Japan', 'Large Enterprise', 2],
    ['India', 'Large Enterprise', 3], ['India', 'SMB', 2], ['India', 'Startup', 1],
    ['Germany', 'Large Enterprise', 2], ['Germany', 'SMB', 2],
    ['UK', 'Media Agency', 3], ['UK', 'Large Enterprise', 1],
    ['Spain', 'SMB', 2], ['Spain', 'Startup', 1]
  ]),
  '2345678': makePool('2345678', [
    ['US', 'Startup', 3], ['US', 'SMB', 2], ['US', 'Large Enterprise', 2],
    ['India', 'Startup', 3], ['India', 'SMB', 2],
    ['Brazil', 'SMB', 3], ['Brazil', 'Startup', 2],
    ['Australia', 'Large Enterprise', 2], ['Australia', 'SMB', 2],
    ['Canada', 'Large Enterprise', 2], ['Canada', 'SMB', 2]
  ]),
  '6789012': makePool('6789012', [
    ['US', 'Startup', 3], ['US', 'SMB', 2], ['US', 'Large Enterprise', 2],
    ['India', 'Startup', 3], ['India', 'SMB', 2],
    ['Japan', 'Media Agency', 3], ['Japan', 'Large Enterprise', 2],
    ['Spain', 'SMB', 2], ['Spain', 'Startup', 2],
    ['Brazil', 'SMB', 2], ['Brazil', 'Startup', 2]
  ])
};

export const COUNTRY_ALIASES: Record<string, string> = {
  'us': 'US', 'usa': 'US', 'united states': 'US', 'america': 'US',
  'japan': 'Japan',
  'india': 'India',
  'spain': 'Spain',
  'germany': 'Germany',
  'france': 'France',
  'uk': 'UK', 'united kingdom': 'UK', 'britain': 'UK', 'great britain': 'UK',
  'brazil': 'Brazil',
  'australia': 'Australia',
  'canada': 'Canada',
  'singapore': 'Singapore',
  'south korea': 'South Korea', 'korea': 'South Korea',
  'netherlands': 'Netherlands', 'holland': 'Netherlands',
  'mexico': 'Mexico',
  'italy': 'Italy'
};

export const CUSTOMER_TYPE_ALIASES: Record<string, string> = {
  'media agency': 'Media Agency', 'agency': 'Media Agency', 'agencies': 'Media Agency',
  'large enterprise': 'Large Enterprise', 'enterprise': 'Large Enterprise', 'large enterprises': 'Large Enterprise',
  'smb': 'SMB', 'small business': 'SMB', 'small businesses': 'SMB', 'medium business': 'SMB', 'sme': 'SMB',
  'startup': 'Startup', 'start-up': 'Startup', 'start up': 'Startup', 'startups': 'Startup',
  'government': 'Government', 'govt': 'Government', 'public sector': 'Government',
  'non-profit': 'Non-profit', 'nonprofit': 'Non-profit', 'ngo': 'Non-profit'
};
