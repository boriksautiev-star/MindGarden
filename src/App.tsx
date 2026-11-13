import { useEffect, useState, useCallback, useMemo } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, addEdge, type Node as RFNode, type Edge as RFEdge, type Connection } from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import { useStore } from './store';
import { SettingsModal } from './components/SettingsModal';
import { AgentPanel } from './components/AgentPanel';
import { NodeInspector } from './components/NodeInspector';
import { ThoughtNode } from './components/ThoughtNode';
import { ThoughtEdge } from './components/ThoughtEdge';
import { GardensList } from './components/GardensList';
import { GraphAnalyzerPanel } from './components/GraphAnalyzerPanel';
import { OriginalTextModal } from './components/OriginalTextModal';
import { ActionPlanModal } from './components/ActionPlanModal';
import { AutoLinkModal } from './components/AutoLinkModal';
import { DebateModal } from './components/DebateModal';
import { generateInitialTree, expandNode } from './ai';
import type { BuildMode } from './types';

const nodeTypes = { custom: ThoughtNode };
const edgeTypes = { custom: ThoughtEdge };

export default function App() {
  const { 
    activeGardenId, gardens, nodes, edges, settings, loaded, 
    loadInitial, goToGardens, addNode, bulkAddFromAI, updateGardenOriginalText, updatePosition, updateAllPositions, addEdge: storeAddEdge, deleteEdge, deduplicateNodes
  } = useStore();
  
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  
  const [brainDump, setBrainDump] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [buildMode, setBuildMode] = useState<BuildMode>('semi');
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [agentContext, setAgentContext] = useState<{ text: string, sourceId: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGraphAnalyzer, setShowGraphAnalyzer] = useState(false);
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [showActionPlan, setShowActionPlan] = useState(false);
  const [showAutoLink, setShowAutoLink] = useState(false);
  const [debateNodeId, setDebateNodeId] = useState<string | null>(null);
  
  // Стейт для мобильного меню
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  const hiddenNodeIds = useMemo(() => {
    const hidden = new Set<string>();
    const collapsed = new Set(nodes.filter(n => n.collapsed).map(n => n.id));
    const queue = Array.from(collapsed);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const childrenEdges = edges.filter(e => e.source === current);
      childrenEdges.forEach(e => {
        if (!hidden.has(e.target)) { hidden.add(e.target); queue.push(e.target); }
      });
    }
    return hidden;
  }, [nodes, edges]);

  const visibleNodes = useMemo(() => nodes.filter(n => !hiddenNodeIds.has(n.id)), [nodes, hiddenNodeIds]);
  const visibleEdges = useMemo(() => edges.filter(e => !hiddenNodeIds.has(e.source) && !hiddenNodeIds.has(e.target)), [edges, hiddenNodeIds]);

  const rootNodeIds = useMemo(() => {
    const targets = new Set(visibleEdges.map(e => e.target));
    return new Set(visibleNodes.filter(n => !targets.has(n.id)).map(n => n.id));
  }, [visibleNodes, visibleEdges]);

  const { pathNodes, pathEdges } = useMemo(() => {
    if (!selectedNodeId) return { pathNodes: new Set<string>(), pathEdges: new Set<string>() };
    const visitedNodes = new Set<string>([selectedNodeId]);
    const visitedEdges = new Set<string>();
    const queue: string[] = [selectedNodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const incomingEdges = visibleEdges.filter(e => e.target === current);
      incomingEdges.forEach(edge => {
        visitedEdges.add(edge.id);
        if (!visitedNodes.has(edge.source)) { visitedNodes.add(edge.source); queue.push(edge.source); }
      });
    }
    return { pathNodes: visitedNodes, pathEdges: visitedEdges };
  }, [selectedNodeId, visibleEdges]);

  const handleLayout = useCallback(() => {
    const currentNodes = useStore.getState().nodes;
    const currentEdges = useStore.getState().edges;
    if (currentNodes.length === 0) return;
    
    try {
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      // Уменьшили отступы для более компактного графа
      dagreGraph.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 }); 
      
      currentNodes.forEach((node) => dagreGraph.setNode(node.id, { width: 200, height: 80 }));
      currentEdges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
      
      dagre.layout(dagreGraph);
      
      const newPositions: Record<string, { x: number; y: number }> = {};
      currentNodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        newPositions[node.id] = { x: nodeWithPosition.x - 100, y: nodeWithPosition.y - 40 };
      });
      
      updateAllPositions(newPositions);
    } catch (e: any) { console.error(e); }
  }, [updateAllPositions]);

  const handleAddChild = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (buildMode === 'manual') {
      const label = window.prompt("Введите текст дочерней мысли:");
      if (label && label.trim()) {
        const newNode = await addNode(label.trim(), 'thought', { x: node.x + 50, y: node.y + 150 });
        await storeAddEdge(nodeId, newNode.id, 'related');
        setTimeout(handleLayout, 100);
      }
    } else if (buildMode === 'semi') {
      setAgentContext({ text: node.label, sourceId: node.id });
    } else if (buildMode === 'auto') {
      setIsGenerating(true);
      const activeGarden = gardens.find(g => g.id === activeGardenId);
      const res = await expandNode(node.label, settings, activeGarden?.profile || 'psychology', buildMode);
      setIsGenerating(false);
      
      if ('error' in res) {
        alert(res.error);
      } else {
        const mapped = { ...res, edges: res.edges.map(e => ({ ...e, source: node.id })) };
        await bulkAddFromAI(mapped);
        setTimeout(handleLayout, 200);
      }
    }
  }, [nodes, buildMode, gardens, activeGardenId, settings, addNode, storeAddEdge, bulkAddFromAI, handleLayout]);

  useEffect(() => { 
    setRfNodes(visibleNodes.map(n => {
      const isDimmed = selectedNodeId !== null && !pathNodes.has(n.id);
      const hasChildren = edges.some(e => e.source === n.id);
      return { 
        id: n.id, type: 'custom', position: { x: n.x, y: n.y }, 
        data: { 
          label: n.label, type: n.type, status: n.status, 
          isRoot: rootNodeIds.has(n.id),
          hasChildren,
          isCollapsed: n.collapsed,
          nodeId: n.id,
          onAddChild: handleAddChild,
          isSelected: selectedNodeId === n.id
        },
        style: { opacity: isDimmed ? 0.15 : 1, transition: 'opacity 0.2s ease' } 
      };
    })); 
  }, [visibleNodes, selectedNodeId, pathNodes, rootNodeIds, edges, setRfNodes, handleAddChild]);
  
  useEffect(() => {
    setRfEdges(visibleEdges.map(e => {
      const isContradicts = e.type === 'contradicts'; const isSupports = e.type === 'supports';
      const isDimmed = selectedNodeId !== null && !pathEdges.has(e.id);
      return { 
        id: e.id, type: 'custom', source: e.source, target: e.target, animated: e.type === 'related' && !isDimmed,
        style: { stroke: isContradicts ? '#ef4444' : isSupports ? '#10b981' : '#9ca3af', strokeWidth: 2, strokeDasharray: e.type === 'related' ? '5,5' : 'none', opacity: isDimmed ? 0.1 : 1, transition: 'opacity 0.2s ease' } 
      };
    }));
  }, [visibleEdges, selectedNodeId, pathEdges, setRfEdges]);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      setRfEdges((eds) => addEdge({ ...params, type: 'custom', animated: true, style: { stroke: '#9ca3af', strokeDasharray: '5,5' } }, eds));
      storeAddEdge(params.source, params.target, 'related');
    }
  }, [setRfEdges, storeAddEdge]);

  const onEdgesDelete = useCallback((deletedEdges: RFEdge[]) => { deletedEdges.forEach(edge => deleteEdge(edge.id)); }, [deleteEdge]);

  const submitBrainDump = async () => {
    if (!brainDump.trim() || !activeGardenId) return;
    setIsGenerating(true); setGenerationError(null);
    await updateGardenOriginalText(activeGardenId, brainDump);

    if (buildMode === 'manual') {
      await addNode(brainDump, 'thought', { x: 0, y: 0 });
      setBrainDump(''); setIsGenerating(false); return;
    }

    const activeGarden = gardens.find(g => g.id === activeGardenId);
    try {
      const res = await generateInitialTree(brainDump, settings, activeGarden?.profile || 'psychology', buildMode);
      if ('error' in res) { setGenerationError(res.error); setIsGenerating(false); return; }
      if (!res.nodes || !Array.isArray(res.nodes) || res.nodes.length === 0) { setGenerationError('ИИ вернул пустой список.'); setIsGenerating(false); return; }
      await bulkAddFromAI(res);
      setBrainDump(''); setTimeout(handleLayout, 300);
    } catch (err: any) { setGenerationError(err.message || 'Ошибка'); } finally { setIsGenerating(false); }
  };

  const activeGarden = gardens.find(g => g.id === activeGardenId);
  const currentProfile = activeGarden?.profile || 'psychology';

  if (!loaded) return <div style={{ padding: 24 }}>Загрузка…</div>;
  if (!activeGardenId) return <><GardensList onOpenSettings={() => setShowSettings(true)} />{showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}</>;

  if (nodes.length === 0) {
    return (
      <div className="scrollable-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          <button onClick={goToGardens} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', marginBottom: 16 }}>← К садам</button>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>Вывали всё, что в голове</h1>
          <p style={{ color: '#888', marginBottom: 16 }}>Не думай о структуре. Просто напиши всё подряд. Нейросеть сама разложит это по полочкам.</p>
          
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setBuildMode('manual')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: buildMode === 'manual' ? '2px solid #111' : '1px solid #ddd', background: buildMode === 'manual' ? '#f9f9f9' : '#fff', cursor: 'pointer', fontWeight: buildMode === 'manual' ? 'bold' : 'normal' }}>🖐 Ручной</button>
            <button onClick={() => setBuildMode('semi')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: buildMode === 'semi' ? '2px solid #111' : '1px solid #ddd', background: buildMode === 'semi' ? '#f9f9f9' : '#fff', cursor: 'pointer', fontWeight: buildMode === 'semi' ? 'bold' : 'normal' }}>🤝 Полуавтомат</button>
            <button onClick={() => setBuildMode('auto')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: buildMode === 'auto' ? '2px solid #111' : '1px solid #ddd', background: buildMode === 'auto' ? '#f9f9f9' : '#fff', cursor: 'pointer', fontWeight: buildMode === 'auto' ? 'bold' : 'normal' }}>🚀 Автомат</button>
          </div>

          <textarea
            value={brainDump} onChange={(e) => setBrainDump(e.target.value)}
            placeholder="Например: Я выгорел на работе. Начальник постоянно давит..."
            style={{ width: '100%', minHeight: 160, padding: 12, fontSize: 16, borderRadius: 12, border: '1px solid #ddd', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
          />
          
          {generationError && <div style={{ padding: 12, background: '#fee', color: '#c00', borderRadius: 8, marginTop: 12, fontSize: 14 }}>{generationError}</div>}

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button onClick={submitBrainDump} disabled={isGenerating || !brainDump.trim()} style={{ padding: '12px 20px', fontSize: 16, borderRadius: 12, border: 0, background: isGenerating ? '#ccc' : '#111', color: '#fff', cursor: isGenerating ? 'default' : 'pointer', flex: 1, fontWeight: 600 }}>
              {isGenerating ? 'Строим дерево...' : (buildMode === 'manual' ? 'Добавить мысль' : '✨ Построить дерево')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100dvh', position: 'relative' }}>
      <ReactFlow 
        nodes={rfNodes} edges={rfEdges} 
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onEdgesDelete={onEdgesDelete} 
        onNodeDragStop={(_, node) => updatePosition(node.id, node.position.x, node.position.y)} 
        onNodeClick={(_, node) => { setSelectedNodeId(node.id); setAgentContext(null); setShowGraphAnalyzer(false); setShowActionPlan(false); setShowAutoLink(false); setShowMobileMenu(false); }} 
        onEdgeClick={() => { setSelectedNodeId(null); setAgentContext(null); }} 
        onPaneClick={() => { setSelectedNodeId(null); setAgentContext(null); setShowGraphAnalyzer(false); setShowActionPlan(false); setShowAutoLink(false); setShowMobileMenu(false); }} 
        nodeTypes={nodeTypes} edgeTypes={edgeTypes} elevateEdgesOnSelect={true} 
        fitView 
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.05}
      >
        <Background />
        <Controls />
      </ReactFlow>

      <div className="top-bar">
        {/* Эти кнопки видны всегда */}
        <button className="top-btn mobile-show" onClick={goToGardens}>← К садам</button>
        <button className="top-btn mobile-show" onClick={() => setShowSettings(true)}>⚙️</button>
        
        <select 
          value={buildMode} 
          onChange={(e) => setBuildMode(e.target.value as BuildMode)}
          className="mobile-show"
          style={{ padding: '8px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer', outline: 'none' }}
        >
          <option value="manual">🖐 Ручной</option>
          <option value="semi">🤝 Полуавтомат</option>
          <option value="auto">🚀 Автомат</option>
        </select>

        {/* Кнопка мобильного меню */}
        <button className="top-btn mobile-show" onClick={() => setShowMobileMenu(!showMobileMenu)}>⋮ Меню</button>

        {/* Остальные кнопки скрыты на мобилках, но видны на ПК */}
        <button className="top-btn" onClick={() => setShowOriginalText(true)}>📄 Исходник</button>
        <button className="top-btn" onClick={() => { deduplicateNodes(); setTimeout(handleLayout, 100); }} style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fca5a5' }}>🧹 Очистить</button>
        <button className="top-btn" onClick={handleLayout} style={{ background: '#ecfdf5', color: '#064e3b', borderColor: '#34d399' }}>🌿 Упорядочить</button>
        <button className="top-btn" onClick={() => { setShowGraphAnalyzer(true); setSelectedNodeId(null); setAgentContext(null); setShowActionPlan(false); setShowAutoLink(false); }} style={{ background: '#f5f3ff', color: '#4c1d95', borderColor: '#a78bfa' }}>✨ Анализ</button>
        <button className="top-btn" onClick={() => { setShowActionPlan(true); setSelectedNodeId(null); setAgentContext(null); setShowGraphAnalyzer(false); setShowAutoLink(false); }} style={{ background: '#fffbeb', color: '#b45309', borderColor: '#fcd34d' }}>🌾 Урожай</button>
        <button className="top-btn" onClick={() => { setShowAutoLink(true); setSelectedNodeId(null); setAgentContext(null); setShowGraphAnalyzer(false); setShowActionPlan(false); }} style={{ background: '#f0f9ff', color: '#0369a1', borderColor: '#7dd3fc' }}>🔗 Связи</button>
        
        {/* Главная кнопка видна всегда */}
        <button className="top-btn primary mobile-show" onClick={() => { if(selectedNodeId) handleAddChild(selectedNodeId); else alert('Сначала выбери узел на графе'); }} disabled={isGenerating}>
          {isGenerating ? '...' : '+ Узел'}
        </button>
      </div>

      {/* Мобильное меню (Сетка) */}
      {showMobileMenu && (
        <div className="mobile-menu-overlay">
          <button className="mobile-menu-btn" onClick={() => { setShowOriginalText(true); setShowMobileMenu(false); }}>📄 Исходник</button>
          <button className="mobile-menu-btn" onClick={() => { deduplicateNodes(); setTimeout(handleLayout, 100); setShowMobileMenu(false); }}>🧹 Очистить</button>
          <button className="mobile-menu-btn" onClick={() => { handleLayout(); setShowMobileMenu(false); }}>🌿 Упорядочить</button>
          <button className="mobile-menu-btn" onClick={() => { setShowGraphAnalyzer(true); setSelectedNodeId(null); setShowMobileMenu(false); }}>✨ Анализ</button>
          <button className="mobile-menu-btn" onClick={() => { setShowActionPlan(true); setSelectedNodeId(null); setShowMobileMenu(false); }}>🌾 Урожай</button>
          <button className="mobile-menu-btn" onClick={() => { setShowAutoLink(true); setSelectedNodeId(null); setShowMobileMenu(false); }}>🔗 Связи</button>
        </div>
      )}

      {selectedNodeId && !agentContext && (
        <NodeInspector 
          nodeId={selectedNodeId} 
          profile={currentProfile}
          onClose={() => setSelectedNodeId(null)} 
          onAskAgent={() => { 
            const node = nodes.find(n => n.id === selectedNodeId); 
            if (node) setAgentContext({ text: node.label, sourceId: node.id }); 
          }} 
          onDebate={() => {
            const node = nodes.find(n => n.id === selectedNodeId);
            if (node) setDebateNodeId(node.id);
          }}
        />
      )}
      
      {agentContext && <AgentPanel initialText={agentContext.text} sourceNodeId={agentContext.sourceId} profile={currentProfile} onClose={() => setAgentContext(null)} />}
      {showGraphAnalyzer && <GraphAnalyzerPanel profile={currentProfile} onClose={() => setShowGraphAnalyzer(false)} />}
      {showOriginalText && <OriginalTextModal onClose={() => setShowOriginalText(false)} />}
      {showActionPlan && <ActionPlanModal profile={currentProfile} onClose={() => setShowActionPlan(false)} />}
      {showAutoLink && <AutoLinkModal onClose={() => setShowAutoLink(false)} />}
      {debateNodeId && <DebateModal nodeId={debateNodeId} nodeLabel={nodes.find(n => n.id === debateNodeId)?.label || ''} profile={currentProfile} onClose={() => setDebateNodeId(null)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}