import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  return {
    base: command === 'build' ? '/proyecto-enjambre/' : '/',
  };
});