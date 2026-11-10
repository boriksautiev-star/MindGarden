import { create } from 'zustand';
import { db } from './db';
import type { NodeType, NodeStatus, ThoughtNode, Settings, ThoughtEdge, Garden, EdgeType, AIProfile, GraphInitialResponse } from './types';

interface Store {
  gardens: Garden[];
  activeGardenId: string | null;
  nodes: ThoughtNode[];
  edges: ThoughtEdge[];
  settings: Settings | null;
  loaded: boolean;
  
  loadInitial: () => Promise<void>;
  selectGarden: (id: string) => Promise<void>;
  createGarden: (title: string, profile: AIProfile) => Promise<void>;
  goToGardens: () => void;
  deleteGarden: (id: string) => Promise<void>;
  updateGardenOriginalText: (id: string, text: string) => Promise<void>;
  
  addNode: (label: string, type?: NodeType, pos?: { x: number; y: number }) => Promise<ThoughtNode>;
  bulkAddFromAI: (data: GraphInitialResponse) => Promise<void>;
  updateNodeType: (id: string, type: NodeType) => Promise<void>;
  updateNodeStatus: (id: string, status: NodeStatus) => Promise<void>;
  updateNodeLabel: (id: string, label: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  updatePosition: (id: string, x: number, y: number) => Promise<void>;
  updateAllPositions: (positions: Record<string, { x: number; y: number }>) => Promise<void>;
  toggleNodeCollapse: (id: string) => Promise<void>;
  deduplicateNodes: () => Promise<void>;
  
  addEdge: (source: string, target: string, type?: EdgeType) => Promise<void>;
  deleteEdge: (id: string) => Promise<void>;
  
  saveSettings: (provider: string, apiKey: string) => Promise<void>;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
}

let counter = 0;
const uid = () => `n_${Date.now()}_${counter++}`;

export const useStore = create<Store>((set, get) => ({
  gardens: [], activeGardenId: null, nodes: [], edges: [], settings: null, loaded: false,

  loadInitial: async () => {
    const gardens = await db.gardens.toArray();
    let settings = await db.settings.get('app-settings');
    if (!settings) { settings = { id: 'app-settings', provider: 'gigachat', apiKey: '' }; await db.settings.put(settings); }
    set({ gardens, settings, loaded: true });
  },
  selectGarden: async (id) => {
    const nodes = await db.nodes.where('gardenId').equals(id).toArray();
    const edges = await db.edges.where('gardenId').equals(id).toArray();
    set({ activeGardenId: id, nodes, edges });
  },
  createGarden: async (title, profile) => {
    const newGarden: Garden = { id: `g_${Date.now()}`, title, profile, createdAt: Date.now() };
    await db.gardens.put(newGarden);
    set({ gardens: [...get().gardens, newGarden] });
  },
  goToGardens: () => set({ activeGardenId: null, nodes: [], edges: [] }),
  deleteGarden: async (id) => {
    await db.nodes.where('gardenId').equals(id).delete();
    await db.edges.where('gardenId').equals(id).delete();
    await db.gardens.delete(id);
    set({ gardens: get().gardens.filter(g => g.id !== id) });
  },
  updateGardenOriginalText: async (id, originalText) => {
    const garden = get().gardens.find(g => g.id === id);
    if (!garden) return;
    const updated = { ...garden, originalText };
    await db.gardens.put(updated);
    set({ gardens: get().gardens.map(g => g.id === id ? updated : g) });
  },

  addNode: async (label, type = 'thought', pos) => {
    const gardenId = get().activeGardenId;
    if (!gardenId) throw new Error('Нет сада');
    const existing = get().nodes.find(n => n.gardenId === gardenId && n.label === label);
    if (existing) return existing;

    const node: ThoughtNode = { id: uid(), gardenId, type, label, status: 'open', createdAt: Date.now(), x: pos?.x ?? Math.random()*200, y: pos?.y ?? Math.random()*200 };
    await db.nodes.put(node);
    set({ nodes: [...get().nodes, node] });
    return node;
  },

  bulkAddFromAI: async (data) => {
    const gardenId = get().activeGardenId;
    if (!gardenId) return;
    const idMap: Record<string, string> = {};
    const newNodes: ThoughtNode[] = [];
    const newEdges: ThoughtEdge[] = [];

    data.nodes.forEach((n, i) => {
      if (get().nodes.some(existing => existing.label === n.label && existing.gardenId === gardenId)) return;

      const realId = uid();
      idMap[n.id || `n${i}`] = realId;
      newNodes.push({ id: realId, gardenId, type: n.type, label: n.label, status: 'open', createdAt: Date.now(), x: 300 + (Math.random() * 200 - 100), y: 100 + i * 150 });
    });

    data.edges.forEach(e => {
      // ИСПРАВЛЕНИЕ: Если источник связи — это уже существующий узел (не из списка новых),
      // мы берем его реальный ID. Иначе мапим через idMap.
      const source = idMap[e.source] || e.source;
      const target = idMap[e.target] || e.target;

      if (source && target && source !== target) {
        // Проверяем, нет ли уже такой связи
        if (!get().edges.some(existing => existing.source === source && existing.target === target)) {
          newEdges.push({ id: `e_${source}_${target}`, gardenId, source, target, type: e.relation });
        }
      }
    });

    if (newNodes.length > 0) await db.nodes.bulkPut(newNodes);
    if (newEdges.length > 0) await db.edges.bulkPut(newEdges);
    set({ nodes: [...get().nodes, ...newNodes], edges: [...get().edges, ...newEdges] });
  },

  updateNodeType: async (id, type) => {
    const node = get().nodes.find(n => n.id === id); if (!node) return;
    await db.nodes.put({ ...node, type });
    set({ nodes: get().nodes.map(n => n.id === id ? { ...node, type } : n) });
  },

  updateNodeStatus: async (id, status) => {
    const { nodes, edges } = get();
    const updatedNodes = new Map<string, ThoughtNode>();

    const applyStatus = (nodeId: string, newStatus: NodeStatus) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node) updatedNodes.set(nodeId, { ...node, status: newStatus });
    };

    applyStatus(id, status);

    if (status === 'resolved') {
      let currentId: string | null = id;
      while (currentId) {
        const parentEdges = edges.filter(e => e.target === currentId);
        let nextParentId: string | null = null;

        for (const pe of parentEdges) {
          const parentId = pe.source;
          const childEdges = edges.filter(e => e.source === parentId);
          let allChildrenResolved = true;

          for (const ce of childEdges) {
            const childNode = updatedNodes.get(ce.target) || nodes.find(n => n.id === ce.target);
            if (childNode && childNode.status !== 'resolved') { allChildrenResolved = false; break; }
          }

          if (allChildrenResolved) {
            applyStatus(parentId, 'resolved');
            nextParentId = parentId;
          }
        }
        currentId = nextParentId;
      }
    } else {
      let currentId: string | null = id;
      while (currentId) {
        const parentEdges = edges.filter(e => e.target === currentId);
        let nextParentId: string | null = null;

        for (const pe of parentEdges) {
          const parentId = pe.source;
          const parentNode = updatedNodes.get(parentId) || nodes.find(n => n.id === parentId);
          if (parentNode && parentNode.status === 'resolved') {
            applyStatus(parentId, 'open');
            nextParentId = parentId;
          }
        }
        currentId = nextParentId;
      }
    }

    const nodesToUpdate = Array.from(updatedNodes.values());
    if (nodesToUpdate.length > 0) {
      await db.nodes.bulkPut(nodesToUpdate);
      set({ nodes: nodes.map(n => updatedNodes.get(n.id) || n) });
    }
  },

  updateNodeLabel: async (id, label) => {
    const node = get().nodes.find(n => n.id === id); if (!node) return;
    await db.nodes.put({ ...node, label });
    set({ nodes: get().nodes.map(n => n.id === id ? { ...node, label } : n) });
  },
  
  deleteNode: async (id) => {
    await db.nodes.delete(id);
    const edgesToDelete = get().edges.filter(e => e.source === id || e.target === id);
    for (const edge of edgesToDelete) await db.edges.delete(edge.id);
    set({ nodes: get().nodes.filter(n => n.id !== id), edges: get().edges.filter(e => e.source !== id && e.target !== id) });
  },
  
  updatePosition: async (id, x, y) => {
    const node = get().nodes.find(n => n.id === id); if (!node) return;
    await db.nodes.put({ ...node, x, y });
    set({ nodes: get().nodes.map(n => n.id === id ? { ...node, x, y } : n) });
  },
  
  updateAllPositions: async (positions) => {
    const updatedNodes = get().nodes.map(node => positions[node.id] ? { ...node, ...positions[node.id] } : node);
    await db.nodes.bulkPut(updatedNodes);
    set({ nodes: updatedNodes });
  },

  toggleNodeCollapse: async (id) => {
    const node = get().nodes.find(n => n.id === id); if (!node) return;
    const updated = { ...node, collapsed: !node.collapsed };
    await db.nodes.put(updated);
    set({ nodes: get().nodes.map(n => n.id === id ? updated : n) });
  },

  deduplicateNodes: async () => {
    const gardenId = get().activeGardenId;
    if (!gardenId) return;

    const currentNodes = get().nodes;
    const currentEdges = get().edges;

    const groups: Record<string, ThoughtNode[]> = {};
    currentNodes.forEach(n => {
      const key = n.label.trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });

    const nodesToDelete = new Set<string>();
    const edgesToUpdate: ThoughtEdge[] = [];
    const idMap: Record<string, string> = {};

    Object.values(groups).forEach(group => {
      if (group.length > 1) {
        const primary = group[0];
        for (let i = 1; i < group.length; i++) {
          const duplicate = group[i];
          nodesToDelete.add(duplicate.id);
          idMap[duplicate.id] = primary.id;
        }
      }
    });

    if (nodesToDelete.size === 0) return;

    currentEdges.forEach(edge => {
      let source = edge.source;
      let target = edge.target;
      let changed = false;

      if (idMap[source]) { source = idMap[source]; changed = true; }
      if (idMap[target]) { target = idMap[target]; changed = true; }

      if (source === target) {
      } else if (changed) {
        edgesToUpdate.push({ ...edge, source, target, id: `e_${source}_${target}` });
        db.edges.delete(edge.id);
      }
    });

    for (const id of nodesToDelete) await db.nodes.delete(id);

    const uniqueEdges = new Set<string>();
    for (const edge of edgesToUpdate) {
      if (!uniqueEdges.has(edge.id) && edge.source !== edge.target) {
        uniqueEdges.add(edge.id);
        await db.edges.put(edge);
      }
    }

    set({
      nodes: currentNodes.filter(n => !nodesToDelete.has(n.id)),
      edges: get().edges.filter(e => !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target)).concat(edgesToUpdate).filter((e, i, self) => self.findIndex(t => t.id === e.id) === i && e.source !== e.target)
    });
  },

  addEdge: async (source, target, type = 'related') => {
    const gardenId = get().activeGardenId; if (!gardenId) return;
    if (get().edges.some(e => e.source === source && e.target === target)) return;
    
    const edge: ThoughtEdge = { id: `e_${source}_${target}`, gardenId, source, target, type };
    await db.edges.put(edge); set({ edges: [...get().edges, edge] });
  },
  deleteEdge: async (id) => { await db.edges.delete(id); set({ edges: get().edges.filter(e => e.id !== id) }); },
  saveSettings: async (provider, apiKey) => {
    const settings: Settings = { id: 'app-settings', provider: provider as any, apiKey };
    await db.settings.put(settings); set({ settings });
  },
  exportData: async () => {
    return JSON.stringify({ gardens: await db.gardens.toArray(), nodes: await db.nodes.toArray(), edges: await db.edges.toArray(), settings: await db.settings.toArray() }, null, 2);
  },
  importData: async (json) => {
    const data = JSON.parse(json);
    await db.transaction('rw', db.gardens, db.nodes, db.edges, db.settings, async () => {
      await db.gardens.clear(); await db.nodes.clear(); await db.edges.clear(); await db.settings.clear();
      await db.gardens.bulkPut(data.gardens); await db.nodes.bulkPut(data.nodes); await db.edges.bulkPut(data.edges);
      if (data.settings) await db.settings.bulkPut(data.settings);
    });
    set({ gardens: await db.gardens.toArray(), settings: await db.settings.get('app-settings'), activeGardenId: null, nodes: [], edges: [] });
  },
}));