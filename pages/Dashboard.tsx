import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

export const Dashboard: React.FC = () => {
    const { availablePlayers, teams, config, isLoggedIn, fetchData, setMessage } = useAppContext();
    const navigate = useNavigate();

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    const captainIds = teams.map(t => t.captainId).filter(Boolean);
    const soldPlayers = availablePlayers.filter(p => p.isSold && !captainIds.includes(p.id));
    const highestBid = soldPlayers.length > 0 ? Math.max(...soldPlayers.map(p => p.soldPrice || 0)) : 0;

    const stats = [
        { label: 'Total Players', val: availablePlayers.length, icon: '👥' },
        { label: 'Players Sold', val: soldPlayers.length, icon: '✅' },
        { label: 'Active Teams', val: teams.length, icon: '🛡️' },
        { label: 'Highest Bid', val: formatCurrency(highestBid), icon: '🏆' },
    ];

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-sm hover:border-slate-700 transition-colors">
                        <div className="text-2xl mb-2">{stat.icon}</div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-2xl font-black text-white mt-1">{stat.val}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-white flex items-center gap-2">Recent Sales</h3>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Latest 5</span>
                    </div>
                    <div className="space-y-4">
                        {[...soldPlayers].reverse().slice(0, 5).map(p => (
                            <div key={p.id} className="flex justify-between items-center p-4 bg-slate-800/40 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">{p.name[0]}</div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{p.name}</p>
                                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{teams.find(t => t.id === p.teamId)?.name}</p>
                                    </div>
                                </div>
                                <p className="text-emerald-400 font-black text-sm">{formatCurrency(p.soldPrice || 0)}</p>
                            </div>
                        ))}
                        {soldPlayers.length === 0 && (
                            <p className="text-center py-10 text-slate-600 font-medium italic">No sales yet today.</p>
                        )}
                    </div>
                </div>

                {isLoggedIn && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <h3 className="text-lg font-black mb-6 text-white uppercase tracking-tight">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => navigate('/auction')} className="p-6 bg-indigo-600/10 border border-indigo-500/30 rounded-3xl hover:bg-indigo-600/20 transition-all text-left group">
                                <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">⚡</span>
                                <p className="font-bold text-indigo-400 text-sm">Start Auction</p>
                                <p className="text-[10px] text-indigo-500/60 font-bold uppercase mt-1">Manage Bidding</p>
                            </button>
                            <button onClick={() => setMessage("Use Settings in Sidebar")} className="p-6 bg-slate-800/50 border border-slate-700 rounded-3xl hover:bg-slate-800 transition-all text-left group">
                                <span className="text-2xl block mb-2 group-hover:rotate-12 transition-transform">⚙️</span>
                                <p className="font-bold text-slate-400 text-sm">Configure Rules</p>
                                <p className="text-[10px] text-slate-500/60 font-bold uppercase mt-1">Auction Parameters</p>
                            </button>
                            <button onClick={() => { if (window.confirm("Reset entire auction?")) api.resetAuction(true).then(() => { fetchData(); setMessage("Reset & Seeded!"); }) }} className="p-6 bg-red-600/10 border border-red-500/30 rounded-3xl hover:bg-red-600/20 transition-all text-left group">
                                <span className="text-2xl block mb-2 group-hover:rotate-[-12deg] transition-transform">🔄</span>
                                <p className="font-bold text-red-400 text-sm">Reset & Seed</p>
                                <p className="text-[10px] text-red-500/60 font-bold uppercase mt-1">Clear Database</p>
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`${import.meta.env.VITE_API_URL}/simulate/auction`, { method: 'POST' });
                                        if (res.ok) {
                                            await fetchData();
                                            setMessage("Auction Simulated!");
                                        }
                                    } catch (err) {
                                        setMessage("Simulation Failed");
                                    }
                                }}
                                className="p-6 bg-emerald-600/10 border border-emerald-500/30 rounded-3xl hover:bg-emerald-600/20 transition-all text-left group"
                            >
                                <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform">🤖</span>
                                <p className="font-bold text-emerald-400 text-sm">Simulate Auction</p>
                                <p className="text-[10px] text-emerald-500/60 font-bold uppercase mt-1">Auto-Bid Testing</p>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
