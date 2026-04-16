import { StudyMap } from '../models/study.model';

export const STUDIES: StudyMap = {
  '1234567': {
    name: 'Global Ads Experience Survey',
    researcher: 'Sarah Johnson',
    ownerRC: 'Sarah Chen',
    totalRequired: 45,
    alreadySent: 15,
    lastRun: 'Apr 12',
    newResponses: 4,
    p0Ready: 12,
    p0NewlyMarked: 2
  },
  '2345678': {
    name: 'YouTube Premium UX Research',
    researcher: 'David Kim',
    ownerRC: 'Sarah Chen',
    totalRequired: 30,
    alreadySent: 0,
    lastRun: null,
    newResponses: 0,
    p0Ready: 5,
    p0NewlyMarked: 5
  },
  '6789012': {
    name: 'Assistant Voice Interface Study',
    researcher: 'Robert Taylor',
    ownerRC: 'Sarah Chen',
    totalRequired: 40,
    alreadySent: 5,
    lastRun: 'Apr 8',
    newResponses: 2,
    p0Ready: 5,
    p0NewlyMarked: 0
  }
};
