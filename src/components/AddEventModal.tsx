import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { ChurchEvent, Category } from '../types/database';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ChurchEvent | null;
}

const AddEventModal: React.FC<Props> = ({ onClose, onSuccess, initialData }) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Efeito para carregar categorias e preencher dados se for EDIÇÃO
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) setCategories(data);
    };

    loadCategories();

    if (initialData) {
      setTitle(initialData.title);
      // Extrai apenas a parte da data YYYY-MM-DD para o input HTML
      setStartDate(initialData.start_date.split('T')[0]);
      // Correção do erro 2345: garante que nunca seja undefined
      setCategoryId(initialData.category_id || '');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Ajuste de fuso horário: Salvamos como meio-dia (12:00) para garantir
    // que a data não mude para o dia anterior devido ao fuso local.
    const eventData = {
      title,
      start_date: `${startDate}T12:00:00Z`,
      category_id: categoryId,
    };

    try {
      if (initialData?.id) {
        // Modo Edição
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', initialData.id);
        if (error) throw error;
      } else {
        // Modo Criação
        const { error } = await supabase
          .from('events')
          .insert([eventData]);
        if (error) throw error;
      }

      onSuccess();
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[100] no-print">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-white/20">
        <header className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            {initialData ? '✍️ Editar Evento' : '✨ Novo Evento'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              Nome da Atividade
            </label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
              placeholder="Ex: Reunião de Líderes"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Data
              </label>
              <input
                required
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Departamento
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium appearance-none"
              >
                <option value="">Selecione...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? 'Processando...' : initialData ? 'Salvar' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEventModal;