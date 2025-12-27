import React from 'react';
import { Activity, ShieldCheck, Server, Eye } from 'lucide-react';
import { AGENTS } from '../constants';

const StatusWidget: React.FC = () => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'INGESTION_SWARM': return <Server className="w-4 h-4" />;
      case 'POLICY_SENTINEL': return <ShieldCheck className="w-4 h-4" />;
      case 'BIAS_DETECTOR': return <Eye className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 backdrop-blur-sm">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        System Status
      </h3>
      <div className="space-y-3">
        {AGENTS.map((agent) => (
          <div key={agent.name} className="flex items-center justify-between text-xs font-mono group">
            <div className="flex items-center gap-2 text-slate-300 group-hover:text-white transition-colors">
              <span className={`${agent.color}`}>
                {getIcon(agent.name)}
              </span>
              <span>{agent.name}</span>
            </div>
            <span className={`${agent.color} bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800`}>
              {agent.status}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-800">
        <div className="flex justify-between items-end">
          <span className="text-[10px] text-slate-500 font-mono">MEM_USAGE</span>
          <span className="text-xs font-mono text-blue-400">42.8 TB</span>
        </div>
        <div className="w-full bg-slate-800 h-1 mt-1 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 w-[42%]"></div>
        </div>
      </div>
    </div>
  );
};

export default StatusWidget;