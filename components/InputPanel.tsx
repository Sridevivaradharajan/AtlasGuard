import React from 'react';
import { ProjectRequest } from '../types';
import { Play, Sparkles, FileWarning } from 'lucide-react';
import { DEMO_SCENARIO_HIGH_RISK, DEMO_SCENARIO_LOW_RISK } from '../constants';

interface InputPanelProps {
  request: ProjectRequest;
  setRequest: (req: ProjectRequest) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

const InputPanel: React.FC<InputPanelProps> = ({ request, setRequest, onAnalyze, isAnalyzing }) => {
  const handleChange = (field: keyof ProjectRequest, value: string) => {
    setRequest({ ...request, [field]: value });
  };

  const loadDemo = (scenario: ProjectRequest) => {
    setRequest(scenario);
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-white tracking-tight">New Project Request</h2>
        <p className="text-[10px] text-slate-400">Define parameters for AI Governance review.</p>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <div className="space-y-0.5">
          <label className="text-[10px] font-mono text-blue-400 uppercase">Project Codename</label>
          <input
            type="text"
            value={request.projectName}
            onChange={(e) => handleChange('projectName', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
            placeholder="e.g. Project Alpha"
            disabled={isAnalyzing}
          />
        </div>

        <div className="space-y-0.5">
          <label className="text-[10px] font-mono text-blue-400 uppercase">Model Architecture</label>
          <select
            value={request.modelType}
            onChange={(e) => handleChange('modelType', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none"
            disabled={isAnalyzing}
          >
            <option value="">Select Model</option>
            <option value="Gemini Flash">Gemini 1.5 Flash</option>
            <option value="Gemini Pro 1.5">Gemini 1.5 Pro</option>
            <option value="Open LLaMA">Open LLaMA 7B</option>
            <option value="Custom">Custom Fine-tune</option>
          </select>
        </div>

        <div className="space-y-0.5">
          <label className="text-[10px] font-mono text-blue-400 uppercase">Data Source</label>
          <textarea
            value={request.dataSource}
            onChange={(e) => handleChange('dataSource', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none h-16 resize-none placeholder:text-slate-700"
            placeholder="Describe the dataset..."
            disabled={isAnalyzing}
          />
        </div>

        <div className="space-y-0.5">
          <label className="text-[10px] font-mono text-blue-400 uppercase">Intended Use</label>
          <textarea
            value={request.intendedUse}
            onChange={(e) => handleChange('intendedUse', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none h-20 resize-none placeholder:text-slate-700"
            placeholder="Describe the application goal..."
            disabled={isAnalyzing}
          />
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-800 shrink-0">
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || !request.projectName}
          className={`w-full py-2 px-4 rounded font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isAnalyzing
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
          }`}
        >
          {isAnalyzing ? (
            <>Running Swarm...</>
          ) : (
            <><Play className="w-3 h-3" /> Initialize Analysis</>
          )}
        </button>
        
        <div className="grid grid-cols-2 gap-2">
            <button 
                onClick={() => loadDemo(DEMO_SCENARIO_HIGH_RISK)}
                className="text-[10px] text-amber-500 hover:text-amber-400 border border-amber-900/50 hover:bg-amber-900/20 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
            >
                <FileWarning className="w-3 h-3" /> Demo: High Risk
            </button>
            <button 
                onClick={() => loadDemo(DEMO_SCENARIO_LOW_RISK)}
                className="text-[10px] text-emerald-500 hover:text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/20 py-1.5 rounded transition-colors flex items-center justify-center gap-1"
            >
                <Sparkles className="w-3 h-3" /> Demo: Low Risk
            </button>
        </div>
      </div>
    </div>
  );
};

export default InputPanel;