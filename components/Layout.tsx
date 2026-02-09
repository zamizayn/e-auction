import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAppContext } from '../context/AppContext';

export const Layout: React.FC = () => {
    const { message } = useAppContext();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="h-screen bg-slate-950 flex text-slate-200 overflow-hidden font-sans">
            <Sidebar isOpen={isSidebarOpen} />

            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* Header */}
                <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-8 shrink-0">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>

                    {/* Header search or stats can go here */}
                </header>

                <div className="flex-1 overflow-hidden">
                    <Outlet />
                </div>

                {/* Toast Message */}
                {message && (
                    <div className="fixed bottom-8 right-8 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50">
                        <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-indigo-900/40 font-black text-sm tracking-widest flex items-center gap-3 border border-indigo-400/30">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            {message.toUpperCase()}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
