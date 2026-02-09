import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export const Roadmap: React.FC = () => {
    const { games, matches, availablePlayers } = useAppContext();
    const [selectedRoadmapGameId, setSelectedRoadmapGameId] = useState<string>('');

    const gameId = selectedRoadmapGameId || games[0]?.id;
    const game = games.find(g => g.id === gameId);

    if (!game) return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-slate-600 italic">
            <span className="text-4xl mb-4">🗺️</span>
            <p>Please select a game to view the tournament roadmap.</p>
            <select
                className="mt-6 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold outline-none"
                onChange={(e) => setSelectedRoadmapGameId(e.target.value)}
            >
                <option value="">Select Game</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
        </div>
    );

    const gameMatches = matches.filter(m => m.gameId === gameId);
    const leagueMatches = gameMatches.filter(m => m.stage === 'league');
    const semiFinals = gameMatches.filter(m => m.stage === 'semi-final');
    const finalMatch = gameMatches.find(m => m.stage === 'final');

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-12 animate-in slide-in-from-right-4 duration-500 flex flex-col items-center">
            <div className="text-center w-full max-w-4xl flex justify-between items-end bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800">
                <div className="text-left">
                    <h2 className="text-4xl font-black text-white tracking-tighter">Championship Roadmap</h2>
                    <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest font-bold">The Journey to Victory • {game.name}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Switch Division</label>
                    <select
                        className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                        value={gameId}
                        onChange={(e) => setSelectedRoadmapGameId(e.target.value)}
                    >
                        {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="w-full max-w-6xl space-y-16 mt-8 pb-20">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-center relative">
                    {/* Stage 1: League */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-sm font-black shadow-lg shadow-indigo-900/40 text-white">1</span>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">League Stage</h3>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative group overflow-hidden shadow-xl">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Round Robin Progress</p>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-3xl font-black text-white">{leagueMatches.filter(m => m.status === 'completed').length} / {leagueMatches.length}</span>
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Units</span>
                            </div>
                            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-1000"
                                    style={{ width: `${(leagueMatches.filter(m => m.status === 'completed').length / (leagueMatches.length || 1)) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Semi Finals */}
                    <div className="space-y-8 col-span-2">
                        <div className="flex items-center justify-center gap-3 mb-8">
                            <span className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-sm font-black shadow-lg shadow-amber-900/40 text-amber-950">2</span>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Semi-Finals</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6 items-center">
                            {[0, 1].map(idx => {
                                const m = semiFinals[idx];
                                return (
                                    <div key={idx} className={`bg-slate-900 border rounded-3xl p-6 shadow-xl relative transition-all ${m?.status === 'completed' ? 'border-emerald-500/30' : 'border-slate-800'}`}>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-4">Semi Final {idx + 1}</p>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-white/5">
                                                <span className="text-xs font-black text-white truncate">{m?.teamA?.name || 'TBD'}</span>
                                                <span className="text-sm font-black text-indigo-400">{m?.status === 'completed' ? m.scoreA : '-'}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-white/5">
                                                <span className="text-xs font-black text-white truncate">{m?.teamB?.name || 'TBD'}</span>
                                                <span className="text-sm font-black text-indigo-400">{m?.status === 'completed' ? m.scoreB : '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Final */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-sm font-black shadow-lg shadow-emerald-900/40 text-emerald-950">3</span>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Grand Finale</h3>
                        </div>
                        <div className={`bg-slate-900 border-2 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center transition-all ${finalMatch?.status === 'completed' ? 'border-emerald-500 shadow-emerald-900/20' : 'border-indigo-500/30 ring-8 ring-indigo-500/5'}`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] -mr-16 -mt-16"></div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">World Championship</p>

                            <div className="flex flex-col gap-4 w-full">
                                <div className="text-center">
                                    <p className="text-xs font-black text-white mb-2">{finalMatch?.teamA?.name || 'TBD'}</p>
                                    <div className="h-0.5 w-12 bg-slate-800 mx-auto mb-2"></div>
                                    <p className="text-3xl font-black text-white mb-4 italic">VS</p>
                                    <div className="h-0.5 w-12 bg-slate-800 mx-auto mb-2"></div>
                                    <p className="text-xs font-black text-white">{finalMatch?.teamB?.name || 'TBD'}</p>
                                </div>
                            </div>

                            {finalMatch?.status === 'completed' && (
                                <div className="mt-8 bg-emerald-500 text-emerald-950 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg animate-bounce">
                                    Champions Crowned!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
