<template>
  <!-- bara de navigare reutilizabila in toata aplicatia -->
  <header class="bg-white border-b border-slate-200 shadow-xs">
    <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-3">
        <span class="font-bold text-lg text-indigo-600">School Class Management</span>
        <span class="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
          2026 / 2027
        </span>
      </div>

      <!-- slot pentru butoanele din dreapta (ex: login sau logout mai tarziu) -->
      <div class="flex items-center gap-3">
        <slot />
      </div>
    </div>
  </header>
</template>