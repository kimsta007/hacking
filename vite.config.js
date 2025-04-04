import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd());

  return {
    base: command === 'build' ? env.VITE_BASE_PATH : '/',
    plugins: [
      react(),
    ],
  };
});