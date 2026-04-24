import { StudyProgress } from './study-progress';
import { AgentType } from './agent-type';

export type ChatState =
  | 'idle'
  | 'awaiting_confirm'
  | 'awaiting_crossrc'
  | 'awaiting_filtered_confirm'
  | 'awaiting_multi_confirm'
  | 'sending'
  | 'study_picker_open'
  | 'schedule_picker_open';

export type MessageSender = 'user' | 'bot';

export interface MessageAction {
  label: string;
  type: 'primary' | 'secondary' | 'danger' | 'success';
  action: string;
  payload?: any;
}

export interface StudyNote {
  studyId: string;
  studyName: string;
  title: string;     // editable: defaults to "April 24, 2026"
  content: string;   // editable textarea with the summary lines
  posted: boolean;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  html: string;
  timestamp: Date;
  actions?: MessageAction[];
  isTyping?: boolean;
  sendingProgress?: SendingProgress | null;
  studyProgress?: StudyProgress | null;
  agent?: AgentType;
  studyNotes?: StudyNote[];
}

export interface SendingProgress {
  sent: number;       // local progress tracker
  emailsSent?: number; // from backend API response
  total: number;
  elapsedSeconds: number;
  isComplete: boolean;
  durationStr?: string;
  studyName?: string;
  queuePosition?: number;
  queueTotal?: number;
}

export interface SendQueueItem {
  studyId: string;
  count: number;
  studyName: string;
}
