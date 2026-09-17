const TOKEN_KEY = 'poh-admin.jwt';

const expired = (token: string) => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return true;
    return JSON.parse(atob(payload)).exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export const session = {
  token: (): string | null => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token || expired(token)) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  },
  store: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  expire: () => sessionStorage.removeItem(TOKEN_KEY),
};
