export type NodeType =
  | 'thought'
  | 'question'
  | 'fact'
  | 'assumption'
  | 'criterion'
  | 'option';

export type NodeStatus = 'open' | 'checked' | 'resolved' | 'deferred';
export type EdgeType = 'supports' | 'contradicts' | 'related';
export type AIProfile = 'psychology' | 'business' | 'academic' | 'finance' | 'work';
export type BuildMode = 'manual' | 'semi' | 'auto';

export interface Garden {
  id: string;
  title: string;
  profile: AIProfile;
  originalText?: string;
  createdAt: number;
}

export interface ThoughtNode {
  id: string;
  gardenId: string;
  type: NodeType;
  label: string;
  status: NodeStatus;
  collapsed?: boolean;
  createdAt: number;
  x: number;
  y: number;
}

export interface ThoughtEdge {
  id: string;
  gardenId: string;
  source: string;
  target: string;
  type: EdgeType;
}

export type Provider = 'openai' | 'anthropic' | 'openrouter' | 'gemini' | 'gigachat';

export interface Settings {
  id: 'app-settings';
  provider: Provider;
  apiKey: string;
}

export type AgentMode = 'clarify' | 'assumptions' | 'critique' | 'options';

export interface AgentResponse {
  questions: string[];
  proposed_nodes: { type: NodeType; label: string; relation?: EdgeType }[];
  flags: { kind: string; text: string }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GraphInitialResponse {
  nodes: { id: string; label: string; type: NodeType }[];
  edges: { source: string; target: string; relation: EdgeType }[];
}

export interface GraphSuggestion {
  label: string;
  type: NodeType;
  connectToId: string;
  relation: EdgeType;
}

export interface GraphAnalysisResponse {
  suggestions: GraphSuggestion[];
}