
export enum PlayerCategory {
  PREMIUM = 'Premium',
  STANDARD = 'Standard'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female'
}

export type SportType = 'Cricket' | 'Football' | 'Badminton';

export interface Player {
  id: string;
  name: string;
  category: PlayerCategory;
  gender: Gender;
  position?: string;
  employee_no?: string;
  basePrice: number;
  soldPrice?: number;
  teamId?: string;
  isSold: boolean;
  photoUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  purse: number;
  spent: number;
  players: Player[];

  logo?: string;
  matchesPlayed?: number;
  won?: number;
  lost?: number;
  tie?: number;
  points?: number;
  nrr?: number;
}

export interface AuctionConfig {
  maxTeams: number;
  squadSize: number;
  minPremium: number;
  minFemale: number;
  minMale: number;
  totalPurse: number;
  incrementValue: number;
  activeSport: SportType;
}

export interface AuctionState {
  config: AuctionConfig;
  teams: Team[];
  availablePlayers: Player[];
  currentPlayerIndex: number;
  currentBid: number;
  currentBidderId: string | null;
}

export interface Game {
  id: string;
  name: string;
}
