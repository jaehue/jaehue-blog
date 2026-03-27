import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase 설정
// Firebase Console > 프로젝트 설정 > 웹 앱에서 config 값을 복사하여 아래에 채워주세요.
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const isConfigured =
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId !== 'YOUR_PROJECT_ID';

const app = isConfigured && getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0] ?? null;

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
export { isConfigured };
