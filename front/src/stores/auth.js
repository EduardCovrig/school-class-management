import { ref } from 'vue';
import { defineStore } from 'pinia';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebase';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const profile = ref(null);
  const token = ref(null);
  const initialized = ref(false);

  // cerem profilul din api-ul nostru folosind token-ul jwt
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

  // asteptam sa vedem daca exista deja o sesiune activa la refresh
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

  // autentificare cu email si parola
  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    user.value = cred.user;
    token.value = await cred.user.getIdToken();
    await fetchProfile(token.value);
  }

  // creare cont in firebase si salvare profil in firestore prin api
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

  // delogare si curatare stare
  async function logout() {
    await signOut(auth);
    user.value = null;
    profile.value = null;
    token.value = null;
  }

  return { user, profile, token, initialized, initAuth, login, register, logout };
});