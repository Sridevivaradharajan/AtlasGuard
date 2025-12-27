
import React, { useMemo, memo } from 'react';
import { AnalysisState, IngestionMode } from '../types';

interface NeuralMeshProps {
  state: AnalysisState;
  dataSignature?: number; 
  mode: IngestionMode;
}

const NeuralMesh: React.FC<NeuralMeshProps> = ({ state, dataSignature = 0, mode }) => {
  const isActive = state === AnalysisState.SEMANTIC_ANALYSIS || state === AnalysisState.RISK_DETECTED || state === AnalysisState.RED_TEAM_SIMULATION;
  const isRisk = state === AnalysisState.RISK_DETECTED;
  const isSafe = state === AnalysisState.SAFE;
  const isSignaling = state === AnalysisState.SEMANTIC_ANALYSIS;
  const isRedTeam = state === AnalysisState.RED_TEAM_SIMULATION;

  // Pseudo-random number generator
  const pseudoRandom = (input: number) => {
    const x = Math.sin(input) * 10000;
    return x - Math.floor(x);
  };

  const { nodes, links, activeLinks } = useMemo(() => {
    // Mode Logic maintained but visuals updated for v9.0 colors
    const rows = 4;
    const cols = 6;
    const startX = 150;
    const startY = 100;
    const gapX = 100;
    const gapY = 60;

    const gridNodes = [];
    const gridLinks = [];

    // Jitter function
    // Red Team mode has massive jitter for "glitch" effect
    const getJitter = (idx: number) => (pseudoRandom(dataSignature + idx) - 0.5) * (isRedTeam ? 100 : isRisk ? 60 : 20);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            gridNodes.push({
                id: r * cols + c,
                x: startX + c * gapX + getJitter(r * cols + c),
                y: startY + r * gapY + getJitter(r + c * 10),
            });
        }
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const current = r * cols + c;
            if (c < cols - 1) gridLinks.push([current, current + 1]);
            if (r < rows - 1) gridLinks.push([current, current + cols]);
        }
    }
    
    // More active links in Red Team mode
    const active = gridLinks.filter((_, i) => pseudoRandom(dataSignature + i) > (isRedTeam ? 0.4 : 0.7)).slice(0, isRedTeam ? 30 : 15);
    return { nodes: gridNodes, links: gridLinks, activeLinks: active };

  }, [dataSignature, isRisk, isRedTeam]);

  // Color Logic: v9.0 Philosophy
  const getStrokeColor = () => {
      if (isRedTeam) return "#f97316"; // Orange/Red (Attack Mode)
      if (isRisk) return "#ef4444"; // Red (Critical Risk)
      if (isSafe) return "#10b981"; // Green (Safe)
      if (isSignaling) return "#eab308"; // Yellow (Uncertainty/Signaling)
      return "#3b82f6"; // Blue (Idle)
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, ${getStrokeColor()} 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }}></div>

      <svg className="w-full h-full max-w-[800px] max-h-[400px] relative z-10" viewBox="0 0 800 400">
        
        {/* Static Links */}
        <g stroke="#1e293b" strokeWidth="1" strokeOpacity="0.3">
          {links.map(([startId, endId], i) => {
            const start = nodes[startId];
            const end = nodes[endId];
            return <line key={`static-${i}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
          })}
        </g>

        {/* Active Links */}
        <g stroke={getStrokeColor()} strokeWidth={isRedTeam ? "2" : "1.5"} strokeOpacity="0.8">
          {activeLinks.map(([startId, endId], i) => {
            const start = nodes[startId];
            const end = nodes[endId];
            return <line key={`active-${i}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
          })}
        </g>

        {/* Particles */}
        {isActive && activeLinks.map(([startId, endId], i) => {
             const start = nodes[startId];
             const end = nodes[endId];
             // Much faster particles in Red Team mode
             const speed = (0.5 + Math.abs(pseudoRandom(dataSignature + i)) * 1.5) / (isRedTeam ? 3 : 1); 
             return (
               <circle key={`p-${i}`} r={isRedTeam ? "4" : "3"} fill={getStrokeColor()}>
                 <animateMotion 
                   dur={`${speed}s`}
                   repeatCount="indefinite"
                   path={`M${start.x},${start.y} L${end.x},${end.y}`}
                 />
               </circle>
             );
        })}

        {/* Nodes */}
        {nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x},${node.y})`}>
              <rect x="-3" y="-3" width="6" height="6" fill={getStrokeColor()} opacity="0.8" />
          </g>
        ))}
      </svg>
      
      {state === AnalysisState.SEMANTIC_ANALYSIS && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-yellow-500 font-mono text-[10px] animate-pulse tracking-[0.2em] bg-black/80 px-4 py-1 rounded border border-yellow-900/50 whitespace-nowrap">
          ACQUIRING_HEURISTIC_SIGNALS...
        </div>
      )}

      {state === AnalysisState.RED_TEAM_SIMULATION && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-red-500 font-mono text-[10px] animate-pulse-fast tracking-[0.2em] bg-black/80 px-4 py-1 rounded border border-red-900/50 whitespace-nowrap flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
          RED_TEAM_ATTACK_VECTOR::ACTIVE
        </div>
      )}
    </div>
  );
};

export default memo(NeuralMesh);
