import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { format, startOfYear, eachMonthOfInterval, endOfYear, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChurchEvent } from '../types/database';
import AddEventModal from '../components/AddEventModal';

const YearView: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentYear = 2026;

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, start_date, category_id, categories(name, color)');
    
    if (!error && data) {
      setEvents(data as any);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const months = eachMonthOfInterval({
    start: startOfYear(new Date(currentYear, 0, 1)),
    end: endOfYear(new Date(currentYear, 0, 1)),
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 print:bg-white print:p-0">
      
      {/* HEADER */}
      <header className="flex flex-col items-center mb-12 text-center max-w-5xl mx-auto">
        <img 
          src="/logo.png" 
          className="w-24 h-24 object-contain mb-4 drop-shadow-sm" 
          alt="Logo Igreja Viva" 
        />
        
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Calendário {currentYear}
        </h1>
        <p className="text-slate-500 font-medium italic mt-1">
          Ano da Família — Isaías 61, 9
        </p>

        <div className="mt-8 flex gap-3 no-print">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            🖨️ Imprimir Cronograma Anual
          </button>
          
          <button 
            onClick={async () => { await supabase.auth.signOut(); }}
            className="px-5 py-2.5 text-slate-400 hover:text-red-600 font-bold transition-colors"
          >
            Sair
          </button>
        </div>
      </header>
      
      {/* GRADE DE MESES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {months.map((month) => {
          const monthEvents = events.filter(event => 
            isSameMonth(new Date(event.start_date), month)
          );

          return (
            <div 
              key={month.toString()} 
              onClick={() => navigate(`/mes/${month.toISOString()}`)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="capitalize font-black text-slate-700 group-hover:text-blue-600 transition-colors">
                  {format(month, 'MMMM', { locale: ptBR })}
                </h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600">
                  {monthEvents.length} eventos
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1.5 min-h-[35px]">
                {monthEvents.length > 0 ? (
                  monthEvents.map(event => {
                    // CORREÇÃO: Extrair o dia diretamente da string para evitar fuso horário
                    const dayString = event.start_date.split('T')[0].split('-')[2];
                    
                    return (
                      <div 
                        key={event.id} 
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white" 
                        style={{ 
                          backgroundColor: (event.categories as any)?.color || '#3b82f6',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact'
                        }}
                        title={event.title}
                      >
                        {dayString}
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full flex items-center justify-center border border-dashed border-slate-200 rounded-lg py-2">
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Vazio</span>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end no-print">
                <span className="text-blue-500 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase">
                  Ver Detalhes →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* LISTA PARA IMPRESSÃO (Apenas quando imprime) */}
      <section className="hidden print:block mt-12 page-break-before-auto">
        <h2 className="text-xl font-bold border-b-2 border-slate-800 pb-2 mb-6 uppercase tracking-wider text-center">
          Programação Geral da Igreja - {currentYear}
        </h2>
        <table className="w-full text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 text-slate-700 uppercase text-[10px] font-black">
              <th className="p-3 border">Data</th>
              <th className="p-3 border">Evento / Atividade</th>
              <th className="p-3 border">Departamento / Categoria</th>
            </tr>
          </thead>
          <tbody>
            {events
              .sort((a, b) => a.start_date.localeCompare(b.start_date))
              .map(event => {
                // Formatação manual da data para evitar fuso
                const [ano, mes, dia] = event.start_date.split('T')[0].split('-');
                
                return (
                  <tr key={event.id} className="border-b break-inside-avoid">
                    <td className="p-3 border text-sm font-bold text-red-700 whitespace-nowrap">
                      {`${dia}/${mes}/${ano}`}
                    </td>
                    <td className="p-3 border text-sm font-bold uppercase text-slate-800">
                      {event.title}
                    </td>
                    <td className="p-3 border text-[10px] uppercase font-bold text-slate-500">
                      {(event.categories as any)?.name}
                    </td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </section>

      {/* BOTÃO FLUTUANTE ADICIONAR (+) */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="no-print fixed bottom-10 right-10 bg-blue-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-3xl font-light hover:scale-110 active:scale-95 transition-all z-40 ring-4 ring-white"
      >
        +
      </button>

      {isModalOpen && (
        <AddEventModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchEvents}
        />
      )}
    </div>
  );
};

export default YearView;