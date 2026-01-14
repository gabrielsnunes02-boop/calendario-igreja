import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChurchEvent } from '../types/database';

interface Props {
  month: Date;
  events: ChurchEvent[];
  onClose: () => void;
  onDeleteEvent: (id: string) => void;
}

const MonthDetailsModal: React.FC<Props> = ({ month, events, onClose, onDeleteEvent }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <header className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-800 capitalize">
              {format(month, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <p className="text-slate-500 text-sm">{events.length} eventos programados</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
        </header>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {events.length === 0 ? (
            <p className="text-center text-slate-400 py-10">Nenhum evento para este mês.</p>
          ) : (
            events.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
            .map(event => (
              <div key={event.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white font-bold" style={{ backgroundColor: (event.categories as any)?.color }}>
                    <span className="text-xs leading-none opacity-80">{format(new Date(event.start_date), 'MMM', { locale: ptBR })}</span>
                    <span className="text-lg leading-none">{new Date(event.start_date).getUTCDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{event.title}</h3>
                    <p className="text-xs font-black uppercase tracking-widest text-blue-600">{(event.categories as any)?.name}</p>
                  </div>
                </div>
                <button onClick={() => onDeleteEvent(event.id)} className="text-slate-300 hover:text-red-600 p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
        
        <footer className="p-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} className="w-full py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors">
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
};

export default MonthDetailsModal;