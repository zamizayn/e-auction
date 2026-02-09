import React from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

export const Fixtures: React.FC = () => {
    const { matches, games, availablePlayers, isLoggedIn, fetchData, setMessage } = useAppContext();

    const generateFixtures = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/fixtures/generate`, { method: 'POST' });
            if (res.ok) {
                await fetchData();
                setMessage("Fixtures Generated!");
            } else {
                const err = await res.json();
                setMessage(err.error || "Generation Failed");
            }
        } catch (err) {
            setMessage("Error Generating Fixtures");
        }
    };

    const generateSemis = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/knockouts/semi-finals/generate`, { method: 'POST' });
            if (res.ok) {
                await fetchData();
                setMessage("Semi-Finals Generated!");
            } else {
                const err = await res.json();
                setMessage(err.error || "Generation Failed");
            }
        } catch (err) {
            setMessage("Error Generating Semis");
        }
    };

    const generateFinal = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/knockouts/finals/generate`, { method: 'POST' });
            if (res.ok) {
                await fetchData();
                setMessage("Finals Generated!");
            } else {
                const err = await res.json();
                setMessage(err.error || "Generation Failed");
            }
        } catch (err) {
            setMessage("Error Generating Finals");
        }
    };

    const simulateAll = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/matches/simulate`, { method: 'POST' });
            if (res.ok) {
                await fetchData();
                setMessage("Matches Simulated!");
            }
        } catch (err) {
            setMessage("Simulation Failed");
        }
    };

    const clearAll = async () => {
        if (!window.confirm("Clear all matches and reset standings?")) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/matches/clear`, { method: 'DELETE' });
            if (res.ok) {
                await fetchData();
                setMessage("Matches Cleared!");
            }
        } catch (err) {
            setMessage("Clear Failed");
        }
    };

    const recordResult = async (matchId: string, winnerId: string, scoreA: number, scoreB: number, teamName: string) => {
        if (!window.confirm(`Mark ${teamName} as winner?`)) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/matches/${matchId}/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ winnerId, scoreA, scoreB })
            });
            if (res.ok) {
                await fetchData();
                setMessage("Result Recorded!");
            }
        } catch (err) {
            setMessage("Update Failed");
        }
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-in slide-in-from-right-4 duration-500 p-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white">Match Fixtures</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage and Record Tournament Activity</p>
                </div>
                {isLoggedIn && (
                    <div className="flex gap-3 bg-slate-900/50 p-4 rounded-3xl border border-slate-800 shadow-xl">
                        <button onClick={generateFixtures} className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-4 py-2 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest">
                            League
                        </button>
                        <button onClick={generateSemis} className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest">
                            Semis
                        </button>
                        <button onClick={generateFinal} className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest">
                            Final
                        </button>
                        <button onClick={simulateAll} className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-6 py-2 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest">
                            Auto Simulate
                        </button>
                        <button onClick={clearAll} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-6 py-2 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest">
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {games.map(game => {
                const gameMatches = matches.filter(m => m.gameId === game.id);
                const stages: ('league' | 'semi-final' | 'final')[] = ['league', 'semi-final', 'final'];

                return (
                    <div key={game.id} className="space-y-8 pb-10">
                        <div className="flex items-center gap-6">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter shrink-0">{game.name}</h3>
                            <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
                        </div>

                        {stages.map(stage => {
                            const stageMatches = gameMatches.filter(m => m.stage === stage);
                            if (stageMatches.length === 0) return null;

                            return (
                                <div key={stage} className="space-y-4">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> {stage.replace('-', ' ')}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {stageMatches.map(match => (
                                            <div key={match.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 hover:border-indigo-500/30 transition-all shadow-lg group">
                                                <div className="flex justify-between items-center mb-6">
                                                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-widest border ${match.status === 'completed' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                                        {match.status}
                                                    </span>
                                                    {match.status === 'completed' && <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Finished</span>}
                                                </div>
                                                <div className="flex items-center justify-between gap-4 mt-2 mb-6">
                                                    <div className="flex-1 text-center overflow-hidden">
                                                        <p className="text-sm font-black text-white truncate mb-2">{match.teamA?.name}</p>
                                                        <div className="flex flex-wrap justify-center gap-1 min-h-[20px]">
                                                            {availablePlayers
                                                                .filter(p => p.teamId === match.teamAId && p.gameIds?.split(',').includes(match.gameId))
                                                                .slice(0, 3)
                                                                .map(p => <span key={p.id} className="text-[8px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">{p.name.split(' ')[0]}</span>)
                                                            }
                                                        </div>
                                                    </div>
                                                    <div className="text-slate-800 font-black text-xs italic px-2">VS</div>
                                                    <div className="flex-1 text-center overflow-hidden">
                                                        <p className="text-sm font-black text-white truncate mb-2">{match.teamB?.name}</p>
                                                        <div className="flex flex-wrap justify-center gap-1 min-h-[20px]">
                                                            {availablePlayers
                                                                .filter(p => p.teamId === match.teamBId && p.gameIds?.split(',').includes(match.gameId))
                                                                .slice(0, 3)
                                                                .map(p => <span key={p.id} className="text-[8px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">{p.name.split(' ')[0]}</span>)
                                                            }
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-center gap-8 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                                    <span className={`text-3xl font-black ${match.winnerId === match.teamAId ? 'text-emerald-400' : 'text-white/20'}`}>{match.status === 'completed' ? match.scoreA : '-'}</span>
                                                    <div className="w-px h-8 bg-slate-800"></div>
                                                    <span className={`text-3xl font-black ${match.winnerId === match.teamBId ? 'text-emerald-400' : 'text-white/20'}`}>{match.status === 'completed' ? match.scoreB : '-'}</span>
                                                </div>

                                                {isLoggedIn && match.status === 'scheduled' && (
                                                    <div className="mt-6 pt-6 border-t border-slate-800 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => recordResult(match.id, match.teamAId!, 1, 0, match.teamA?.name!)} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black text-white rounded-xl transition-all uppercase tracking-widest">
                                                            A Win
                                                        </button>
                                                        <button onClick={() => recordResult(match.id, 'draw', 0, 0, 'Draw')} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-slate-400 rounded-xl transition-all uppercase tracking-widest">
                                                            Draw
                                                        </button>
                                                        <button onClick={() => recordResult(match.id, match.teamBId!, 0, 1, match.teamB?.name!)} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black text-white rounded-xl transition-all uppercase tracking-widest">
                                                            B Win
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {gameMatches.length === 0 && (
                            <div className="text-center bg-slate-900/50 border border-slate-800/50 py-12 rounded-[2.5rem]">
                                <span className="text-3xl block mb-2 grayscale opacity-20">📅</span>
                                <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">No Fixtures Generated Yet</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
