<template>
  <div v-if="isClient">
    <slot />
  </div>
  <div v-else class="min-h-screen bg-gray-900 flex items-center justify-center">
    <div class="text-white text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
      <p>Loading...</p>
    </div>
  </div>
</template>

<script setup>
const isClient = ref(false)

onMounted(() => {
  isClient.value = true
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
