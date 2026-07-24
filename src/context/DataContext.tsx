import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Ticket } from '../types/Index';

interface DataContextType {
  tickets: Ticket[];
  addTicket: (ticket: Ticket) => void;
  updateTicket: (id: string, updatedTicket: Partial<Ticket>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialTickets: Ticket[] = [
  {
    id: 'TK-1001',
    date: new Date().toISOString(),
    clientName: 'Área Comercial',
    type: 'software',
    priority: 'high',
    status: 'open',
    technician: 'Daniel',
    description: 'Error en sistema ERP',
    comments: [],
  },
  {
    id: 'TK-1002',
    date: new Date().toISOString(),
    clientName: 'Administración',
    type: 'hardware',
    priority: 'medium',
    status: 'in_progress',
    technician: 'Mia',
    description: 'Laptop no enciende',
    comments: [],
  },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

  const addTicket = (ticket: Ticket) => {
    setTickets((prev) => [...prev, ticket]);
  };

  const updateTicket = (
    id: string,
    updatedTicket: Partial<Ticket>
  ) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === id
          ? { ...ticket, ...updatedTicket }
          : ticket
      )
    );
  };

  return (
    <DataContext.Provider
      value={{
        tickets,
        addTicket,
        updateTicket,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);

  if (!context) {
    throw new Error('useData debe usarse dentro de DataProvider');
  }

  return context;
}
