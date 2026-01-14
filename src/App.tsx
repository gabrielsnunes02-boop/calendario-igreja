import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import YearView from './pages/YearView';
import MonthView from './pages/MonthView';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rota Principal: Calendário Anual */}
        <Route path="/" element={<YearView />} />

        {/* Rota de Detalhes: Calendário Mensal e Semanal */}
        {/* O :monthIso é um parâmetro que passamos (ex: 2026-01-01T00:00:00Z) */}
        <Route path="/mes/:monthIso" element={<MonthView />} />

        {/* Redirecionamento de segurança: 
            Se o usuário digitar qualquer endereço errado, volta para o início */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;