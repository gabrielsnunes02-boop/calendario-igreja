import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Certifique-se de que o export default está exatamente assim:
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});