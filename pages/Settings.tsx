import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import { AuctionConfig } from '../types';

export const Settings: React.FC = () => {
    const { config, setConfig, setMessage } = useAppContext();
    const [formData, setFormData] = useState<AuctionConfig>(config);

    useEffect(() => {
        setFormData(config);
    }, [config]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumber = ['totalPurse', 'squadSize', 'minPremium', 'minFemale', 'minMale', 'incrementValue', 'maxTeams'].includes(name);
        setFormData(prev => ({ ...prev, [name]: isNumber ? parseInt(value) || 0 : value }));
    };

    const handleSave = async () => {
        try {
            const saved = await api.updateConfig(formData);
            setConfig(saved);
            setMessage("Configuration Applied!");
        } catch (err) {
            setMessage("Failed to save config");
        }
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-8 animate-in slide-in-from-right-4 duration-500">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-white">System Settings</h2>
                        <p className="text-slate-500 text-sm mt-1">Configure global auction rules and quotas</p>
                    </div>
                    <button
                        onClick={handleSave}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black transition-all shadow-lg shadow-indigo-900/40 uppercase tracking-widest text-sm border border-indigo-400/20"
                    >
                        Save Configuration
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Financials & Limits */}
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-xl">
                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Financials & Teams</h3>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Max Teams Allowed</label>
                            <input type="number" name="maxTeams" value={formData.maxTeams} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Total Purse (Per Team)</label>
                            <input type="number" name="totalPurse" value={formData.totalPurse} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Minimum Bid Increment</label>
                            <input type="number" name="incrementValue" value={formData.incrementValue} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                        </div>
                    </div>

                    {/* Squad Quotas */}
                    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6 shadow-xl">
                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Squad Quotas</h3>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Required Squad Size</label>
                            <input type="number" name="squadSize" value={formData.squadSize} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Minimum Premium Players</label>
                            <input type="number" name="minPremium" value={formData.minPremium} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Min Female</label>
                                <input type="number" name="minFemale" value={formData.minFemale} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Min Male</label>
                                <input type="number" name="minMale" value={formData.minMale || 0} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 bg-indigo-600/5 border border-indigo-500/10 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-indigo-900/20">ℹ️</div>
                    <div className="flex-1">
                        <h4 className="text-white font-black uppercase tracking-widest text-sm mb-1">Configuration Note</h4>
                        <p className="text-slate-500 text-xs leading-relaxed">Changes to these settings will affect the auction logic and budget constraints immediately. Ensure all quotas are mathematically possible given your current player pool.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
