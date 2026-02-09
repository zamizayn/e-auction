import React, { createContext, useContext, useState, useEffect } from 'react';
import { Player, Team, AuctionConfig, PlayerCategory, Gender } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { api } from '../services/api';

interface AppContextType {
    config: AuctionConfig;
    setConfig: (config: AuctionConfig) => void;
    teams: Team[];
    setTeams: (teams: Team[]) => void;
    availablePlayers: Player[];
    setAvailablePlayers: (players: Player[]) => void;
    games: any[];
    setGames: (games: any[]) => void;
    matches: any[];
    setMatches: (matches: any[]) => void;
    fetchData: () => Promise<void>;
    message: string;
    setMessage: (msg: string) => void;
    isLoggedIn: boolean;
    setIsLoggedIn: (val: boolean) => void;
    currentPlayerIndex: number;
    setCurrentPlayerIndex: (val: number) => void;
    currentBid: number;
    setCurrentBid: (val: number) => void;
    currentBidderId: string | null;
    setCurrentBidderId: (val: string | null) => void;
    selectedPlayerId: string | null;
    setSelectedPlayerId: (val: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('authToken'));
    const [config, setConfig] = useState<AuctionConfig>(DEFAULT_CONFIG);
    const [teams, setTeams] = useState<Team[]>([]);
    const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
    const [games, setGames] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [message, setMessage] = useState<string>('');

    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [currentBid, setCurrentBid] = useState(0);
    const [currentBidderId, setCurrentBidderId] = useState<string | null>(null);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);


    const fetchData = async () => {
        try {
            const [configData, teamsData, playersData, gamesData] = await Promise.all([
                api.getConfig(),
                api.getTeams(),
                api.getPlayers(),
                api.getGames()
            ]);
            setConfig(configData);
            setTeams(teamsData);
            setAvailablePlayers(playersData);
            setGames(gamesData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setMessage('Failed to refresh data');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    return (
        <AppContext.Provider value={{
            config, setConfig,
            teams, setTeams,
            availablePlayers, setAvailablePlayers,
            games, setGames,
            matches, setMatches,
            fetchData,
            message, setMessage,
            isLoggedIn, setIsLoggedIn,
            currentPlayerIndex, setCurrentPlayerIndex,
            currentBid, setCurrentBid,
            currentBidderId, setCurrentBidderId,
            selectedPlayerId, setSelectedPlayerId
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within AppProvider');
    return context;
};
