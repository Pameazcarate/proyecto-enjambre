import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  return {
    // Si estás en desarrollo local usa la raíz '/', si compilas para producción usa el subdirectorio
    base: command === 'build' ? '/proyecto-enjambre/' : '/',
  };
});