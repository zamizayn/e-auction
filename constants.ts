
import { AuctionConfig } from './types';

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
};

export const DEFAULT_CONFIG: AuctionConfig = {
  maxTeams: 4,
  squadSize: 15,
  minPremium: 4,
  minFemale: 3,
  minMale: 0,
  totalPurse: 100000000,
  incrementValue: 100000,
  defaultBasePrice: 500000,
  premiumBasePrice: 2000000,
  activeSport: 'Cricket'
};

export const SPORTS: { type: any, icon: string }[] = [
  { type: 'Cricket', icon: '🏏' },
  { type: 'Football', icon: '⚽' },
  { type: 'Badminton', icon: '🏸' }
];

export const INITIAL_TEAMS = [
  { id: 't1', name: 'Thunder Bolts' },
  { id: 't2', name: 'Blaze Warriors' }
];

export const MOCK_PLAYERS = [
  { id: 'p1', name: 'Virat K.', category: 'Premium', gender: 'Male', basePrice: 2000000, isSold: false },
  { id: 'p2', name: 'Ellyse P.', category: 'Premium', gender: 'Female', basePrice: 2000000, isSold: false }
];
