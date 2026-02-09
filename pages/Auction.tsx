import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import { PlayerCategory, Gender } from '../types';
import { formatCurrency, formatCurrencyShort } from '../utils';

export const Auction: React.FC = () => {
    const {
        availablePlayers, teams, config, fetchData, setMessage,
        currentPlayerIndex, setCurrentPlayerIndex,
        currentBid, setCurrentBid,
        currentBidderId, setCurrentBidderId,
        selectedPlayerId, setSelectedPlayerId
    } = useAppContext();

    const [searchQuery, setSearchQuery] = useState('');
    const [playerSearchQuery, setPlayerSearchQuery] = useState('');

    const currentPlayer = selectedPlayerId
        ? availablePlayers.find(p => p.id === selectedPlayerId)
        : availablePlayers.filter(p => !p.isSold)[currentPlayerIndex];

    const allTeamsFull = teams.length > 0 && teams.every(t => t.players.length >= config.squadSize);
    const isAuctionFinished = !currentPlayer || currentPlayer.isSold || allTeamsFull;

    const handleBid = (teamId: string) => {
        if (!currentPlayer || currentPlayer.isSold) return;

        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        const nextBid = currentBidderId ? currentBid + config.incrementValue : currentBid;

        if (team.purse < nextBid) {
            setMessage(`Insufficient funds for ${team.name}!`);
            return;
        }

        // Reserve Check
        const remainingSlots = config.squadSize - team.players.length;
        let reservedAmount = 0;
        if (remainingSlots > 1) {
            const otherUnsoldBasePrices = availablePlayers
                .filter(p => !p.isSold && p.id !== currentPlayer?.id)
                .map(p => p.basePrice)
                .sort((a, b) => a - b);

            reservedAmount = otherUnsoldBasePrices
                .slice(0, remainingSlots - 1)
                .reduce((sum, price) => sum + price, 0);

            if (otherUnsoldBasePrices.length < remainingSlots - 1) {
                reservedAmount += (remainingSlots - 1 - otherUnsoldBasePrices.length) * 500000;
            }
        }

        if (team.purse - nextBid < reservedAmount) {
            setMessage(`Must reserve ${formatCurrency(reservedAmount)} for ${remainingSlots - 1} more players!`);
            return;
        }

        if (team.players.length >= config.squadSize) {
            setMessage(`Squad full for ${team.name}!`);
            return;
        }

        // Quota Check
        const currentPremiumCount = team.players.filter(p => p.category === PlayerCategory.PREMIUM).length;
        const currentFemaleCount = team.players.filter(p => p.gender === Gender.FEMALE).length;
        const premiumNeeded = Math.max(0, config.minPremium - currentPremiumCount);
        const femaleNeeded = Math.max(0, config.minFemale - currentFemaleCount);

        if (currentPlayer.category !== PlayerCategory.PREMIUM && premiumNeeded >= remainingSlots) {
            setMessage(`Must buy ${premiumNeeded} more Premium players!`);
            return;
        }

        if (currentPlayer.gender !== Gender.FEMALE && femaleNeeded >= remainingSlots) {
            setMessage(`Must buy ${femaleNeeded} more Female players!`);
            return;
        }

        const slotsAfterPurchase = remainingSlots - 1;
        const premiumStillNeeded = currentPlayer.category === PlayerCategory.PREMIUM ? premiumNeeded - 1 : premiumNeeded;
        const femaleStillNeeded = currentPlayer.gender === Gender.FEMALE ? femaleNeeded - 1 : femaleNeeded;

        if (premiumStillNeeded + femaleStillNeeded > slotsAfterPurchase) {
            setMessage(`Insufficient slots for remaining quotas!`);
            return;
        }

        setCurrentBid(nextBid);
        setCurrentBidderId(teamId);
    };

    const handleSold = async () => {
        const targetPlayer = currentPlayer;
        const targetTeamId = currentBidderId;
        const finalPrice = currentBid;

        if (!targetPlayer || !targetTeamId || targetPlayer.isSold) return;

        try {
            await api.sellPlayer(targetPlayer.id, targetTeamId, finalPrice);
            await fetchData();

            setCurrentBidderId(null);
            setCurrentBid(0);

            if (currentPlayerIndex < availablePlayers.length - 1) {
                setCurrentPlayerIndex(currentPlayerIndex + 1);
            } else {
                setMessage("Auction Concluded!");
            }

            setSelectedPlayerId(null);
            setMessage(`SOLD to ${teams.find(t => t.id === targetTeamId)?.name} !`);
        } catch (err) {
            setMessage("Transaction Failed!");
        }
    };

    return (
        <div className="h-full flex flex-col animate-in slide-in-from-bottom-8 duration-700 overflow-hidden">
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 p-6">

                {/* 1. PLAYER POOL SIDEBAR */}
                <div className="col-span-3 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] flex flex-col min-h-0 overflow-hidden relative">
                    <div className="p-5 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span> Available Pool
                        </h3>

                        <div className="space-y-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search players..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 pl-10 text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
                            </div>

                            <div className="flex gap-2 text-[8px] font-black uppercase tracking-tighter overflow-x-auto no-scrollbar pb-1">
                                {['All', ...Object.values(PlayerCategory)].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setPlayerSearchQuery(cat === 'All' ? '' : cat)}
                                        className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${(playerSearchQuery === cat || (cat === 'All' && !playerSearchQuery))
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {availablePlayers
                            .filter(p => !p.isSold &&
                                p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                                (!playerSearchQuery || p.category === playerSearchQuery)
                            )
                            .map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        setSelectedPlayerId(p.id);
                                        setMessage(`Selected ${p.name}`);
                                    }}
                                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 group relative ${currentPlayer?.id === p.id
                                        ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-900/10'
                                        : 'bg-slate-800/30 border-slate-800/50 hover:bg-slate-800 hover:border-slate-700'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${currentPlayer?.id === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'
                                        }`}>
                                        {p.name[0]}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className={`text-xs font-black truncate ${currentPlayer?.id === p.id ? 'text-white' : 'text-slate-300'}`}>
                                            {p.name}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-black uppercase tracking-tighter ${p.category === PlayerCategory.PREMIUM ? 'text-amber-500' : 'text-slate-500'
                                                }`}>
                                                {p.category}
                                            </span>
                                            <span className="text-[10px] text-slate-600 font-black">•</span>
                                            <span className="text-[9px] text-emerald-500 font-black">{formatCurrencyShort(p.basePrice)}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>

                {/* 2. STADIUM CENTER STAGE */}
                <div className="col-span-4 flex flex-col min-h-0">
                    {!isAuctionFinished ? (
                        <div className={`flex-1 relative overflow-hidden bg-slate-900 border-2 rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-center transition-all duration-500 ${currentPlayer.category === PlayerCategory.PREMIUM ? 'border-amber-500/30 ring-4 ring-amber-500/5' : 'border-indigo-500/30 ring-4 ring-indigo-500/5'}`}>
                            <div className="flex flex-col items-center text-center relative z-10">
                                <div className={`w-36 h-36 rounded-full border-[6px] p-1 flex items-center justify-center relative mb-6 ${currentPlayer.category === PlayerCategory.PREMIUM ? 'border-amber-500/20' : 'border-indigo-500/20'}`}>
                                    <div className={`w-full h-full rounded-full flex items-center justify-center bg-slate-800 text-6xl font-black ${currentPlayer.category === PlayerCategory.PREMIUM ? 'text-amber-500' : 'text-slate-500'}`}>
                                        {currentPlayer.name[0]}
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase flex items-center gap-1 border-2 border-slate-900 shadow-xl">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Live
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase mb-2 ${currentPlayer.category === PlayerCategory.PREMIUM ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                        {currentPlayer.category} • {currentPlayer.gender} • {currentPlayer.position || 'N/A'}
                                    </span>
                                    <h2 className="text-4xl font-black text-white tracking-tighter leading-none truncate w-full max-w-full">{currentPlayer.name}</h2>
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                                    <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 backdrop-blur-md">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Base Price</p>
                                        <p className="text-lg font-black text-white">{formatCurrency(currentPlayer.basePrice)}</p>
                                    </div>
                                    <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 backdrop-blur-md">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Current Bid</p>
                                        <p className="text-xl font-black text-white">{formatCurrency(currentBid)}</p>
                                    </div>
                                </div>

                                {currentBidderId && (
                                    <div className="w-full mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 animate-in zoom-in-95 duration-300">
                                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/40 shrink-0">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">High Bidder</p>
                                            <p className="text-lg font-black text-white truncate">{teams.find(t => t.id === currentBidderId)?.name}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4 w-full px-4">
                                    <button onClick={() => { setCurrentPlayerIndex(currentPlayerIndex + 1); setMessage("Skipped"); }} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] border border-slate-700/50">Skip</button>
                                    <button onClick={handleSold} disabled={!currentBidderId} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 text-white font-black rounded-2xl shadow-2xl shadow-emerald-900/30 transition-all uppercase tracking-widest text-sm border border-emerald-400/20">Confirm Sale</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-12 text-center flex flex-col justify-center items-center">
                            <div className="mb-6 text-6xl">🏁</div>
                            <h2 className="text-3xl font-black text-white mb-2">Auction Finished</h2>
                            <p className="text-slate-500 font-medium">{allTeamsFull ? "All teams have reached their squad size quota." : "All players have been auctioned or skipped."}</p>
                        </div>
                    )}
                </div>

                {/* 3. TEAM GRID PANEL */}
                <div className="col-span-5 grid grid-cols-2 gap-4 overflow-y-auto custom-scrollbar no-scrollbar min-h-0 pr-2">
                    {teams.map(team => {
                        const nextBidPrice = currentBidderId ? currentBid + config.incrementValue : currentBid;
                        const isLeader = currentBidderId === team.id;

                        return (
                            <button
                                key={team.id}
                                disabled={isAuctionFinished || isLeader}
                                onClick={() => handleBid(team.id)}
                                className={`group relative p-5 rounded-[2rem] border transition-all text-left overflow-hidden ${isLeader
                                    ? 'bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-900/40 ring-4 ring-indigo-500/20'
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-600 shadow-sm'
                                    } ${allTeamsFull || team.players.length >= config.squadSize ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${isLeader ? 'bg-white text-indigo-600' : 'bg-slate-800 text-slate-500'
                                            }`}>
                                            {team.name[0]}
                                        </div>
                                        <div>
                                            <h4 className={`text-xs font-black tracking-tight ${isLeader ? 'text-white' : 'text-slate-200'}`}>{team.name}</h4>
                                            <p className={`text-[9px] font-bold ${isLeader ? 'text-indigo-100' : 'text-slate-500'}`}>SQUAD: {team.players.length}/{config.squadSize}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[8px] font-black uppercase tracking-widest ${isLeader ? 'text-indigo-200' : 'text-slate-500'}`}>Purse</p>
                                        <p className={`text-xs font-black ${isLeader ? 'text-white' : 'text-emerald-400'}`}>{formatCurrencyShort(team.purse)}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 relative z-10">
                                    {isLeader ? (
                                        <div className="flex-1 py-2 bg-white/20 backdrop-blur-md rounded-xl text-center">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Leading Bid</span>
                                        </div>
                                    ) : (
                                        <div className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-center transition-all group-hover:scale-[1.02]">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Bid {formatCurrencyShort(nextBidPrice)}</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
