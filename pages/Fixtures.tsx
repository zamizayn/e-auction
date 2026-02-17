import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import { formatCurrencyShort } from '../utils';

export const Fixtures: React.FC = () => {
    const { matches, games, availablePlayers, teams, isLoggedIn, fetchData, setMessage } = useAppContext();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newMatch, setNewMatch] = useState({
        gameId: '',
        teamAId: '',
        teamBId: '',
        playerAId: '',
        playerBId: '',
        stage: 'league'
    });

    const handleGenerateFixtures = async () => {
        try {
            const res = await api.generateFixtures();
            if (res.success) {
                await fetchData();
                setMessage(`${res.count} Fixtures Generated!`);
            } else {
                setMessage(res.error || "Generation Failed");
            }
        } catch (err) {
            setMessage("Error Generating Fixtures");
        }
    };

    const handleAddMatch = async () => {
        if (!newMatch.gameId) {
            setMessage("Select a game first!");
            return;
        }
        try {
            await api.addMatch(newMatch);
            await fetchData();
            setShowAddModal(false);
            setMessage("Match Added!");
        } catch (err) {
            setMessage("Failed to add match");
        }
    };

    const handleDeleteMatch = async (id: string) => {
        if (!window.confirm("Delete this match?")) return;
        try {
            await api.deleteMatch(id);
            await fetchData();
            setMessage("Match Deleted");
        } catch (err) {
            setMessage("Delete Failed");
        }
    };

    const recordResult = async (matchId: string, winnerId: string, scoreA: number, scoreB: number, label: string) => {
        if (!window.confirm(`Mark ${label} as winner?`)) return;
        try {
            const res = await api.recordMatchResult(matchId, { winnerId, scoreA, scoreB });
            if (res.success) {
                await fetchData();
                setMessage("Result Recorded!");
            }
        } catch (err) {
            setMessage("Update Failed");
        }
    };

    const selectedGame = games.find(g => g.id === newMatch.gameId);
    const isTeamGame = selectedGame?.type === 'Team Match' || selectedGame?.type === 'Team';

    return (
        <div className="h-full overflow-y-auto no-scrollbar space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-8 pt-4 pb-24">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                    <h2 className="text-4xl font-black text-white tracking-tighter">FIXTURES</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                        Management & Results
                    </p>
                </div>

                {isLoggedIn && (
                    <div className="flex flex-wrap gap-3 relative z-10">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl"
                        >
                            + Manual Match
                        </button>
                        <button
                            onClick={handleGenerateFixtures}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_10px_30px_-10px_rgba(79,70,229,0.5)] hover:scale-105 active:scale-95 flex items-center gap-3 group"
                        >
                            <span>Generate Fixtures</span>
                            <svg className="w-3 h-3 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Games Grid */}
            <div className="space-y-12">
                {games.map(game => {
                    const gameMatches = matches.filter(m => m.gameId === game.id);
                    if (gameMatches.length === 0) return null;

                    return (
                        <div key={game.id} className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-indigo-600/10 rounded-2xl border border-indigo-500/20">
                                    <span className="text-xl">🏆</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{game.name}</h3>
                                    <p className="text-indigo-400/60 font-black text-[8px] uppercase tracking-widest mt-1.5">{game.type} • {game.sport}</p>
                                </div>
                                <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent ml-4"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {gameMatches.map(match => {
                                    const isTeamMatch = !!match.teamAId;
                                    const isSpecializedGame = game.name.toLowerCase().includes('singles') ||
                                        game.name.toLowerCase().includes('doubles') ||
                                        game.name.toLowerCase().includes('mixed');

                                    let labelA = isTeamMatch ? match.teamA?.name : match.playerA?.name;
                                    let labelB = isTeamMatch ? match.teamB?.name : match.playerB?.name;

                                    if (isSpecializedGame && isTeamMatch) {
                                        const playersA = availablePlayers.filter(p => p.teamId === match.teamAId && p.gameIds?.split(',').includes(game.id));
                                        const playersB = availablePlayers.filter(p => p.teamId === match.teamBId && p.gameIds?.split(',').includes(game.id));
                                        if (playersA.length > 0) labelA = playersA.map(p => p.name).join(' & ');
                                        if (playersB.length > 0) labelB = playersB.map(p => p.name).join(' & ');
                                    }

                                    const idA = isTeamMatch ? match.teamAId : match.playerAId;
                                    const idB = isTeamMatch ? match.teamBId : match.playerBId;

                                    return (
                                        <div key={match.id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 hover:border-indigo-500/30 transition-all shadow-lg group relative overflow-hidden">
                                            {/* Status Badge */}
                                            <div className="flex justify-between items-center mb-6">
                                                <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full tracking-widest border backdrop-blur-md ${match.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                    {match.status}
                                                </span>
                                                <button onClick={() => handleDeleteMatch(match.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </div>

                                            {/* Pairing Display */}
                                            <div className="flex items-center justify-between gap-4 mb-6">
                                                <div className="flex-1 text-center">
                                                    <p className={`text-sm font-black truncate mb-1 ${match.winnerId === idA ? 'text-indigo-400' : 'text-white'}`}>{labelA}</p>
                                                    <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">{isTeamMatch ? 'Team' : 'Player'}</p>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-xl border border-slate-700/50">VS</div>
                                                </div>
                                                <div className="flex-1 text-center">
                                                    <p className={`text-sm font-black truncate mb-1 ${match.winnerId === idB ? 'text-indigo-400' : 'text-white'}`}>{labelB}</p>
                                                    <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">{isTeamMatch ? 'Team' : 'Player'}</p>
                                                </div>
                                            </div>

                                            {/* Score View */}
                                            <div className={`flex items-center justify-center gap-8 p-4 rounded-3xl border transition-all ${match.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/20 shadow-inner' : 'bg-slate-950/50 border-white/5'}`}>
                                                <span className={`text-3xl font-black ${match.status === 'completed' ? (match.winnerId === idA ? 'text-emerald-400' : 'text-white/40') : 'text-white/10'}`}>{match.status === 'completed' ? match.scoreA : '-'}</span>
                                                <div className="w-px h-8 bg-slate-800/50"></div>
                                                <span className={`text-3xl font-black ${match.status === 'completed' ? (match.winnerId === idB ? 'text-emerald-400' : 'text-white/40') : 'text-white/10'}`}>{match.status === 'completed' ? match.scoreB : '-'}</span>
                                            </div>

                                            {/* Admin Actions */}
                                            {isLoggedIn && match.status === 'scheduled' && (
                                                <div className="mt-6 pt-6 border-t border-slate-800/50 flex gap-2">
                                                    <button onClick={() => recordResult(match.id, idA!, 1, 0, labelA!)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-[9px] font-black text-white rounded-xl transition-all uppercase tracking-widest shadow-lg">
                                                        A Win
                                                    </button>
                                                    <button onClick={() => recordResult(match.id, 'draw', 1, 1, 'Draw')} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-[9px] font-black text-slate-500 rounded-xl transition-all uppercase tracking-widest">
                                                        Draw
                                                    </button>
                                                    <button onClick={() => recordResult(match.id, idB!, 0, 1, labelB!)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-[9px] font-black text-white rounded-xl transition-all uppercase tracking-widest shadow-lg">
                                                        B Win
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {matches.length === 0 && (
                <div className="text-center py-24 bg-slate-900/30 rounded-[4rem] border-2 border-dashed border-slate-800 animate-pulse">
                    <span className="text-6xl mb-6 block grayscale opacity-30">🗓️</span>
                    <h3 className="text-xl font-black text-slate-600 uppercase tracking-widest">Stadium Empty</h3>
                    <p className="text-slate-700 text-sm font-bold mt-2">Generate fixtures to kick off the tournament</p>
                </div>
            )}

            {/* Add Match Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-950/80">
                    <div className="bg-slate-900 w-full max-w-lg rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10">
                            <h3 className="text-2xl font-black text-white mb-8 tracking-tighter">CREATE MANUAL MATCH</h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Target Game</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-indigo-500 transition-all text-sm appearance-none"
                                        value={newMatch.gameId}
                                        onChange={(e) => setNewMatch({ ...newMatch, gameId: e.target.value, teamAId: '', teamBId: '', playerAId: '', playerBId: '' })}
                                    >
                                        <option value="">Select a Game</option>
                                        {games.map(g => <option key={g.id} value={g.id}>{g.name} ({g.type})</option>)}
                                    </select>
                                </div>

                                {newMatch.gameId && (
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Side A</label>
                                            {isTeamGame ? (
                                                <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs font-bold" value={newMatch.teamAId} onChange={e => setNewMatch({ ...newMatch, teamAId: e.target.value })}>
                                                    <option value="">Select Team</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            ) : (
                                                <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs font-bold" value={newMatch.playerAId} onChange={e => setNewMatch({ ...newMatch, playerAId: e.target.value })}>
                                                    <option value="">Select Player</option>
                                                    {availablePlayers.filter(p => p.isSold && p.gameIds?.includes(newMatch.gameId)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Side B</label>
                                            {isTeamGame ? (
                                                <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs font-bold" value={newMatch.teamBId} onChange={e => setNewMatch({ ...newMatch, teamBId: e.target.value })}>
                                                    <option value="">Select Team</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            ) : (
                                                <select className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-xs font-bold" value={newMatch.playerBId} onChange={e => setNewMatch({ ...newMatch, playerBId: e.target.value })}>
                                                    <option value="">Select Player</option>
                                                    {availablePlayers.filter(p => p.isSold && p.gameIds?.includes(newMatch.gameId)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 mt-12">
                                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-[1.5rem] uppercase tracking-widest text-[10px] transition-all">Cancel</button>
                                <button onClick={handleAddMatch} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-[1.5rem] uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-indigo-900/40">Create Match</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
