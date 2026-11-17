<script setup>
import Navbar from './components/Navbar.vue';
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <!-- componenta reutilizabila pentru header -->
    <Navbar />

    <!-- aici se randeaza pagina curenta din router -->
    <main>
      <RouterView />
    </main>
  </div>
</template>