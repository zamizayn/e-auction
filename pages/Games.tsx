import React from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

export const Games: React.FC = () => {
    const { games, setGames, setMessage, fetchData } = useAppContext();

    const addGame = async () => {
        const nameInput = document.getElementById('newGameInput') as HTMLInputElement;
        const typeInput = document.getElementById('newGameType') as HTMLSelectElement;
        const p1 = document.getElementById('ptsFirst') as HTMLInputElement;
        const p2 = document.getElementById('ptsSecond') as HTMLInputElement;
        const p3 = document.getElementById('ptsThird') as HTMLInputElement;

        if (nameInput && nameInput.value.trim()) {
            try {
                const newGame = await api.addGame(
                    nameInput.value.trim(),
                    typeInput.value,
                    parseInt(p1.value) || 2,
                    parseInt(p2.value) || 0,
                    parseInt(p3.value) || 0
                );
                setGames([...games, newGame]);
                nameInput.value = '';
                setMessage("Game Added!");
            } catch (err) {
                setMessage("Failed to add game");
            }
        }
    };

    const deleteGame = async (id: string, name: string) => {
        if (window.confirm(`Delete ${name}?`)) {
            try {
                await api.deleteGame(id);
                setGames(games.filter(g => g.id !== id));
                setMessage("Game Deleted!");
            } catch (err) {
                setMessage("Failed to delete game");
            }
        }
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white">Game Management</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage the list of available sports/games</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap bg-slate-900/50 p-4 rounded-3xl border border-slate-800 shadow-xl">
                    <select id="newGameType" className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm">
                        <option value="Team Match">Team Match</option>
                        <option value="Single Match">Single Match</option>
                        <option value="Doubles">Doubles</option>
                        <option value="Mixed Doubles">Mixed Doubles</option>
                    </select>
                    <input
                        type="text"
                        placeholder="New Game Name"
                        className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-w-[200px]"
                        id="newGameInput"
                    />
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">1st</label>
                            <input type="number" id="ptsFirst" defaultValue="2" className="w-16 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs text-center" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">2nd</label>
                            <input type="number" id="ptsSecond" defaultValue="0" className="w-16 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs text-center" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">3rd</label>
                            <input type="number" id="ptsThird" defaultValue="0" className="w-16 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs text-center" />
                        </div>
                    </div>

                    <button
                        onClick={addGame}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2 rounded-xl font-black transition-all shadow-lg shadow-indigo-900/40 uppercase tracking-widest text-xs h-[42px]"
                    >
                        Add Game
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {games.map(game => (
                    <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex justify-between items-center group hover:border-indigo-500/50 transition-all shadow-lg hover:shadow-indigo-900/10">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-inner border border-white/5">🎮</div>
                            <div>
                                <h3 className="text-xl font-black text-white">{game.name}</h3>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">{game.type}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="text-[9px] font-black bg-indigo-600/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/10">1st: {game.pointsFirst}</span>
                                    {game.pointsSecond > 0 && <span className="text-[9px] font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">2nd: {game.pointsSecond}</span>}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => deleteGame(game.id, game.name)}
                            className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                ))}
                {games.length === 0 && (
                    <div className="col-span-full text-center py-32 bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[3rem]">
                        <span className="text-5xl block mb-6 grayscale opacity-20">🕹️</span>
                        <p className="text-slate-600 font-black uppercase tracking-[0.2em] text-xs">
                            No Active Game Modules<br />Deploy New Infrastructure Above
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
