
import React, { useState, useEffect } from 'react';
import { Player, Team, AuctionConfig, PlayerCategory, Gender, SportType } from './types';
import { DEFAULT_CONFIG, ADMIN_CREDENTIALS, SPORTS } from './constants';
import SettingsModal from './components/SettingsModal';
import ImportPlayers from './components/ImportPlayers';
import { api } from './services/api';

export interface Game {
  id: string;
  name: string;
  type: string;
  pointsFirst: number;
  pointsSecond: number;
  pointsThird: number;
}

type View = 'dashboard' | 'auction' | 'teams' | 'players' | 'games' | 'standings';

const App: React.FC = () => {
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [loginError, setLoginError] = useState('');

  // Check login persistence
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // App State
  const [config, setConfig] = useState<AuctionConfig>(DEFAULT_CONFIG);
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [teams, setTeams] = useState<Team[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  // Auction Logic State
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentBid, setCurrentBid] = useState(0);
  const [currentBidderId, setCurrentBidderId] = useState<string | null>(null);

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Auto-hide message
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Manual entry states
  const [newTeamName, setNewTeamName] = useState('');
  const [newPlayer, setNewPlayer] = useState<Partial<Player>>({ category: PlayerCategory.STANDARD, gender: Gender.MALE });

  // Match Recording State
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchData, setMatchData] = useState({
    gameId: '',
    teamAId: '',
    teamBId: '',
    winnerId: '' // 'draw' or teamId
  });

  // Initial Data Fetch
  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      const [cfg, tms, plys, gms] = await Promise.all([
        api.getConfig(),
        api.getTeams(),
        api.getPlayers(),
        api.getGames()
      ]);
      setConfig(cfg || DEFAULT_CONFIG);
      setTeams(tms);
      setAvailablePlayers(plys);
      setGames(gms);
    } catch (err) {
      console.error("Failed to fetch data", err);
      setMessage("Error connecting to backend!");
    }
  };

  // Sync current player index to first unsold
  useEffect(() => {
    if (availablePlayers.length > 0) {
      const firstUnsold = availablePlayers.findIndex(p => !p.isSold);
      if (firstUnsold !== -1) {
        setCurrentPlayerIndex(firstUnsold);
      } else {
        setCurrentPlayerIndex(availablePlayers.length);
      }
    }
  }, [availablePlayers.length]); // Only on load/length change, not every render



  useEffect(() => {
    if (currentPlayer && !currentPlayer.isSold) {
      setCurrentBid(currentPlayer.basePrice);
      setCurrentBidderId(null);
    }
  }, [currentPlayerIndex, availablePlayers]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.login({ username: loginForm.user, password: loginForm.pass });
      if (res.success) {
        localStorage.setItem('authToken', res.token);
        setIsLoggedIn(true);
      } else {
        throw new Error('Login failed');
      }
    } catch (err) {
      setLoginError('Invalid credentials');
    }
  };

  const addTeam = async () => {
    if (teams.length >= config.maxTeams) {
      setMessage(`Maximum team limit(${config.maxTeams}) reached!`);

      return;
    }
    if (!newTeamName.trim()) return;

    try {
      const newTeam = await api.addTeam(newTeamName, config.totalPurse);
      setTeams([...teams, { ...newTeam, players: [] }]);
      setNewTeamName('');
    } catch (err) {
      setMessage("Failed to add team");
    }
  };

  const addPlayerManually = async () => {
    if (!newPlayer.name || !newPlayer.basePrice) return;
    try {
      const added = await api.addPlayer({
        ...newPlayer,
        isSold: false
      });
      setAvailablePlayers([...availablePlayers, added]);
      setNewPlayer({ category: PlayerCategory.STANDARD, gender: Gender.MALE });
      setMessage("Player Added Successfully");

    } catch (err) {
      setMessage("Failed to add player");
    }
  };

  const handleBid = (teamId: string) => {
    if (!currentPlayer || currentPlayer.isSold) return;

    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const nextBid = currentBidderId ? currentBid + config.incrementValue : currentBid;

    if (team.purse < nextBid) {
      setMessage(`Insufficient funds for ${team.name}!`);

      return;
    }

    if (team.players.length >= config.squadSize) {
      setMessage(`Squad full for ${team.name}!`);

      return;
    }

    setCurrentBid(nextBid);
    setCurrentBidderId(teamId);
  };

  const handleSold = async () => {
    // Use the derived currentPlayer which respects manual selection
    const targetPlayer = currentPlayer;
    const targetTeamId = currentBidderId;
    const finalPrice = currentBid;

    if (!targetPlayer || !targetTeamId || targetPlayer.isSold) return;

    try {
      // Call API
      await api.sellPlayer(targetPlayer.id, targetTeamId, finalPrice);

      // Optimistic Update or Refetch
      // Let's refetch to be safe and ensure consistency
      await fetchData();

      // Reset Turn
      setCurrentBidderId(null);
      setCurrentBid(0);

      // Move to next
      // fetchData will update availablePlayers, and the useEffect will sync index if needed, 
      // but we want to just increment index to stay on flow?
      // Actually, if we refetch, the player at current index is now SOLD.
      // So we should just increment index.
      if (currentPlayerIndex < availablePlayers.length - 1) {
        setCurrentPlayerIndex(prev => prev + 1);
      } else {
        setMessage("Auction Concluded!");
      }

      setSelectedPlayerId(null);
      setMessage(`SOLD to ${teams.find(t => t.id === targetTeamId)?.name} !`);
    } catch (err) {
      setMessage("Transaction Failed!");
    }
  };

  const handleImport = async (ps: any[]) => {
    try {
      await api.importPlayers(ps);
      const plys = await api.getPlayers();
      setAvailablePlayers(plys);
      setMessage(`${ps.length} Players Imported!`);

    } catch (err) {
      setMessage("Import Failed");
    }
  };

  const handleConfigSave = async (newCfg: AuctionConfig) => {
    try {
      const saved = await api.updateConfig(newCfg);
      setConfig(saved);
      setIsSettingsOpen(false);
      setMessage("Configuration Applied!");

    } catch (err) {
      setMessage("Failed to save config");
    }
  };

  const handleMatchSubmit = async () => {
    if (!matchData.teamAId || !matchData.teamBId || !matchData.winnerId || !matchData.gameId) {
      setMessage("Please select game, both teams and a result");
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

      // Update Team A
      await api.updateTeam(teamA.id, {
        matchesPlayed: (teamA.matchesPlayed || 0) + 1,
        won: (teamA.won || 0) + (isDraw ? 0 : (winnerId === teamA.id ? 1 : 0)),
        lost: (teamA.lost || 0) + (isDraw ? 0 : (winnerId === teamA.id ? 0 : 1)),
        tie: (teamA.tie || 0) + (isDraw ? 1 : 0),
        points: (teamA.points || 0) + (isDraw ? ptsDraw : (winnerId === teamA.id ? ptsWin : ptsLose))
      });

      // Update Team B
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

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this player?")) return;
    try {
      await api.deletePlayer(id);
      setAvailablePlayers(prev => prev.filter(p => p.id !== id));
      setMessage("Player Deleted!");
    } catch (err) {
      setMessage("Failed to delete player");
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const currentPlayer = selectedPlayerId
    ? availablePlayers.find(p => p.id === selectedPlayerId)
    : availablePlayers.filter(p => !p.isSold)[currentPlayerIndex];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg shadow-indigo-500/20">🏆</div>
            <h1 className="text-2xl font-black text-white">Auction Admin Login</h1>
            <p className="text-slate-500 text-sm mt-2">Enter credentials to manage the pro-league</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input type="text" placeholder="Username" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={loginForm.user} onChange={e => setLoginForm({ ...loginForm, user: e.target.value })} />
            </div>
            <div>
              <input type="password" placeholder="Password" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={loginForm.pass} onChange={e => setLoginForm({ ...loginForm, pass: e.target.value })} />
            </div>
            {loginError && <p className="text-red-400 text-xs text-center font-bold">{loginError}</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/40 transition-all uppercase tracking-widest mt-4">Enter Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'} bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300`}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black">A</div>
            <h1 className="font-black text-white tracking-tight">AUCTION HUB</h1>
          </div>
          <div className="mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> {config.activeSport.toUpperCase()} MODE
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            {
              id: 'dashboard',
              label: 'Dashboard',
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            },
            {
              id: 'auction',
              label: 'Live Auction',
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            },
            {
              id: 'teams',
              label: 'Teams',
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            },
            {
              id: 'players',
              label: 'Players',
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            },
            {
              id: 'games',
              label: 'Games',
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>
            },
            {
              id: 'standings',
              label: 'Points Table',
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeView === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-all font-bold text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            Settings
          </button>
          <button onClick={() => { setIsLoggedIn(false); localStorage.removeItem('authToken'); }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 transition-all font-bold text-sm mt-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col bg-slate-950">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute bottom-4 left-4 z-50 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-700 shadow-lg"
        >
          {isSidebarOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          )}
        </button>

        {message && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-2xl animate-bounce border-2 border-indigo-400">
            {message}
          </div>
        )}

        <div className="flex-1 overflow-hidden p-6">
          {activeView === 'dashboard' && (
            <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: 'Total Players', val: availablePlayers.length, icon: '👥' },
                  { label: 'Players Sold', val: availablePlayers.filter(p => p.isSold).length, icon: '✅' },
                  { label: 'Active Teams', val: teams.length, icon: '🛡️' },
                  { label: 'Total Purse Vol', val: formatCurrency(teams.length * config.totalPurse), icon: '💰' },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-sm">
                    <div className="text-2xl mb-2">{stat.icon}</div>
                    <p className="text-xs font-bold text-slate-500 uppercase">{stat.label}</p>
                    <p className="text-2xl font-black text-white mt-1">{stat.val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                  <h3 className="text-lg font-black mb-6 text-white flex items-center gap-2">Recent Sales</h3>
                  <div className="space-y-4">
                    {availablePlayers.filter(p => p.isSold).reverse().slice(0, 5).map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center font-bold">{p.name[0]}</div>
                          <div>
                            <p className="text-sm font-bold text-white">{p.name}</p>
                            <p className="text-[10px] text-indigo-400 font-bold uppercase">{teams.find(t => t.id === p.teamId)?.name}</p>
                          </div>
                        </div>
                        <p className="text-emerald-400 font-black text-sm">{formatCurrency(p.soldPrice || 0)}</p>
                      </div>
                    ))}
                    {availablePlayers.filter(p => p.isSold).length === 0 && (
                      <p className="text-center py-10 text-slate-600 font-medium italic">No sales yet today.</p>
                    )}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                  <h3 className="text-lg font-black mb-6 text-white">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setActiveView('auction')} className="p-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl hover:bg-indigo-600/20 transition-all text-left group">
                      <span className="text-xl block mb-2 group-hover:scale-110 transition-transform">⚡</span>
                      <p className="font-bold text-indigo-400 text-sm">Start Auction</p>
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl hover:bg-slate-800 transition-all text-left">
                      <span className="text-xl block mb-2">⚙️</span>
                      <p className="font-bold text-slate-400 text-sm">Configure Rules</p>
                    </button>
                    <button onClick={() => api.resetAuction(true).then(() => { fetchData(); setMessage("Reset & Seeded!"); })} className="p-4 bg-red-600/10 border border-red-500/30 rounded-2xl hover:bg-red-600/20 transition-all text-left group">
                      <span className="text-xl block mb-2 group-hover:scale-110 transition-transform">🔄</span>
                      <p className="font-bold text-red-400 text-sm">Reset & Seed</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'auction' && (
            <div className="h-full flex flex-col animate-in slide-in-from-bottom-8 duration-700 overflow-hidden">
              {/* Player Selection Bar */}
              <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center gap-4 shrink-0">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search player to auction..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 pl-10 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>

                  {searchQuery && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50">
                      {availablePlayers
                        .filter(p => !p.isSold && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedPlayerId(p.id);
                              setSearchQuery('');
                              setMessage(`Selected ${p.name} `);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700/50 last:border-0 flex justify-between items-center"
                          >
                            <span className="font-bold text-white">{p.name}</span>
                            <span className="text-xs text-slate-400">{p.category} • {p.position}</span>
                          </button>
                        ))}
                      {availablePlayers.filter(p => !p.isSold && p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="p-4 text-center text-slate-500 text-sm">No unsold players found</div>
                      )}
                    </div>
                  )}
                </div>

                {selectedPlayerId && (
                  <button
                    onClick={() => { setSelectedPlayerId(null); setMessage("Returned to Queue"); }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-700"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 p-6">

                {/* STADIUM CENTER STAGE (Left 5/12) */}
                <div className="col-span-5 flex flex-col min-h-0">
                  {currentPlayer && !currentPlayer.isSold ? (
                    <div className={`flex - 1 relative overflow - hidden bg - slate - 900 border - 2 rounded - [2.5rem] p - 8 shadow - 2xl flex flex - col justify - center transition - all duration - 500 ${currentPlayer.category === PlayerCategory.PREMIUM ? 'border-amber-500/30 ring-4 ring-amber-500/5' : 'border-indigo-500/30 ring-4 ring-indigo-500/5'} `}>
                      <div className={`absolute top - 0 right - 0 w - 48 h - 48 blur - [80px] - mr - 24 - mt - 24 rounded - full opacity - 30 ${currentPlayer.category === PlayerCategory.PREMIUM ? 'bg-amber-400' : 'bg-indigo-400'} `}></div>

                      <div className="flex flex-col items-center text-center relative z-10">
                        <div className={`w - 32 h - 32 md: w - 44 md: h - 44 rounded - full border - [6px] p - 1 flex items - center justify - center relative mb - 6 ${currentPlayer.category === PlayerCategory.PREMIUM ? 'border-amber-500/20' : 'border-indigo-500/20'} `}>
                          <div className={`w - full h - full rounded - full flex items - center justify - center bg - slate - 800 text - 6xl md: text - 7xl font - black ${currentPlayer.category === PlayerCategory.PREMIUM ? 'text-amber-500' : 'text-slate-500'} `}>
                            {currentPlayer.name[0]}
                          </div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase flex items-center gap-1 border-2 border-slate-900 shadow-xl">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Live
                          </div>
                        </div>

                        <div className="mb-6">
                          <span className={`inline - block px - 3 py - 1 rounded - lg text - [10px] font - black tracking - widest uppercase mb - 2 ${currentPlayer.category === PlayerCategory.PREMIUM ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'} `}>
                            {currentPlayer.category} • {currentPlayer.gender} • {currentPlayer.position || 'N/A'}
                          </span>
                          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none truncate w-full max-w-full">{currentPlayer.name}</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
                          <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 backdrop-blur-md">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Base Price</p>
                            <p className="text-xl font-black text-white">{formatCurrency(currentPlayer.basePrice)}</p>
                          </div>
                          <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 backdrop-blur-md">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Current Bid</p>
                            <p className="text-2xl font-black text-white">{formatCurrency(currentBid)}</p>
                          </div>
                        </div>

                        {currentBidderId && (
                          <div className="w-full max-w-sm mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 animate-in zoom-in-95 duration-300">
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
                          <button onClick={() => { setCurrentPlayerIndex(prev => prev + 1); setMessage("Skipped"); }} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] border border-slate-700/50">Skip</button>
                          <button onClick={handleSold} disabled={!currentBidderId} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 text-white font-black rounded-2xl shadow-2xl shadow-emerald-900/30 transition-all uppercase tracking-widest text-sm border border-emerald-400/20">Confirm Sale</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-12 text-center flex flex-col justify-center items-center">
                      <div className="mb-6 text-6xl">🏁</div>
                      <h2 className="text-3xl font-black text-white mb-2">Auction Finished</h2>
                      <p className="text-slate-500 font-medium">All players have been auctioned or skipped.</p>
                      <button onClick={() => setActiveView('dashboard')} className="mt-8 px-10 py-4 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest text-xs">Return Dashboard</button>
                    </div>
                  )}
                </div>

                {/* TEAM GRID PANEL (Right 7/12) */}
                <div className="col-span-7 grid grid-cols-2 gap-4 overflow-hidden min-h-0">
                  {teams.map(team => {
                    const nextBidPrice = currentBidderId ? currentBid + config.incrementValue : currentBid;
                    const canAfford = team.purse >= nextBidPrice;
                    const isLeader = currentBidderId === team.id;
                    const premiumCount = team.players.filter(p => p.category === PlayerCategory.PREMIUM).length;
                    const femaleCount = team.players.filter(p => p.gender === Gender.FEMALE).length;

                    return (
                      <div key={team.id} className={`flex flex - col rounded - [2.2rem] border transition - all duration - 300 min - h - 0 overflow - hidden ${isLeader ? 'bg-indigo-600/10 border-indigo-500 ring-4 ring-indigo-500/10' : 'bg-slate-900/50 border-slate-800'} `}>
                        {/* Team Header */}
                        <div className="p-4 bg-slate-950/20 border-b border-white/5 flex justify-between items-center shrink-0">
                          <div className="overflow-hidden">
                            <h4 className="font-black text-white text-sm tracking-tight mb-1 truncate">{team.name}</h4>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <span className={`text - [8px] px - 1.5 py - 0.5 rounded font - black ${premiumCount >= config.minPremium ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} `}>P:{premiumCount}/{config.minPremium}</span>
                                <span className={`text - [8px] px - 1.5 py - 0.5 rounded font - black ${femaleCount >= config.minFemale ? 'bg-emerald-500/20 text-emerald-400' : 'bg-pink-500/20 text-pink-400'} `}>F:{femaleCount}/{config.minFemale}</span>
                              </div>
                              <span className="text-[9px] text-slate-500 font-bold shrink-0">{team.players.length}/{config.squadSize}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-emerald-400">{formatCurrency(team.purse)}</p>
                            <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Available</p>
                          </div>
                        </div>

                        {/* Squad List Area - 3 Column Grid for 15 Players (No Scroll) */}
                        <div className="flex-1 bg-black/30 p-2 overflow-hidden">
                          <div className="grid grid-cols-3 gap-1 h-full content-start">
                            {team.players.map((p, i) => (
                              <div key={p.id} className="bg-slate-800/40 rounded-lg p-1 text-[8px] border border-white/5 truncate flex flex-col justify-center">
                                <span className="text-slate-300 font-bold truncate leading-tight">#{i + 1} {p.name.split(' ')[0]}</span>
                                <span className="text-indigo-400 font-black tracking-tighter">{formatCurrency(p.soldPrice || 0).replace('₹', '')}</span>
                              </div>
                            ))}
                            {/* Visual placeholders for remaining slots to maintain layout stability */}
                            {Array.from({ length: Math.max(0, config.squadSize - team.players.length) }).map((_, i) => (
                              <div key={`empty - ${i} `} className="bg-white/5 border border-dashed border-white/10 rounded-lg h-6 flex items-center justify-center">
                                <span className="text-[8px] text-white/10 font-black">{team.players.length + i + 1}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bid Controls */}
                        <div className="p-3 bg-slate-950/20 border-t border-white/5 shrink-0">
                          <button
                            onClick={() => handleBid(team.id)}
                            disabled={!currentPlayer || currentPlayer.isSold || !canAfford || isLeader || team.players.length >= config.squadSize}
                            className={`w - full py - 3 rounded - xl text - [10px] font - black uppercase tracking - widest transition - all ${isLeader
                              ? 'bg-emerald-600 text-white cursor-default'
                              : team.players.length >= config.squadSize
                                ? 'bg-slate-950 text-slate-700 cursor-not-allowed border border-slate-900'
                                : canAfford
                                  ? 'bg-slate-800 hover:bg-indigo-600 text-white border border-slate-700 shadow-xl'
                                  : 'bg-slate-950 text-slate-700 cursor-not-allowed border border-slate-900'
                              } `}
                          >
                            {isLeader ? 'HOLDING BID' : team.players.length >= config.squadSize ? 'SQUAD FULL' : canAfford ? `BID ${formatCurrency(nextBidPrice).replace('.00', '')} ` : 'BLOCKED'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* UPCOMING TICKER (Shrink to fit) */}
              <div className="mt-4 shrink-0 flex items-center gap-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-2 px-4 overflow-hidden">
                <span className="px-3 py-1 bg-slate-800 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-700 shrink-0">Queue</span>
                <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap custom-scrollbar no-scrollbar-x pb-0.5">
                  {availablePlayers.slice(currentPlayerIndex + 1, currentPlayerIndex + 15).map(p => (
                    <div key={p.id} className="flex items-center gap-2.5 group">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[8px] text-slate-600 shrink-0">{p.name[0]}</div>
                      <div className="flex flex-col -space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 truncate">{p.name}</span>
                        <span className="text-[7px] font-black text-indigo-500/40 uppercase tracking-tighter">{p.category}</span>
                      </div>
                      <div className="w-1 h-1 bg-slate-800 rounded-full mx-1 last:hidden"></div>
                    </div>
                  ))}
                  {availablePlayers.length <= currentPlayerIndex + 1 && <span className="text-xs text-slate-600 italic">No more players</span>}
                </div>
              </div>
            </div>
          )}

          {activeView === 'teams' && (
            <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-in slide-in-from-left-4 duration-500">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-white">Team Management</h2>
                  <p className="text-slate-500 text-sm mt-1">{teams.length} of {config.maxTeams} slots filled</p>
                </div>
                <div className="flex items-center gap-3">
                  <input type="text" placeholder="New Team Name" className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                  <button onClick={addTeam} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/40">Add Team</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pb-20">
                {teams.map(team => (
                  <div key={team.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-white">{team.name}</h3>
                      <p className="text-lg font-black text-emerald-400">{formatCurrency(team.purse)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {team.players.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 bg-slate-800/30 rounded-xl border border-slate-800">
                          <span className="text-xs font-bold text-slate-300 truncate">{p.name}</span>
                          <span className="text-[9px] font-black text-indigo-400 uppercase shrink-0">{p.category}</span>
                        </div>
                      ))}
                      {team.players.length === 0 && (
                        <p className="col-span-2 text-center py-6 text-slate-600 text-sm italic">No players drafted yet</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'players' && (
            <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-white">Player Roster</h2>
                  <p className="text-slate-500 text-sm mt-1">{availablePlayers.length} total participants</p>
                </div>
                <ImportPlayers onImport={handleImport} />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Manual Entry Form</h3>
                <div className="flex flex-wrap gap-4">
                  <input type="text" placeholder="Full Name" className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" value={newPlayer.name || ''} onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })} />
                  <input type="text" placeholder="Emp No" className="w-32 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" value={newPlayer.employee_no || ''} onChange={e => setNewPlayer({ ...newPlayer, employee_no: e.target.value })} />
                  <input type="text" placeholder="Position" className="w-40 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" value={newPlayer.position || ''} onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })} />
                  <input type="number" placeholder="Base Price" className="w-40 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" value={newPlayer.basePrice || ''} onChange={e => setNewPlayer({ ...newPlayer, basePrice: parseInt(e.target.value) || 0 })} />
                  <select className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" value={newPlayer.category} onChange={e => setNewPlayer({ ...newPlayer, category: e.target.value as PlayerCategory })}>
                    <option value={PlayerCategory.STANDARD}>Standard</option>
                    <option value={PlayerCategory.PREMIUM}>Premium</option>
                  </select>
                  <select className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none" value={newPlayer.gender} onChange={e => setNewPlayer({ ...newPlayer, gender: e.target.value as Gender })}>
                    <option value={Gender.MALE}>Male</option>
                    <option value={Gender.FEMALE}>Female</option>
                  </select>
                  <button onClick={addPlayerManually} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-8 py-3 transition-all uppercase tracking-widest text-xs">Add Player</button>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden mb-20">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/50 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Emp No</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Gender</th>
                      <th className="px-6 py-4">Position</th>
                      <th className="px-6 py-4">Base Price</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {availablePlayers.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-white">{p.name}</td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-bold">{p.employee_no || '-'}</td>
                        <td className="px-6 py-4"><span className={`px - 2 py - 1 rounded - full text - [9px] font - black uppercase ${p.category === PlayerCategory.PREMIUM ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-700 text-slate-400'} `}>{p.category}</span></td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-bold">{p.gender}</td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-bold">{p.position || '-'}</td>
                        <td className="px-6 py-4 text-sm font-black text-indigo-400">{formatCurrency(p.basePrice)}</td>
                        <td className="px-6 py-4">
                          {p.isSold ? (
                            <span className="text-emerald-400 text-xs font-bold uppercase flex items-center gap-1">
                              <span className="w-1 h-1 bg-emerald-400 rounded-full"></span> Sold
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs font-bold uppercase">Pending</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => handleDeletePlayer(p.id)} className="text-red-400 hover:text-red-300 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'games' && (
            <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-white">Game Management</h2>
                  <p className="text-slate-500 text-sm mt-1">Manage the list of available sports/games</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <select id="newGameType" className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Team Match">Team Match</option>
                    <option value="Single Match">Single Match</option>
                    <option value="Doubles">Doubles</option>
                    <option value="Mixed Doubles">Mixed Doubles</option>
                  </select>
                  <input
                    type="text"
                    placeholder="New Game Name"
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    id="newGameInput"
                  />
                  <input type="number" id="ptsFirst" placeholder="1st Pts" defaultValue="2" className="w-20 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm" />
                  <input type="number" id="ptsSecond" placeholder="2nd Pts" defaultValue="0" className="w-20 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm" />
                  <input type="number" id="ptsThird" placeholder="3rd Pts" defaultValue="0" className="w-20 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-sm" />

                  <button
                    onClick={async () => {
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
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/40"
                  >
                    Add Game
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map(game => (
                  <div key={game.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex justify-between items-center group hover:border-indigo-500/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🎮</div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{game.name}</h3>
                        <p className="text-xs text-slate-500 uppercase font-black tracking-wider">{game.type}</p>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Delete ${game.name}?`)) {
                          try {
                            await api.deleteGame(game.id);
                            setGames(games.filter(g => g.id !== game.id));
                            setMessage("Game Deleted!");
                          } catch (err) {
                            setMessage("Failed to delete game");
                          }
                        }
                      }}
                      className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                ))}
                {games.length === 0 && (
                  <div className="col-span-full text-center py-20 text-slate-600 italic">
                    No games added yet. Add one to get started!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'standings' && (
            <div className="h-full overflow-y-auto custom-scrollbar space-y-8 animate-in slide-in-from-right-4 duration-500 p-6">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-white">Points Table</h2>
                  <p className="text-slate-500 text-sm mt-1">League Standings & Statistics</p>
                </div>
                <button
                  onClick={() => setIsMatchModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/40"
                >
                  Record Match Result
                </button>
              </div>

              {/* Match Modal */}
              {isMatchModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                    <h3 className="text-2xl font-black text-white mb-6">Record Match Result</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Select Game / Sport</label>
                        <select
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                          value={matchData.gameId}
                          onChange={e => setMatchData({ ...matchData, gameId: e.target.value })}
                        >
                          <option value="">Select Game</option>
                          {games.map(g => <option key={g.id} value={g.id}>{g.name} (1st: {g.pointsFirst}, 2nd: {g.pointsSecond})</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Team A</label>
                          <select
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                            value={matchData.teamAId}
                            onChange={e => setMatchData({ ...matchData, teamAId: e.target.value })}
                          >
                            <option value="">Select Team</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Team B</label>
                          <select
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none"
                            value={matchData.teamBId}
                            onChange={e => setMatchData({ ...matchData, teamBId: e.target.value })}
                          >
                            <option value="">Select Team</option>
                            {teams.filter(t => t.id !== matchData.teamAId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Result</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setMatchData({ ...matchData, winnerId: matchData.teamAId })}
                            disabled={!matchData.teamAId}
                            className={`py - 3 rounded - xl font - bold text - xs uppercase ${matchData.winnerId === matchData.teamAId ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'} `}
                          >
                            {matchData.teamAId ? teams.find(t => t.id === matchData.teamAId)?.name : 'Team A'} Wins
                          </button>
                          <button
                            onClick={() => setMatchData({ ...matchData, winnerId: 'draw' })}
                            className={`py - 3 rounded - xl font - bold text - xs uppercase ${matchData.winnerId === 'draw' ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'} `}
                          >
                            Draw
                          </button>
                          <button
                            onClick={() => setMatchData({ ...matchData, winnerId: matchData.teamBId })}
                            disabled={!matchData.teamBId}
                            className={`py - 3 rounded - xl font - bold text - xs uppercase ${matchData.winnerId === matchData.teamBId ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'} `}
                          >
                            {matchData.teamBId ? teams.find(t => t.id === matchData.teamBId)?.name : 'Team B'} Wins
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-4 mt-8 pt-4 border-t border-slate-800">
                        <button onClick={() => setIsMatchModalOpen(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black rounded-xl uppercase tracking-widest text-xs">Cancel</button>
                        <button onClick={handleMatchSubmit} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest text-xs shadow-lg shadow-emerald-900/40">Save Result</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                      <th className="px-6 py-4">Rank</th>
                      <th className="px-6 py-4">Team</th>
                      <th className="px-6 py-4 text-center">P</th>
                      <th className="px-6 py-4 text-center">W</th>
                      <th className="px-6 py-4 text-center">L</th>
                      <th className="px-6 py-4 text-center">T</th>
                      <th className="px-6 py-4 text-center">NRR</th>
                      <th className="px-6 py-4 text-center">Pts</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {[...teams]
                      .sort((a, b) => (b.points || 0) - (a.points || 0) || (b.nrr || 0) - (a.nrr || 0))
                      .map((team, index) => (
                        <tr key={team.id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-4 font-black text-slate-500">#{index + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-lg font-bold text-indigo-500">
                                {team.name[0]}
                              </div>
                              <span className="font-bold text-white">{team.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-300">{team.matchesPlayed || 0}</td>
                          <td className="px-6 py-4 text-center font-bold text-emerald-400">{team.won || 0}</td>
                          <td className="px-6 py-4 text-center font-bold text-red-400">{team.lost || 0}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-400">{team.tie || 0}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-300">{team.nrr?.toFixed(3) || '0.000'}</td>
                          <td className="px-6 py-4 text-center font-black text-xl text-white">{team.points || 0}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                const p = prompt("Enter Matches Played, Won, Lost, Tie, NRR, Points (comma separated)",
                                  `${team.matchesPlayed || 0},${team.won || 0},${team.lost || 0},${team.tie || 0},${team.nrr || 0},${team.points || 0} `);
                                if (p) {
                                  const [mp, w, l, t, nrr, pts] = p.split(',').map(Number);
                                  if (!isNaN(mp)) {
                                    api.updateTeam(team.id, { matchesPlayed: mp, won: w, lost: l, tie: t, nrr: nrr, points: pts })
                                      .then(updated => {
                                        setTeams(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
                                        setMessage("Stats Updated!");
                                      })
                                      .catch(() => setMessage("Update Failed"));
                                  }
                                }
                              }}
                              className="text-indigo-400 hover:text-indigo-300 font-bold text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {teams.length === 0 && (
                  <div className="p-10 text-center text-slate-500 italic">No teams available.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {isSettingsOpen && (
        <SettingsModal
          config={config}
          onSave={handleConfigSave}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
