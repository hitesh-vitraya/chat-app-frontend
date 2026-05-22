import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async get(key) {
    const value = await AsyncStorage.getItem(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },

  async set(key, value) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key) {
    await AsyncStorage.removeItem(key);
  },

  async clear() {
    await AsyncStorage.clear();
  }
};

export const storageKeys = {
  authToken: 'authToken',
  user: 'user'
};
