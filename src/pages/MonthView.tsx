import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth,
  isSameDay, 
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChurchEvent } from '../types/database';
import AddEventModal from '../components/AddEventModal';

const MonthView: React.FC = () => {
  const { monthIso } = useParams<{ monthIso: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Data base para o mês selecionado
  const selectedDate = monthIso ? parseISO(monthIso) : new Date();

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, start_date, category_id, categories(name, color)');
    if (!error && data) setEvents(data as any);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleEdit = (event: ChurchEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  // Configuração do Calendário
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 print:p-0">
      <header className="flex justify-between items-center mb-8 no-print">
        <button onClick={() => navigate('/')} className="text-blue-600 font-bold flex items-center gap-2 hover:underline">
          ← Voltar ao Ano
        </button>
        <h1 className="text-2xl font-black text-slate-800 capitalize">
          {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
        </h1>
        <button 
          onClick={() => window.print()} 
          className="bg-slate-800 text-white px-5 py-2 rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-colors"
        >
          Imprimir Mês
        </button>
      </header>

      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho de Impressão (Só aparece no papel) */}
        <div className="hidden print:flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Logo" className="w-20 mb-2 object-contain" />
          <h2 className="text-xl font-bold uppercase">{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</h2>
        </div>

        {/* GRADE DO CALENDÁRIO */}
        <div className="grid grid-cols-7 border-l border-t border-slate-200 shadow-sm">
          {weekDays.map(day => (
            <div key={day} className="bg-slate-50 border-r border-b border-slate-200 p-3 text-center font-black text-[10px] text-slate-500 uppercase tracking-widest">
              {day}
            </div>
          ))}
          
          {days.map((day, i) => {
            // CORREÇÃO DE FUSO: Compara strings (yyyy-MM-dd) em vez de objetos Date
            const dayString = format(day, 'yyyy-MM-dd');
            
            const dayEvents = events.filter(e => {
              const eventDateString = e.start_date.split('T')[0]; // Pega "2026-01-18"
              return eventDateString === dayString;
            });
            
            return (
              <div key={i} className={`min-h-[110px] border-r border-b border-slate-200 p-2 transition-colors ${!isSameMonth(day, monthStart) ? 'bg-slate-50/50 opacity-40' : 'bg-white'}`}>
                <span className={`text-xs font-bold ${isSameDay(day, new Date()) ? 'text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full' : 'text-slate-400'}`}>
                  {format(day, 'd')}
                </span>
                
                <div className="mt-1 space-y-1">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id} 
                      onClick={() => handleEdit(event)}
                      className="text-[9px] p-1.5 rounded-md text-white font-black leading-tight shadow-sm uppercase truncate cursor-pointer hover:brightness-90 transition-all" 
                      style={{ 
                        backgroundColor: (event.categories as any)?.color || '#999',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* TABELA DE CRONOGRAMA (Aparece embaixo do calendário na impressão) */}
        <div className="mt-10 page-break-before-auto">
          <h3 className="text-lg font-black text-slate-800 mb-4 border-b-4 border-slate-800 pb-1 uppercase italic">
            Cronograma Detalhado
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="p-3 border border-slate-300 text-xs font-black uppercase w-20 text-center">Dia</th>
                <th className="p-3 border border-slate-300 text-xs font-black uppercase">Evento</th>
                <th className="p-3 border border-slate-300 text-xs font-black uppercase w-40">Categoria</th>
                <th className="p-3 border border-slate-300 text-xs font-black uppercase w-20 no-print text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {events
                .filter(e => {
                   // Filtra apenas eventos deste mês para a tabela
                   const eventDate = parseISO(e.start_date);
                   return isSameMonth(eventDate, selectedDate);
                })
                .sort((a, b) => a.start_date.localeCompare(b.start_date))
                .map(event => {
                  // Extrai o dia diretamente da string para evitar erro de fuso
                  const dayString = event.start_date.split('T')[0].split('-')[2];
                  
                  return (
                    <tr key={event.id} className="border-b hover:bg-slate-50 transition-colors break-inside-avoid">
                      <td className="p-3 border border-slate-200 text-center font-black text-blue-600 text-sm">
                        {dayString}
                      </td>
                      <td className="p-3 border border-slate-200 text-sm font-bold uppercase text-slate-700">
                        {event.title}
                      </td>
                      <td className="p-3 border border-slate-200">
                         <div className="flex items-center gap-2">
                           <div 
                             className="w-3 h-3 rounded-full border border-slate-300" 
                             style={{ 
                               backgroundColor: (event.categories as any)?.color || '#999',
                               WebkitPrintColorAdjust: 'exact',
                               printColorAdjust: 'exact'
                             }}
                           ></div>
                           <span className="text-[10px] font-black uppercase text-slate-500">
                             {(event.categories as any)?.name}
                           </span>
                         </div>
                      </td>
                      <td className="p-3 border border-slate-200 text-center no-print">
                        <button 
                          onClick={() => handleEdit(event)}
                          className="text-blue-500 hover:text-blue-700 font-bold text-xs border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          EDITAR
                        </button>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AddEventModal 
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEvent(null);
          }} 
          onSuccess={() => {
            fetchEvents();
            setIsModalOpen(false);
            setSelectedEvent(null);
          }}
          initialData={selectedEvent}
        />
      )}
    </div>
  );
};

export default MonthView;