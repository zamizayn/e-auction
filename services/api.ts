import { AuctionConfig, Player, Team } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export const api = {
    login: async (creds: any) => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });
        if (!res.ok) throw new Error('Login failed');
        return res.json();
    },

    getConfig: async (): Promise<AuctionConfig> => {
        const res = await fetch(`${API_URL}/config`);
        return res.json();
    },

    updateConfig: async (config: AuctionConfig): Promise<AuctionConfig> => {
        const res = await fetch(`${API_URL}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return res.json();
    },

    getTeams: async (): Promise<Team[]> => {
        const res = await fetch(`${API_URL}/teams`);
        return res.json();
    },

    addTeam: async (name: string, purse: number, logo?: string, captainId?: string): Promise<Team> => {
        const res = await fetch(`${API_URL}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, purse, logo, captainId })
        });
        return res.json();
    },

    updateTeam: async (id: string, data: any): Promise<Team> => {
        const res = await fetch(`${API_URL}/teams/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    clearTeams: async () => {
        const res = await fetch(`${API_URL}/teams/clear`, {
            method: 'DELETE'
        });
        return res.json();
    },

    getPlayers: async (): Promise<Player[]> => {
        const res = await fetch(`${API_URL}/players`);
        return res.json();
    },

    addPlayer: async (player: Partial<Player>): Promise<Player> => {
        const res = await fetch(`${API_URL}/players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(player)
        });
        return res.json();
    },

    importPlayers: async (players: Partial<Player>[]): Promise<any> => {
        const res = await fetch(`${API_URL}/players/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(players)
        });
        return res.json();
    },

    deletePlayer: async (id: string) => {
        const res = await fetch(`${API_URL}/players/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete');
        return res.json();
    },

    sellPlayer: async (playerId: string, teamId: string, soldPrice: number) => {
        const res = await fetch(`${API_URL}/players/${playerId}/sell`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId, soldPrice })
        });
        return res.json();
    },

    resetAuction: async (seed: boolean = false) => {
        const res = await fetch(`${API_URL}/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seed })
        });
        return res.json();
    },

    getGames: async (): Promise<any[]> => {
        const res = await fetch(`${API_URL}/games`);
        return res.json();
    },

    addGame: async (name: string, type?: string, pointsFirst?: number, pointsSecond?: number, pointsThird?: number) => {
        const res = await fetch(`${API_URL}/games`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, type, pointsFirst, pointsSecond, pointsThird })
        });
        return res.json();
    },

    deleteGame: async (id: string) => {
        const res = await fetch(`${API_URL}/games/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete game');
        return res.json();
    }
};
