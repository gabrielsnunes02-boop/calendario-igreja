export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Team {
  id: string;
  name: string;
}

export interface ChurchEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  category_id?: string;
  team_id?: string;
  categories?: Category; // Isso traz os dados da tabela de categorias
  teams?: Team;         // Isso traz os dados da tabela de equipes
}