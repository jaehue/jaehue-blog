import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDx_2PWF_BMHs8U9XrHj48OlrorXxdUSMw',
  authDomain: 'jaehue-blog.firebaseapp.com',
  projectId: 'jaehue-blog',
  storageBucket: 'jaehue-blog.firebasestorage.app',
  messagingSenderId: '900107196396',
  appId: '1:900107196396:web:1aad0f4b3e2b75d23012c9',
  measurementId: 'G-5W55HRRRFM',
};

const isConfigured =
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId !== 'YOUR_PROJECT_ID';

const app = isConfigured && getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0] ?? null;

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
export { isConfigured };
