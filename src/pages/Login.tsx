import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) alert('Erro no cadastro: ' + error.message);
      else alert('Cadastro realizado! Agora você pode fazer login.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert('Erro ao entrar: ' + error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
        <header className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.png" 
              alt="Logo da Igreja" 
              className="h-24 w-auto object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')} 
            />
          </div>

          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
            {isSignUp ? 'Criar Conta' : 'Calendário Igreja'}
          </h1>
          <p className="text-slate-500">
            {isSignUp ? 'Cadastre-se para gerenciar' : 'Acesse para gerenciar o planejamento'}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Nome Completo</label>
              <input 
                type="text" 
                placeholder="Seu nome"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">E-mail</label>
            <input 
              type="email" 
              placeholder="seu@email.com"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Senha</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processando...' : isSignUp ? 'Criar minha conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;