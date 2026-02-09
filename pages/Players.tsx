import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import { Player, PlayerCategory, Gender } from '../types';
import ImportPlayers from '../components/ImportPlayers';
import { formatCurrency } from '../utils';

export const Players: React.FC = () => {
    const { availablePlayers, games, setAvailablePlayers, fetchData, setMessage } = useAppContext();
    const [playerSearchQuery, setPlayerSearchQuery] = useState('');
    const [newPlayer, setNewPlayer] = useState<Partial<Player>>({
        category: PlayerCategory.STANDARD,
        gender: Gender.MALE
    });

    const handleImport = async (players: Partial<Player>[]) => {
        try {
            await api.importPlayers(players);
            await fetchData();
            setMessage("Players Imported!");
        } catch (err) {
            setMessage("Import Failed");
        }
    };

    const addPlayerManually = async () => {
        if (!newPlayer.name || !newPlayer.basePrice) {
            setMessage("Name and Base Price required");
            return;
        }
        try {
            const added = await api.addPlayer(newPlayer);
            setAvailablePlayers([...availablePlayers, added]);
            setNewPlayer({ category: PlayerCategory.STANDARD, gender: Gender.MALE });
            setMessage("Player Added!");
        } catch (err) {
            setMessage("Failed to add player");
        }
    };

    const deletePlayer = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this player?")) return;
        try {
            await api.deletePlayer(id);
            setAvailablePlayers(prev => prev.filter(p => p.id !== id));
            setMessage("Player Deleted!");
        } catch (err) {
            setMessage("Failed to delete player");
        }
    };

    const filteredPlayers = availablePlayers.filter(p =>
        p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
        p.employee_no?.toLowerCase().includes(playerSearchQuery.toLowerCase())
    );

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-white">Player Roster</h2>
                    <p className="text-slate-500 text-sm mt-1">{availablePlayers.length} total participants</p>
                </div>
                <div className="flex items-center gap-4 flex-1 max-w-xl mx-8">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search roster..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 pl-10 text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                            value={playerSearchQuery}
                            onChange={e => setPlayerSearchQuery(e.target.value)}
                        />
                        <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {import.meta.env.VITE_ENVIRONMENT === 'local' && (
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`${import.meta.env.VITE_API_URL}/seed/players`, { method: 'POST' });
                                        if (res.ok) {
                                            await fetchData();
                                            setMessage("Sample Players Seeded!");
                                        }
                                    } catch (err) {
                                        setMessage("Seeding Failed");
                                    }
                                }}
                                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-6 py-2 rounded-xl font-bold transition-all text-xs uppercase tracking-widest"
                            >
                                Seed
                            </button>
                            <button
                                onClick={async () => {
                                    if (!window.confirm("Are you sure you want to clear ALL players?")) return;
                                    try {
                                        const res = await fetch(`${import.meta.env.VITE_API_URL}/players/clear`, { method: 'DELETE' });
                                        if (res.ok) {
                                            await fetchData();
                                            setMessage("All Players Cleared!");
                                        }
                                    } catch (err) {
                                        setMessage("Clear Failed");
                                    }
                                }}
                                className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-6 py-2 rounded-xl font-bold transition-all text-xs uppercase tracking-widest"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                    <ImportPlayers onImport={handleImport} />
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 px-2">Manual Entry Form</h3>

                <div className="grid grid-cols-12 gap-6">
                    {/* Row 1: Basic Info */}
                    <div className="col-span-12 md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Full Name</label>
                        <input
                            type="text"
                            placeholder="e.g. John Doe"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:font-normal"
                            value={newPlayer.name || ''}
                            onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                        />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Emp ID</label>
                        <input
                            type="text"
                            placeholder="ID-123"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:font-normal"
                            value={newPlayer.employee_no || ''}
                            onChange={e => setNewPlayer({ ...newPlayer, employee_no: e.target.value })}
                        />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Position</label>
                        <input
                            type="text"
                            placeholder="Batsman"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:font-normal"
                            value={newPlayer.position || ''}
                            onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })}
                        />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Base Price</label>
                        <input
                            type="number"
                            placeholder="500000"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:font-normal"
                            value={newPlayer.basePrice || ''}
                            onChange={e => setNewPlayer({ ...newPlayer, basePrice: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="col-span-6 md:col-span-3 flex gap-4">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Category</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                                value={newPlayer.category}
                                onChange={e => setNewPlayer({ ...newPlayer, category: e.target.value as PlayerCategory })}
                            >
                                <option value={PlayerCategory.STANDARD}>Standard</option>
                                <option value={PlayerCategory.PREMIUM}>Premium</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Gender</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                                value={newPlayer.gender}
                                onChange={e => setNewPlayer({ ...newPlayer, gender: e.target.value as Gender })}
                            >
                                <option value={Gender.MALE}>Male</option>
                                <option value={Gender.FEMALE}>Female</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Games & Action */}
                    <div className="col-span-12 md:col-span-9">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Participating Games</label>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-2 min-h-[60px]">
                            {games.map(g => {
                                const isSelected = (newPlayer.gameIds || '').split(',').includes(g.id);
                                return (
                                    <button
                                        key={g.id}
                                        onClick={() => {
                                            const currentIds = (newPlayer.gameIds || '').split(',').filter(id => id);
                                            const updatedIds = currentIds.includes(g.id)
                                                ? currentIds.filter(id => id !== g.id)
                                                : [...currentIds, g.id];
                                            setNewPlayer({ ...newPlayer, gameIds: updatedIds.join(',') });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${isSelected
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                                            }`}
                                    >
                                        {g.name}
                                    </button>
                                );
                            })}
                            {games.length === 0 && <span className="text-slate-600 text-xs italic">No games configured. Seed or add games first.</span>}
                        </div>
                    </div>

                    <div className="col-span-12 md:col-span-3 flex items-end">
                        <button
                            onClick={addPlayerManually}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl py-3.5 transition-all uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            Add Player
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden mb-20 shadow-2xl">
                <table className="w-full text-left">
                    <thead className="bg-slate-800/50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Emp No</th>
                            <th className="px-6 py-4 text-center">Category</th>
                            <th className="px-6 py-4 text-center">Gender</th>
                            <th className="px-6 py-4">Position</th>
                            <th className="px-6 py-4">Games</th>
                            <th className="px-6 py-4">Base Price</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredPlayers.map(p => (
                            <tr key={p.id} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-4 font-bold text-white text-sm">{p.name}</td>
                                <td className="px-6 py-4 text-slate-400 text-xs font-medium">{p.employee_no || 'N/A'}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${p.category === PlayerCategory.PREMIUM ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-500'}`}>
                                        {p.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${p.gender === Gender.FEMALE ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {p.gender[0]}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400 text-xs font-bold">{p.position || '-'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                        {(p.gameIds || '').split(',').filter(id => id).map(id => (
                                            <span key={id} className="px-1.5 py-0.5 bg-slate-800 rounded text-[8px] font-bold text-slate-500 border border-slate-700">
                                                {games.find(g => g.id === id)?.name || 'Game'}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-emerald-400 font-black text-sm">{formatCurrency(p.basePrice)}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.isSold ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-600/10 text-amber-500 border border-amber-500/20'}`}>
                                        {p.isSold ? 'Sold' : 'Pool'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => deletePlayer(p.id)} className="p-2 text-slate-600 hover:text-red-400 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
