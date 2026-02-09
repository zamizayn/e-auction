import React from 'react';
import { Player, Game, Match } from '../types';

interface TournamentViewProps {
    games: Game[];
    availablePlayers: Player[];
    matches: Match[];
    selectedGameId: string;
    onGameSelect: (gameId: string) => void;
    onFetchData: () => Promise<void>;
    onMessage: (msg: string) => void;
}

export const TournamentView: React.FC<TournamentViewProps> = ({
    games,
    availablePlayers,
    matches,
    selectedGameId,
    onGameSelect,
    onFetchData,
    onMessage
}) => {
    const gameId = selectedGameId || games[0]?.id;

    if (!gameId) {
        return <div className="p-20 text-slate-600 italic">Please create a game first.</div>;
    }

    const tournamentMatches = matches.filter(m => m.gameId === gameId && m.playerAId);
    const stages = [...new Set(tournamentMatches.map(m => m.stage))].sort();
    const currentStage = stages[stages.length - 1] || 'Round 1';
    const currentMatches = tournamentMatches.filter(m => m.stage === currentStage);
    const scheduledMatches = currentMatches.filter(m => m.status === 'scheduled');
    const completedMatches = currentMatches.filter(m => m.status === 'completed');
    const allCompleted = scheduledMatches.length === 0 && currentMatches.length > 0;
    const winners = completedMatches.map(m => m.winnerId).filter(Boolean);

    const handleStartTournament = async () => {
        const selectedPlayers = availablePlayers.filter(p => p.gameIds?.includes(gameId));
        if (selectedPlayers.length < 2) {
            onMessage('Need at least 2 players for tournament');
            return;
        }
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/tournaments/generate-round`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId,
                    playerIds: selectedPlayers.map(p => p.id),
                    stageName: 'Round 1'
                })
            });
            if (res.ok) {
                await onFetchData();
                onMessage('Tournament Round 1 Generated!');
            }
        } catch (err) {
            onMessage('Failed to generate tournament');
        }
    };

    const handleNextRound = async () => {
        const nextRoundNum = parseInt(String(currentStage).split(' ')[1] || '1') + 1;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/tournaments/generate-round`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId,
                    stageName: `Round ${nextRoundNum}`
                })
            });
            if (res.ok) {
                await onFetchData();
                onMessage(`Round ${nextRoundNum} Generated!`);
            }
        } catch (err) {
            onMessage('Failed to generate next round');
        }
    };

    const handleRecordWin = async (matchId: string, winnerId: string, isPlayerA: boolean) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/matches/${matchId}/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    winnerId,
                    scoreA: isPlayerA ? 1 : 0,
                    scoreB: isPlayerA ? 0 : 1
                })
            });
            if (res.ok) {
                await onFetchData();
                const winner = availablePlayers.find(p => p.id === winnerId);
                onMessage(`${winner?.name} wins!`);
            }
        } catch (err) {
            onMessage('Failed to record result');
        }
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white">Tournament Manager</h2>
                    <p className="text-slate-500 text-sm mt-1">Last Man Standing Elimination</p>
                </div>
                <select
                    className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-bold outline-none"
                    value={gameId}
                    onChange={(e) => onGameSelect(e.target.value)}
                >
                    {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
            </div>

            {/* Tournament Status */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <p className="text-xs font-black text-slate-500 uppercase mb-2">Current Round</p>
                    <p className="text-2xl font-black text-white">{currentStage}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <p className="text-xs font-black text-slate-500 uppercase mb-2">Total Matches</p>
                    <p className="text-2xl font-black text-white">{currentMatches.length}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <p className="text-xs font-black text-slate-500 uppercase mb-2">Completed</p>
                    <p className="text-2xl font-black text-emerald-400">{completedMatches.length}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                    <p className="text-xs font-black text-slate-500 uppercase mb-2">Remaining</p>
                    <p className="text-2xl font-black text-amber-400">{scheduledMatches.length}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
                {tournamentMatches.length === 0 && (
                    <button
                        onClick={handleStartTournament}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl uppercase tracking-widest text-sm"
                    >
                        🏁 Start Tournament
                    </button>
                )}
                {allCompleted && winners.length > 1 && (
                    <button
                        onClick={handleNextRound}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-sm animate-pulse"
                    >
                        ⚡ Generate Next Round
                    </button>
                )}
                {allCompleted && winners.length === 1 && (
                    <div className="flex-1 bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-2 border-amber-500 rounded-3xl p-8 text-center">
                        <div className="text-6xl mb-4">🏆</div>
                        <h3 className="text-3xl font-black text-white mb-2">Tournament Winner!</h3>
                        <p className="text-xl text-amber-400 font-bold">
                            {availablePlayers.find(p => p.id === winners[0])?.name}
                        </p>
                    </div>
                )}
            </div>

            {/* Matches Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <h3 className="text-lg font-black mb-6 text-white">Matches - {currentStage}</h3>
                <div className="grid grid-cols-2 gap-4">
                    {currentMatches.map(match => {
                        const playerA = availablePlayers.find(p => p.id === match.playerAId);
                        const playerB = match.playerBId ? availablePlayers.find(p => p.id === match.playerBId) : null;
                        const isCompleted = match.status === 'completed';

                        return (
                            <div key={match.id} className={`border rounded-2xl p-4 ${isCompleted ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-950 border-indigo-500/30'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex-1">
                                        <p className={`font-bold ${match.winnerId === playerA?.id ? 'text-emerald-400' : 'text-white'}`}>
                                            {playerA?.name || 'Unknown'}
                                        </p>
                                        {isCompleted && <span className="text-xs text-slate-500">Score: {match.scoreA || 0}</span>}
                                    </div>
                                    {isCompleted && match.winnerId === playerA?.id && <span className="text-xl">👑</span>}
                                </div>
                                <div className="text-center text-xs text-slate-600 font-black mb-4">VS</div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex-1">
                                        <p className={`font-bold ${match.winnerId === playerB?.id ? 'text-emerald-400' : playerB ? 'text-white' : 'text-slate-600 italic'}`}>
                                            {playerB?.name || 'BYE (Auto-Win)'}
                                        </p>
                                        {isCompleted && playerB && <span className="text-xs text-slate-500">Score: {match.scoreB || 0}</span>}
                                    </div>
                                    {isCompleted && match.winnerId === playerB?.id && <span className="text-xl">👑</span>}
                                </div>
                                {!isCompleted && playerB && (
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => handleRecordWin(match.id, playerA!.id, true)}
                                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-lg"
                                        >
                                            {playerA?.name.split(' ')[0]} Wins
                                        </button>
                                        <button
                                            onClick={() => handleRecordWin(match.id, playerB!.id, false)}
                                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg"
                                        >
                                            {playerB?.name.split(' ')[0]} Wins
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {currentMatches.length === 0 && (
                    <p className="text-center py-10 text-slate-600 italic">No matches yet. Start the tournament!</p>
                )}
            </div>
        </div>
    );
};
