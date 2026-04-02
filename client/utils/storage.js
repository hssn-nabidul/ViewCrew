const USER_ID_KEY = 'watchsync-userId';
const DISPLAY_NAME_KEY = 'watchsync-displayName';
const HOST_TOKEN_KEY = 'watchsync-hostToken';

export const storage = {
  getUserId: () => {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = Math.random().toString(36).substring(7);
      localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  },
  setUserId: (id) => {
    localStorage.setItem(USER_ID_KEY, id);
  },
  getDisplayName: (userId) => {
    return localStorage.getItem(DISPLAY_NAME_KEY) || `User_${userId}`;
  },
  setDisplayName: (name) => {
    localStorage.setItem(DISPLAY_NAME_KEY, name);
  },
  getHostToken: () => {
    return localStorage.getItem(HOST_TOKEN_KEY) || null;
  },
  setHostToken: (token) => {
    localStorage.setItem(HOST_TOKEN_KEY, token);
  },
  clearHostToken: () => {
    localStorage.removeItem(HOST_TOKEN_KEY);
  }
};
