import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

export const Standings: React.FC = () => {
    const { teams, games, isLoggedIn, fetchData, setMessage } = useAppContext();
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [matchData, setMatchData] = useState({
        gameId: '',
        teamAId: '',
        teamBId: '',
        winnerId: ''
    });

    const handleMatchSubmit = async () => {
        if (!matchData.teamAId || !matchData.teamBId || !matchData.winnerId || !matchData.gameId) {
            setMessage("Please fill all fields");
            return;
        }
        if (matchData.teamAId === matchData.teamBId) {
            setMessage("Teams must be different");
            return;
        }

        try {
            const teamA = teams.find(t => t.id === matchData.teamAId);
            const teamB = teams.find(t => t.id === matchData.teamBId);
            const game = games.find(g => g.id === matchData.gameId);

            if (!teamA || !teamB || !game) return;

            const isDraw = matchData.winnerId === 'draw';
            const winnerId = matchData.winnerId;

            const ptsWin = game.pointsFirst || 2;
            const ptsLose = game.pointsSecond || 0;
            const ptsDraw = 1;

            await api.updateTeam(teamA.id, {
                matchesPlayed: (teamA.matchesPlayed || 0) + 1,
                won: (teamA.won || 0) + (isDraw ? 0 : (winnerId === teamA.id ? 1 : 0)),
                lost: (teamA.lost || 0) + (isDraw ? 0 : (winnerId === teamA.id ? 0 : 1)),
                tie: (teamA.tie || 0) + (isDraw ? 1 : 0),
                points: (teamA.points || 0) + (isDraw ? ptsDraw : (winnerId === teamA.id ? ptsWin : ptsLose))
            });

            await api.updateTeam(teamB.id, {
                matchesPlayed: (teamB.matchesPlayed || 0) + 1,
                won: (teamB.won || 0) + (isDraw ? 0 : (winnerId === teamB.id ? 1 : 0)),
                lost: (teamB.lost || 0) + (isDraw ? 0 : (winnerId === teamB.id ? 0 : 1)),
                tie: (teamB.tie || 0) + (isDraw ? 1 : 0),
                points: (teamB.points || 0) + (isDraw ? ptsDraw : (winnerId === teamB.id ? ptsWin : ptsLose))
            });

            await fetchData();
            setIsMatchModalOpen(false);
            setMatchData({ gameId: '', teamAId: '', teamBId: '', winnerId: '' });
            setMessage("Match Recorded!");
        } catch (err) {
            setMessage("Failed to record match");
        }
    };

    const sortedTeams = [...teams].sort((a, b) => (b.points || 0) - (a.points || 0) || (b.nrr || 0) - (a.nrr || 0));

    return (
        <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-in slide-in-from-right-4 duration-500 p-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white">Points Table</h2>
                    <p className="text-slate-500 text-sm mt-1">League Standings & Performance Tracking</p>
                </div>
                {isLoggedIn && (
                    <button
                        onClick={() => setIsMatchModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black transition-all shadow-lg shadow-emerald-900/40 uppercase tracking-widest text-xs border border-emerald-400/20"
                    >
                        Record Match Result
                    </button>
                )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-800/50 text-slate-500 text-[10px] uppercase font-black tracking-[0.2em]">
                        <tr>
                            <th className="px-8 py-5">Rank</th>
                            <th className="px-8 py-5">Team</th>
                            <th className="px-8 py-5 text-center">P</th>
                            <th className="px-8 py-5 text-center text-emerald-500">W</th>
                            <th className="px-8 py-5 text-center text-red-500">L</th>
                            <th className="px-8 py-5 text-center text-slate-400">D</th>
                            <th className="px-8 py-5 text-center font-black">Points</th>
                            <th className="px-8 py-5 text-right">NRR</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {sortedTeams.map((team, i) => (
                            <tr key={team.id} className={`hover:bg-slate-800/20 transition-colors ${i < 2 ? 'bg-indigo-600/5' : ''}`}>
                                <td className="px-8 py-5">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-amber-500 text-amber-950' : i === 1 ? 'bg-slate-300 text-slate-700' : 'bg-slate-800 text-slate-500'}`}>
                                        {i + 1}
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        {team.logo && <img src={team.logo} className="w-8 h-8 rounded-lg object-cover" alt="" />}
                                        <span className="font-black text-white text-sm">{team.name}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center text-slate-400 font-bold">{team.matchesPlayed || 0}</td>
                                <td className="px-8 py-5 text-center text-emerald-400 font-black">{team.won || 0}</td>
                                <td className="px-8 py-5 text-center text-red-400 font-black">{team.lost || 0}</td>
                                <td className="px-8 py-5 text-center text-slate-500 font-bold">{team.tie || 0}</td>
                                <td className="px-8 py-5 text-center">
                                    <span className="text-lg font-black text-white">{team.points || 0}</span>
                                </td>
                                <td className="px-8 py-5 text-right font-bold text-slate-500">{team.nrr || '0.000'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isMatchModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 min-h-screen">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-8">
                            <h3 className="text-2xl font-black text-white">Record Match</h3>
                            <button onClick={() => setIsMatchModalOpen(false)} className="text-slate-500 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Game Context</label>
                                <select
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={matchData.gameId}
                                    onChange={e => setMatchData({ ...matchData, gameId: e.target.value })}
                                >
                                    <option value="">Select Game</option>
                                    {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Home Team</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={matchData.teamAId}
                                        onChange={e => setMatchData({ ...matchData, teamAId: e.target.value })}
                                    >
                                        <option value="">Select Team</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Away Team</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                                        value={matchData.teamBId}
                                        onChange={e => setMatchData({ ...matchData, teamBId: e.target.value })}
                                    >
                                        <option value="">Select Team</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-1">Final Outcome</label>
                                <select
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-indigo-400 font-black outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={matchData.winnerId}
                                    onChange={e => setMatchData({ ...matchData, winnerId: e.target.value })}
                                >
                                    <option value="">Select Winner</option>
                                    {matchData.teamAId && <option value={matchData.teamAId}>Winner: {teams.find(t => t.id === matchData.teamAId)?.name}</option>}
                                    {matchData.teamBId && <option value={matchData.teamBId}>Winner: {teams.find(t => t.id === matchData.teamBId)?.name}</option>}
                                    <option value="draw">Match Drawn / Tie</option>
                                </select>
                            </div>

                            <button onClick={handleMatchSubmit} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-900/40 transition-all uppercase tracking-[0.2em] text-xs mt-4">
                                Confirm & Update Standings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
