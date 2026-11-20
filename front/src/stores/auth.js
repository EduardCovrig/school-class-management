import { ref } from 'vue';
import { defineStore } from 'pinia';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebase';

// store pinia care tine starea globala a autentificarii in toata aplicatia
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null); // obiectul user din firebase auth
  const profile = ref(null); // datele profilului din firestore (fullName, role, class)
  const token = ref(null); // token-ul jwt pe care il trimitem la fiecare cerere catre api
  const initialized = ref(false); // ne spune daca am verificat sesiunea la incarcarea paginii

  // cerem profilul userului din api-ul nostru express folosind token-ul jwt
  async function fetchProfile(idToken) {
    const res = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    if (res.ok) {
      profile.value = await res.json();
    } else {
      profile.value = null;
    }
  }

  // se apeleaza in router guard la prima incarcare sau refresh
  // asteapta raspunsul de la firebase ca sa nu redirectioneze prematur la /login
  function initAuth() {
    if (initialized.value) return Promise.resolve();
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          user.value = firebaseUser;
          token.value = await firebaseUser.getIdToken();
          await fetchProfile(token.value);
        } else {
          user.value = null;
          profile.value = null;
          token.value = null;
        }
        initialized.value = true;
        resolve();
      });
    });
  }

  // logare cu email si parola in firebase auth, apoi incarcam profilul din api
  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    user.value = cred.user;
    token.value = await cred.user.getIdToken();
    await fetchProfile(token.value);
  }

  // pasul 1: cream contul in firebase auth
  // pasul 2: trimitem rolul si clasa catre api-ul nostru sa le salveze in firestore
  async function register({ fullName, email, password, role, classId }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    user.value = cred.user;
    token.value = await cred.user.getIdToken();

    const res = await fetch('/api/users/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`
      },
      body: JSON.stringify({ fullName, role, classId })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save user profile.');
    }
    profile.value = data;
  }

  // delogare din firebase si resetarea starii din pinia
  async function logout() {
    await signOut(auth);
    user.value = null;
    profile.value = null;
    token.value = null;
  }

  return { user, profile, token, initialized, initAuth, login, register, logout };
});