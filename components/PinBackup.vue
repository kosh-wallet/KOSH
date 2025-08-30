<!-- components/PinBackup.vue -->
<script setup lang="ts">
import { useSecurityStore } from '~/stores/security'

interface Props {
  show?: boolean
  mode: 'export' | 'import'
}

const props = withDefaults(defineProps<Props>(), {
  show: false
})

const emit = defineEmits<{
  'pin-entered': [pin: string]
  'close': []
}>()

const securityStore = useSecurityStore()
const pin = ref('')

// Добавление цифры к PIN
const addDigit = (digit: string) => {
  if (pin.value.length < 6) {
    pin.value += digit
    if (pin.value.length === 6) {
      handlePinComplete()
    }
  }
}

// Удаление последней цифры
const removeDigit = () => {
  pin.value = pin.value.slice(0, -1)
}

// Обработка завершения ввода PIN
const handlePinComplete = async () => {
  // Эмитим PIN для родительского компонента (без сохранения в localStorage)
  emit('pin-entered', pin.value)
  
  // Небольшая задержка для плавности
  await new Promise(resolve => setTimeout(resolve, 200))
}

// Очистка PIN
const clearPin = () => {
  pin.value = ''
}

// Закрытие модала
const closeModal = () => {
  pin.value = ''
  emit('close')
}

// Обработка клавиши Escape
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show) {
    closeModal()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})

// Заголовок в зависимости от режима
const getTitle = computed(() => {
  return props.mode === 'export' 
    ? 'PIN для экспорта' 
    : 'PIN для импорта'
})

const getDescription = computed(() => {
  return props.mode === 'export'
    ? 'Введите PIN для обфускации файла резервной копии'
    : 'Введите PIN для деобфускации файла резервной копии'
})
</script>

<template>
  <div v-if="show" @click.self="closeModal"
      class="fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto md:inset-0 h-[calc(100%-1rem)] max-h-full bg-black bg-opacity-50 flex items-center justify-center">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-md mx-4">
      
      <!-- Заголовок -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ getTitle }}</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {{ getDescription }}
        </p>
      </div>

      <!-- PIN индикатор -->
      <div class="flex justify-center space-x-3 mb-8">
        <div 
          v-for="i in 6" 
          :key="i"
          class="w-4 h-4 rounded-full border-2 transition-all duration-200"
          :class="pin.length >= i 
            ? 'bg-blue-600 border-blue-600' 
            : 'border-gray-300 dark:border-gray-600'"
        ></div>
      </div>

      <!-- Цифровая клавиатура -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <button
          v-for="digit in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
          :key="digit"
          @click="addDigit(digit)"
          class="h-16 text-2xl font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 active:scale-95"
        >
          {{ digit }}
        </button>
        
        <!-- Кнопка отмены -->
        <button
          @click="closeModal"
          class="h-16 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 active:scale-95"
        >
          <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        
        <!-- Цифра 0 -->
        <button
          @click="addDigit('0')"
          class="h-16 text-2xl font-semibold rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 active:scale-95"
        >
          0
        </button>
        
        <!-- Кнопка удаления -->
        <button
          @click="removeDigit"
          :disabled="pin.length === 0"
          class="h-16 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"></path>
          </svg>
        </button>
      </div>

      <!-- Дополнительные кнопки -->
      <div class="flex justify-center space-x-4">
        <button
          @click="clearPin"
          class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Очистить
        </button>
        <button
          @click="closeModal"
          class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Отмена
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Дополнительные стили для анимаций */
.active\:scale-95:active {
  transform: scale(0.95);
}
</style>
