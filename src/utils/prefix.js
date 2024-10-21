export const PREFIX = import.meta.env.PROD
  ? import.meta.env.VITE_BASE_PATH
  : '/';


export const getUrl = (path) => `${PREFIX}${path}`;
