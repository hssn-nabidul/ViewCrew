const USER_ID_KEY = 'watchsync-userId';
const DISPLAY_NAME_KEY = 'watchsync-displayName';

export const storage = {
  getUserId: () => {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = Math.random().toString(36).substring(7);
      localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  },
  getDisplayName: (userId) => {
    return localStorage.getItem(DISPLAY_NAME_KEY) || `User_${userId}`;
  },
  setDisplayName: (name) => {
    localStorage.setItem(DISPLAY_NAME_KEY, name);
  }
};
