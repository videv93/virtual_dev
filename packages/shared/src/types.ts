// User Types
export interface User {
  id: string;
  username: string;
  color: string;
  position: Position;
  isNPC?: boolean;
}

export interface Position {
  x: number;
  y: number;
}

// Chat Types
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  position?: Position;
}

// NPC Types
export interface NPCConfig {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  position: Position;
  iconUrl?: string;
}

export interface NPCConversation {
  id: string;
  npcId: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// WebSocket Event Types
export enum SocketEvents {
  // Connection
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',

  // User Events
  JOIN = 'join',
  LEAVE = 'leave',
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left',

  // Movement Events
  MOVE = 'move',
  POSITION_UPDATE = 'position:update',

  // Proximity Events
  PROXIMITY_ENTER = 'proximity:enter',
  PROXIMITY_EXIT = 'proximity:exit',

  // Error Events
  ERROR = 'error',
}

// Socket Event Payloads
export interface JoinPayload {
  username?: string;
  sessionId?: string;
}

export interface JoinResponse {
  user: User;
  users: User[];
  npcs: NPCConfig[];
}

export interface MovePayload {
  position: Position;
}

export interface PositionUpdatePayload {
  userId: string;
  position: Position;
}

export interface ProximityPayload {
  userId: string;
  targetId: string;
  distance: number;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

// API Types
export interface NPCChatRequest {
  npcId: string;
  message: string;
  conversationId?: string;
}

export interface NPCChatResponse {
  conversationId: string;
  message: string;
  npcName: string;
}

// Supabase Types
export interface SupabaseChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  position_x: number;
  position_y: number;
  created_at: string;
}

export interface SupabaseNPCConfig {
  id: string;
  name: string;
  role: string;
  system_prompt: string;
  position_x: number;
  position_y: number;
  icon_url?: string;
  created_at: string;
}

export interface SupabaseNPCConversation {
  id: string;
  npc_id: string;
  user_id: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

// Toast Notification Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // in milliseconds, default 3000
}

// Constants
export const MAP_WIDTH = 800;
export const MAP_HEIGHT = 600;
export const PROXIMITY_RADIUS = 150;
export const MOVEMENT_SPEED = 200;
export const POSITION_UPDATE_RATE = 10; // updates per second
export const TOAST_DEFAULT_DURATION = 3000; // 3 seconds
