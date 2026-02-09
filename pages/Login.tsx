import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { ADMIN_CREDENTIALS } from '../constants';

export const Login: React.FC = () => {
    const { setIsLoggedIn } = useAppContext();
    const navigate = useNavigate();
    const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
    const [loginError, setLoginError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (loginForm.user === ADMIN_CREDENTIALS.username && loginForm.pass === ADMIN_CREDENTIALS.password) {
            setIsLoggedIn(true);
            localStorage.setItem('authToken', 'logged-in');
            navigate('/dashboard');
        } else {
            setLoginError('Invalid Administrator Credentials');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-pulse"></div>
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[120px] opacity-20 animate-pulse delay-700"></div>

            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
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

                <div className="mt-8 pt-8 border-t border-slate-800/50 text-center">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Or View Public Stats</p>
                    <button
                        onClick={() => {
                            navigate('/standings');
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-400 font-black py-4 rounded-xl transition-all uppercase tracking-widest text-xs border border-slate-700"
                    >
                        View Points Table
                    </button>
                </div>
            </div>
        </div>
    );
};
