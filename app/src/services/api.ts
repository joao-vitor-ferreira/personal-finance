import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = process.env.PUBLIC_URL;
const SESSION_KEY = 'session';

async function getToken() {
  if (Platform.OS === 'web') return localStorage.getItem(SESSION_KEY);
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Erro na requisição.');
  }

  // 204 sem corpo
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}