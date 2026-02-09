import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import { PlayerCategory } from '../types';

export const Teams: React.FC = () => {
    const { teams, availablePlayers, config, fetchData, setMessage } = useAppContext();
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamLogo, setNewTeamLogo] = useState<string | null>(null);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewTeamLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const addTeam = async () => {
        if (!newTeamName) return;
        try {
            await api.addTeam(newTeamName, config.totalPurse, newTeamLogo || '');
            await fetchData();
            setNewTeamName('');
            setNewTeamLogo(null);
            setMessage("Team Added!");
        } catch (err) {
            setMessage("Failed to add team");
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    const handleClearTeams = async () => {
        if (!window.confirm("Are you sure you want to clear all teams and their players?")) return;
        try {
            await api.clearTeams();
            await fetchData();
            setMessage("Teams Cleared!");
        } catch (err) {
            setMessage("Failed to clear teams");
        }
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-8 animate-in slide-in-from-left-4 duration-500">
            <div className="flex justify-between items-end">
                <div className="flex items-end gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-white">Team Management</h2>
                        <p className="text-slate-500 text-sm mt-1">{teams.length} of {config.maxTeams} slots filled</p>
                    </div>
                    <button
                        onClick={handleClearTeams}
                        className="mb-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl font-black transition-all text-[10px] uppercase tracking-widest"
                    >
                        Clear All Teams
                    </button>
                </div>
                <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-3xl border border-slate-800">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Logo</label>
                        <input type="file" accept="image/*" onChange={handleLogoChange} className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-[10px] text-slate-400 w-48" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Team Name</label>
                        <input
                            type="text"
                            placeholder="New Team Name"
                            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            value={newTeamName}
                            onChange={e => setNewTeamName(e.target.value)}
                        />
                    </div>
                    <button onClick={addTeam} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/40 h-[42px] mt-4 uppercase tracking-widest text-xs">Add Team</button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pb-20">
                {teams.map(team => (
                    <div key={team.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-indigo-500/30 transition-all group">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                {team.logo ? (
                                    <img src={team.logo} alt={team.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shadow-xl group-hover:scale-105 transition-transform" />
                                ) : (
                                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-900/40">{team.name[0]}</div>
                                )}
                                <div>
                                    <h3 className="text-xl font-black text-white">{team.name}</h3>
                                    <div className="flex flex-col gap-1 mt-1">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Assign Captain</label>
                                        <select
                                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white font-bold outline-none focus:ring-1 focus:ring-indigo-500 min-w-[200px]"
                                            value={team.captainId || ''}
                                            onChange={async (e) => {
                                                const newCaptainId = e.target.value;
                                                if (newCaptainId && window.confirm(`Assign selected player as Captain? This will mark them as SOLD to ${team.name}.`)) {
                                                    try {
                                                        await api.updateTeam(team.id, { captainId: newCaptainId });
                                                        await fetchData();
                                                        setMessage("Captain Assigned!");
                                                    } catch (err) {
                                                        setMessage("Failed to update captain");
                                                    }
                                                }
                                            }}
                                        >
                                            <option value="">Select From Player Pool</option>
                                            <optgroup label="Available Players">
                                                {availablePlayers.filter(p => !p.isSold || p.id === team.captainId).map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Remaining Purse</p>
                                <p className="text-xl font-black text-emerald-400">{formatCurrency(team.purse)}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {team.players.map(p => (
                                <div key={p.id} className={`flex justify-between items-center p-3 bg-slate-800/30 rounded-xl border border-slate-800 ${team.captainId === p.id ? 'ring-1 ring-amber-500/50 bg-amber-500/5' : ''}`}>
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-xs font-bold text-slate-300 truncate">{p.name}</span>
                                        {team.captainId === p.id && <span className="text-[10px] text-amber-500" title="Captain">★</span>}
                                    </div>
                                    <span className="text-[9px] font-black text-indigo-400 uppercase shrink-0">{p.category}</span>
                                </div>
                            ))}
                            {team.players.length === 0 && (
                                <p className="col-span-2 text-center py-6 text-slate-600 text-sm italic">No players drafted yet</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
