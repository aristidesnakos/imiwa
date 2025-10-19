export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface TemplateCard {
  id: string;
  title: string;
  content: string;
  category: 'grammar' | 'vocabulary' | 'translation' | 'analysis' | 'culture' | 'conversation';
  language?: string;
  difficulty?: string;
}
