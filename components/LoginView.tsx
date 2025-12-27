
import React, { useState } from 'react';
import { Fingerprint, Scan, ShieldCheck, Key, AlertTriangle, ShieldAlert, Eye, EyeOff, Ban, Server, FileCheck, Layers } from 'lucide-react';
import { AUTHORIZED_USERS } from '../constants';
import { User } from '../types';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const MAX_ATTEMPTS = 3;

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ id: '', key: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const handleAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!credentials.id || !credentials.key || isLocked) return;

    setIsAuthenticating(true);
    setError(null);

    // Simulate Network Latency
    setTimeout(() => {
      const user = AUTHORIZED_USERS.find(u => u.id === credentials.id && u.key === credentials.key);

      if (user) {
        onLogin(user);
        setAttempts(0);
      } else {
        setIsAuthenticating(false);
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= MAX_ATTEMPTS) {
            setIsLocked(true);
            setError("MAX_RETRIES_EXCEEDED: SYSTEM_LOCKDOWN_INITIATED");
        } else {
            setError(`ACCESS DENIED: INVALID CREDENTIALS`);
        }
      }
    }, 1500);
  };

  return (
    <div className="h-screen w-full bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center flex items-center justify-center relative overflow-hidden">
      {/* Overlay for deep space vibe */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
      
      {/* Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:100px_100px]"></div>

      <div className="flex flex-col items-center gap-8 z-10 w-full max-w-md">
        
        <div className={`w-full p-8 bg-slate-900/60 border backdrop-blur-xl rounded-2xl transition-all duration-300 ${
            isLocked 
                ? 'border-red-600 shadow-[0_0_80px_rgba(220,38,38,0.4)]' 
                : error 
                    ? 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.2)]' 
                    : 'border-slate-700/50 shadow-[0_0_50px_rgba(37,99,235,0.2)]'
        }`}>
            <form onSubmit={handleAuth} className="flex flex-col items-center gap-6">
            {/* Logo */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 relative transition-colors ${
                isLocked ? 'bg-red-600 border-red-950 animate-pulse' :
                error ? 'bg-red-600/20 border-red-500' : 'bg-blue-600/20 border-blue-500/50'
            }`}>
                <div className={`absolute inset-0 rounded-full border-2 border-t-transparent ${isAuthenticating ? 'animate-spin border-blue-400' : 'border-transparent'}`}></div>
                {isLocked ? (
                    <Ban className="w-8 h-8 text-white" />
                ) : error ? (
                    <ShieldAlert className="w-8 h-8 text-red-400 animate-pulse" />
                ) : (
                    <ShieldCheck className="w-8 h-8 text-blue-400" />
                )}
            </div>

            <div className="text-center">
                <h1 className={`text-3xl font-bold tracking-widest font-mono ${isLocked ? 'text-red-500' : 'text-white'}`}>
                    {isLocked ? 'LOCKDOWN' : 'ATLASGUARD'}
                </h1>
                <p className={`${isLocked ? 'text-red-400' : 'text-blue-400'} text-xs tracking-[0.3em] font-mono mt-2`}>
                    {isLocked ? 'THREAT PREVENTION ACTIVE' : 'NEURAL GOVERNANCE ENGINE'}
                </p>
            </div>

            <div className="w-full space-y-4 mt-4">
                <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-mono tracking-wider">Enterprise ID</label>
                <input 
                    type="text" 
                    value={credentials.id}
                    onChange={(e) => {
                        setCredentials(prev => ({ ...prev, id: e.target.value }));
                        setError(null);
                    }}
                    placeholder="e.g. ADMIN_01"
                    disabled={isAuthenticating || isLocked}
                    className={`w-full bg-slate-950/50 border rounded px-4 py-3 text-slate-300 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700 ${
                        isLocked ? 'border-red-900/50 cursor-not-allowed opacity-50' : 
                        error ? 'border-red-500/50' : 'border-slate-800'
                    }`}
                />
                </div>
                
                <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-mono tracking-wider">Access Key</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"}
                        value={credentials.key}
                        onChange={(e) => {
                            setCredentials(prev => ({ ...prev, key: e.target.value }));
                            setError(null);
                        }}
                        placeholder="••••••••"
                        disabled={isAuthenticating || isLocked}
                        className={`w-full bg-slate-950/50 border rounded px-4 py-3 text-slate-300 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700 pr-10 ${
                            isLocked ? 'border-red-900/50 cursor-not-allowed opacity-50' : 
                            error ? 'border-red-500/50' : 'border-slate-800'
                        }`}
                    />
                    {!isLocked && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors focus:outline-none"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    )}
                    {isLocked && <Key className="w-4 h-4 text-red-900 absolute right-3 top-1/2 -translate-y-1/2" />}
                </div>
                </div>
                
                {error && (
                    <div className={`p-3 border rounded flex items-center gap-2 animate-in slide-in-from-top-2 ${
                        isLocked ? 'bg-red-950/80 border-red-500 text-red-200 font-bold' : 'bg-red-950/30 border-red-900/50 text-red-400'
                    }`}>
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-mono">{error}</span>
                    </div>
                )}
                
                {!isLocked && attempts > 0 && (
                    <div className="text-center">
                        <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest">
                            Attempts Remaining: {MAX_ATTEMPTS - attempts}
                        </span>
                    </div>
                )}
            </div>

            <button 
                type="submit"
                disabled={isAuthenticating || !credentials.id || !credentials.key || isLocked}
                className={`w-full group relative overflow-hidden rounded-lg p-4 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLocked ? 'bg-slate-800 text-slate-500' :
                    error ? 'bg-red-900/50 hover:bg-red-900/70 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-400'
                }`}
            >
                <div className={`absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full ${!isLocked && 'group-hover:animate-[shimmer_1.5s_infinite]'}`}></div>
                <span className="flex items-center justify-center gap-2 font-bold tracking-widest text-sm text-white">
                {isAuthenticating ? (
                    <>
                    <Scan className="w-4 h-4 animate-pulse" /> VERIFYING CREDENTIALS...
                    </>
                ) : isLocked ? (
                    'SYSTEM LOCKED'
                ) : (
                    'AUTHENTICATE ACCESS'
                )}
                </span>
            </button>
            </form>
        </div>

        {/* ECOSYSTEM ANCHOR & DISCLAIMER */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 delay-500">
            <div className="flex items-center justify-center gap-6 text-[10px] text-blue-400/80 font-mono tracking-wider border border-blue-900/30 bg-blue-950/20 px-4 py-2 rounded-full">
                <span className="flex items-center gap-1.5"><Server className="w-3 h-3" /> Designed for Vertex AI</span>
                <div className="w-px h-3 bg-blue-800/50"></div>
                <span className="flex items-center gap-1.5"><Layers className="w-3 h-3" /> Model Cards Compatible</span>
            </div>
            
            <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                <span className="font-bold text-slate-400">DISCLAIMER:</span> AtlasGuard is a governance decision-support system, not a surveillance or data-harvesting tool.
            </p>
            
            <p className="text-sm font-bold text-white italic tracking-wide">
                "AtlasGuard doesn’t slow AI down. It makes safe AI move faster."
            </p>
        </div>

      </div>
    </div>
  );
};

export default LoginView;
