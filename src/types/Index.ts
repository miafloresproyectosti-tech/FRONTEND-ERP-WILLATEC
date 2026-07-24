export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed';

export type TicketPriority =
  | 'low'
  | 'medium'
  | 'high';

export type TicketType =
  | 'hardware'
  | 'software'
  | 'network';

export interface TicketComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  date: string;
  clientName: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  technician: string;
  description: string;
  comments: TicketComment[];
}