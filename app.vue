<script setup>
// Removed Flowbite initialization as we're using custom Vue modals
import { useSecurityStore } from '~/stores/security'

const securityStore = useSecurityStore()

// Инициализация теперь происходит в plugins/client-init.client.ts

// Блокировка при закрытии окна
onBeforeUnmount(() => {
  securityStore.lockApp()
})

// Блокировка при закрытии/перезагрузке страницы
onMounted(() => {
  if (process.client) {
    window.addEventListener('beforeunload', () => {
      securityStore.lockApp()
    })
  }
})
</script>


<template>
  <SSRWrapper>
    <div class="items-center justify-center lg:h-screen md:h-screen sm:h-screen h-screen  dark:bg-gray-900 ">

      <!-- PIN-экран если приложение заблокировано -->
      <PinLock v-if="securityStore.isLocked || securityStore.needsPinSetup" />
      
      <!-- Основное приложение если разблокировано -->
      <Dashboard v-else />

    </div>
  </SSRWrapper>
</template>
