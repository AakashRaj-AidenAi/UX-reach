export interface Candidate {
  id: string;
  country: string;
  customerType: string;
}

export interface FilterSet {
  countries: string[];
  customerTypes: string[];
}

export interface FilterBreakdown {
  byCountry: Record<string, number>;
  byType: Record<string, number>;
}
