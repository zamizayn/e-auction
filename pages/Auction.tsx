import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';
import { PlayerCategory, Gender } from '../types';
import { formatCurrency, formatCurrencyShort } from '../utils';

export const Auction: React.FC = () => {
    const {
        availablePlayers, teams, config, games, fetchData, setMessage,
        currentPlayerIndex, setCurrentPlayerIndex,
        currentBid, setCurrentBid,
        currentBidderId, setCurrentBidderId,
        selectedPlayerId, setSelectedPlayerId
    } = useAppContext();

    const [searchQuery, setSearchQuery] = useState('');
    const [playerSearchQuery, setPlayerSearchQuery] = useState('');
    const audioRef = React.useRef<HTMLAudioElement>(null);

    const currentPlayer = selectedPlayerId
        ? availablePlayers.find(p => p.id === selectedPlayerId)
        : availablePlayers.filter(p => !p.isSold)[currentPlayerIndex];

    // Sync initial bid with base price when player changes and no bid exists
    React.useEffect(() => {
        if (currentPlayer && !currentBidderId) {
            setCurrentBid(currentPlayer.basePrice);
        }
    }, [currentPlayer?.id, currentBidderId]);

    const allTeamsFull = teams.length > 0 && teams.every(t => t.players.length >= config.squadSize);
    const isAuctionFinished = !currentPlayer || currentPlayer.isSold || allTeamsFull;

    const calculateMaxBid = (team: any) => {
        if (!currentPlayer) return 0;
        const remainingSlots = config.squadSize - team.players.length;
        if (remainingSlots === 0) return 0;

        let reservedAmount = 0;
        if (remainingSlots > 1) {
            const otherUnsoldBasePrices = availablePlayers
                .filter(p => !p.isSold && p.id !== currentPlayer.id)
                .map(p => p.basePrice)
                .sort((a, b) => a - b);

            reservedAmount = otherUnsoldBasePrices
                .slice(0, remainingSlots - 1)
                .reduce((sum, price) => sum + price, 0);

            if (otherUnsoldBasePrices.length < remainingSlots - 1) {
                reservedAmount += (remainingSlots - 1 - otherUnsoldBasePrices.length) * config.defaultBasePrice;
            }
        }
        return Math.max(0, team.purse - reservedAmount);
    };

    const handleBid = (teamId: string) => {
        if (!currentPlayer || currentPlayer.isSold) return;

        const team = teams.find(t => t.id === teamId);
        if (!team) return;

        const nextBid = currentBidderId ? currentBid + config.incrementValue : currentBid;
        const maxAllowedBid = calculateMaxBid(team);

        if (nextBid > maxAllowedBid) {
            const remainingSlots = config.squadSize - team.players.length;
            if (team.purse < nextBid) {
                setMessage(`Insufficient funds for ${team.name}!`);
            } else {
                setMessage(`Must reserve funds for ${remainingSlots - 1} more players!`);
            }
            return;
        }

        if (team.players.length >= config.squadSize) {
            setMessage(`Squad full for ${team.name}!`);
            return;
        }

        // Quota Check
        const currentPremiumCount = team.players.filter(p => (p as any).category === PlayerCategory.PREMIUM).length;
        const currentFemaleCount = team.players.filter(p => (p as any).gender === Gender.FEMALE).length;
        const remainingSlots = config.squadSize - team.players.length;
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

            // Play Sold Sound
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.log("Sound play blocked"));
            }

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
                        <div className={`flex-1 relative overflow-hidden bg-slate-950/40 backdrop-blur-3xl border-2 rounded-[3.5rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] flex flex-col transition-all duration-700 group/card ${currentPlayer.category === PlayerCategory.PREMIUM
                            ? 'border-amber-500/40 ring-1 ring-amber-500/20 shadow-amber-900/10'
                            : 'border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-indigo-900/10'}`}>

                            {/* Dynamic Background Glows */}
                            <div className={`absolute -top-24 -left-24 w-64 h-64 opacity-20 blur-[100px] rounded-full pointer-events-none transition-colors duration-1000 ${currentPlayer.category === PlayerCategory.PREMIUM ? 'bg-amber-400' : 'bg-indigo-400'}`}></div>
                            <div className={`absolute -bottom-24 -right-24 w-64 h-64 opacity-10 blur-[100px] rounded-full pointer-events-none transition-colors duration-1000 ${currentPlayer.category === PlayerCategory.PREMIUM ? 'bg-amber-600' : 'bg-indigo-600'}`}></div>

                            <div className="relative z-10 flex-1 flex flex-col p-8 items-center text-center justify-between">
                                {/* Header: Category & Live Tag */}
                                <div className="w-full flex justify-between items-center mb-4">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase border backdrop-blur-md flex items-center gap-2 ${currentPlayer.category === PlayerCategory.PREMIUM ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'}`}>
                                        {currentPlayer.category === PlayerCategory.PREMIUM && <span>⭐</span>}
                                        {currentPlayer.category}
                                    </span>
                                    <div className="bg-red-600/10 text-red-500 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-2 border border-red-500/20 backdrop-blur-md shadow-lg shadow-red-900/10 transition-all hover:scale-105 active:scale-95">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                        Live Auction
                                    </div>
                                </div>

                                {/* Main Profile Section */}
                                <div className="flex flex-col items-center">
                                    <div className={`w-48 h-48 rounded-[3rem] border-2 p-1.5 flex items-center justify-center relative mb-8 shadow-2xl transition-all duration-700 group-hover/card:rotate-0 -rotate-3 ${currentPlayer.category === PlayerCategory.PREMIUM
                                        ? 'border-amber-500/30 shadow-amber-900/40 bg-gradient-to-br from-amber-500/10 to-transparent'
                                        : 'border-indigo-500/30 shadow-indigo-900/40 bg-gradient-to-br from-indigo-500/10 to-transparent'}`}>
                                        <div className={`w-full h-full rounded-[2.5rem] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl text-8xl font-black shadow-inner border border-white/5 ${currentPlayer.category === PlayerCategory.PREMIUM ? 'text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]'}`}>
                                            {currentPlayer.name[0]}
                                        </div>
                                    </div>

                                    <div className="space-y-2 max-w-full">
                                        <h2 className="text-6xl font-black text-white tracking-tighter leading-tight drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
                                            {currentPlayer.name}
                                        </h2>
                                        <div className="flex items-center justify-center gap-3">
                                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">{currentPlayer.gender}</p>
                                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">{currentPlayer.position || 'Player'}</p>
                                        </div>
                                    </div>

                                    {/* Participating Games - Multi-Sport Badges */}
                                    <div className="flex flex-wrap justify-center gap-2 mt-8 max-h-24 overflow-y-auto no-scrollbar py-1">
                                        {Array.from(new Set(
                                            (currentPlayer.gameIds || '').split(',')
                                                .filter(id => id)
                                                .map(id => games.find(g => g.id === id)?.sport)
                                                .filter(Boolean)
                                        )).map(sportName => (
                                            <span key={sportName} className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-300 uppercase tracking-widest backdrop-blur-md hover:border-white/30 hover:bg-white/10 transition-all cursor-default shadow-lg">
                                                {sportName}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Bidding Zone */}
                                <div className="w-full space-y-4">
                                    <div className="grid grid-cols-2 gap-4 w-full">
                                        <div className="p-6 bg-slate-950/60 rounded-[2rem] border border-white/5 backdrop-blur-2xl group/price transition-all hover:bg-slate-950/80">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 group-hover/price:text-slate-400 transition-colors">Base Price</p>
                                            <p className="text-3xl font-black text-white leading-none tracking-tight">{formatCurrency(currentPlayer.basePrice)}</p>
                                        </div>
                                        <div className={`p-6 rounded-[2rem] border backdrop-blur-2xl transition-all shadow-xl group/bid ${currentBidderId
                                            ? 'bg-indigo-600/10 border-indigo-500/50 shadow-indigo-900/20'
                                            : 'bg-slate-950/60 border-white/5 hover:bg-slate-950/80'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 transition-colors ${currentBidderId ? 'text-indigo-400' : 'text-slate-500 group-hover/bid:text-slate-400'}`}>Current Bid</p>
                                            <p className={`text-3xl font-black text-white leading-none tracking-tight ${currentBidderId ? 'animate-pulse' : ''}`}>{formatCurrency(currentBid)}</p>
                                        </div>
                                    </div>

                                    {currentBidderId && (
                                        <div className="w-full p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 shadow-2xl shadow-emerald-950/20 backdrop-blur-md">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/50">
                                                    <svg className="w-6 h-6 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1.5">Highest Bidder</p>
                                                    <p className="text-xl font-black text-white uppercase tracking-tight leading-none drop-shadow-md">
                                                        {teams.find(t => t.id === currentBidderId)?.name}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-emerald-500/20 rounded-full text-[8px] font-black text-emerald-400 uppercase tracking-widest border border-emerald-500/20">
                                                In Control
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-4 w-full pt-4">
                                        <button
                                            onClick={handleSold}
                                            disabled={!currentBidderId}
                                            className="flex-1 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-30 disabled:from-slate-800 disabled:to-slate-800 text-white font-black rounded-3xl shadow-[0_20px_40px_-15px_rgba(16,185,129,0.4)] transition-all uppercase tracking-[0.3em] text-base border border-emerald-400/20 active:scale-95 group/sold"
                                        >
                                            <span className="flex items-center justify-center gap-3">
                                                Confirm Transaction
                                                <svg className="w-5 h-5 transition-transform group-hover/sold:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                            </span>
                                        </button>
                                    </div>
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
                                    <div className="text-right space-y-2">
                                        <div>
                                            <p className={`text-[7px] font-black uppercase tracking-widest ${isLeader ? 'text-indigo-200' : 'text-slate-500'}`}>Purse</p>
                                            <p className={`text-xs font-black ${isLeader ? 'text-white' : 'text-emerald-400'}`}>{formatCurrencyShort(team.purse)}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg border backdrop-blur-md ${isLeader ? 'bg-white/10 border-white/10' : 'bg-slate-950/20 border-slate-800'}`}>
                                            <p className={`text-[6px] font-black uppercase tracking-[0.2em] ${isLeader ? 'text-indigo-100' : 'text-slate-500'}`}>Max Bid</p>
                                            <p className={`text-[10px] font-black ${isLeader ? 'text-white' : 'text-amber-400'}`}>{formatCurrencyShort(calculateMaxBid(team))}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Categorized Roster View */}
                                <div className="mb-4 space-y-3 relative z-10 px-1">
                                    {/* Premium Stars Section */}
                                    {team.players.filter(p => p.category === PlayerCategory.PREMIUM).length > 0 && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5 px-1">
                                                <span className="text-amber-500 text-[10px]">⭐</span>
                                                <p className={`text-[8px] font-black uppercase tracking-widest ${isLeader ? 'text-amber-200' : 'text-amber-500/80'}`}>Premium Stars</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {team.players.filter(p => p.category === PlayerCategory.PREMIUM).map(p => (
                                                    <div key={p.id} className={`px-2 py-1 rounded-lg border text-[9px] font-black tracking-tight ${isLeader
                                                        ? 'bg-amber-500/30 border-amber-400/30 text-white'
                                                        : 'bg-amber-500/5 border-amber-500/20 text-amber-500'
                                                        }`}>
                                                        {p.name.split(' ')[0]}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Standard Squad Section */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center px-1">
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${isLeader ? 'text-indigo-200' : 'text-slate-500'}`}>Squad Roster</p>
                                            <span className={`text-[8px] font-black ${isLeader ? 'text-white' : 'text-slate-400'}`}>{team.players.filter(p => p.category !== PlayerCategory.PREMIUM).length} Players</span>
                                        </div>
                                        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto no-scrollbar pr-1">
                                            {team.players.filter(p => p.category !== PlayerCategory.PREMIUM).length > 0 ? (
                                                team.players.filter(p => p.category !== PlayerCategory.PREMIUM).map(p => (
                                                    <div key={p.id} className={`flex items-center justify-between px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all ${isLeader
                                                        ? 'bg-white/10 border-white/10 hover:bg-white/20'
                                                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                                                        }`}>
                                                        <span className={`text-[10px] font-bold truncate ${isLeader ? 'text-white' : 'text-slate-300'}`}>
                                                            {p.name}
                                                        </span>
                                                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter bg-slate-800 text-slate-500">
                                                            S
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-2">
                                                    <p className={`text-[9px] italic font-medium ${isLeader ? 'text-indigo-200' : 'text-slate-700'}`}>None</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 relative z-10">
                                    {isLeader ? (
                                        <div className="flex-1 py-2 bg-white/20 backdrop-blur-md rounded-xl text-center">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Leading Bid</span>
                                        </div>
                                    ) : (
                                        <div className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-center transition-all group-hover:scale-[1.02]">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest shadow-sm">Bid {formatCurrencyShort(nextBidPrice)}</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3" />
        </div>
    );
};
