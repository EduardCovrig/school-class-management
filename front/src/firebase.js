import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// configurarea aplicatiei web din firebase console
const firebaseConfig = {
  apiKey: 'AIzaSyCqJiFju6SHn-lix6re1PjpzP-F_ntv-Sw',
  authDomain: 'school-class-management.firebaseapp.com',
  projectId: 'school-class-management',
  storageBucket: 'school-class-management.firebasestorage.app',
  messagingSenderId: '869385069460',
  appId: '1:869385069460:web:8bd105ebf9f6ea64446581'
};

// initializam firebase si serviciul de autentificare
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);