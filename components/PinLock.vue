<!-- components/PinLock.vue -->
<script setup lang="ts">
import { useSecurityStore } from '~/stores/security'

const securityStore = useSecurityStore()

const emit = defineEmits<{
  'pin-set': [pin: string]
}>()

const pin = ref('')
const isFirstTime = ref(false)
const confirmPin = ref('')
const step = ref<'enter' | 'setup' | 'confirm'>('enter')

// Проверяем, нужна ли первичная настройка PIN
onMounted(async () => {
  await securityStore.initialize()
  if (securityStore.needsPinSetup) {
    step.value = 'setup'
    isFirstTime.value = true
  }
})

// Добавление цифры к PIN
const addDigit = (digit: string) => {
  if (step.value === 'confirm') {
    if (confirmPin.value.length < 6) {
      confirmPin.value += digit
      if (confirmPin.value.length === 6) {
        handleConfirmPin()
      }
    }
  } else {
    if (pin.value.length < 6) {
      pin.value += digit
      if (pin.value.length === 6) {
        handlePinComplete()
      }
    }
  }
}

// Удаление последней цифры
const removeDigit = () => {
  if (step.value === 'confirm') {
    confirmPin.value = confirmPin.value.slice(0, -1)
  } else {
    pin.value = pin.value.slice(0, -1)
  }
}

// Обработка завершения ввода PIN
const handlePinComplete = async () => {
  if (step.value === 'setup') {
    // Переход к подтверждению PIN
    step.value = 'confirm'
    return
  }

  // Проверка PIN (всегда успешно, но устанавливает режим)
  securityStore.verifyPIN(pin.value)
  
  // Небольшая задержка для плавности
  await new Promise(resolve => setTimeout(resolve, 200))
}

// Обработка подтверждения PIN
const handleConfirmPin = async () => {
  if (pin.value === confirmPin.value) {
    // PIN совпадают - сохраняем или эмитим для внешней обработки
    if (isFirstTime.value) {
      securityStore.setPIN(pin.value)
    } else {
      emit('pin-set', pin.value)
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  } else {
    // PIN не совпадают - начинаем заново
    pin.value = ''
    confirmPin.value = ''
    step.value = 'setup'
  }
}

// Очистка PIN
const clearPin = () => {
  pin.value = ''
  confirmPin.value = ''
}

// Получение текущего PIN для отображения
const getCurrentPin = computed(() => {
  return step.value === 'confirm' ? confirmPin.value : pin.value
})

// Заголовок в зависимости от шага
const getTitle = computed(() => {
  switch (step.value) {
    case 'setup':
      return 'Установите PIN-код'
    case 'confirm':
      return 'Подтвердите PIN-код'
    default:
      return 'Введите PIN-код'
  }
})
</script>

<template>
  <div class="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-md mx-4">
      
      <!-- Заголовок -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ getTitle }}</h2>
        <p v-if="step === 'setup'" class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Создайте 6-значный PIN для защиты кошелька
        </p>
        <p v-else-if="step === 'confirm'" class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Введите PIN еще раз для подтверждения
        </p>
      </div>

      <!-- PIN индикатор -->
      <div class="flex justify-center space-x-3 mb-8">
        <div 
          v-for="i in 6" 
          :key="i"
          class="w-4 h-4 rounded-full border-2 transition-all duration-200"
          :class="getCurrentPin.length >= i 
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
        
        <!-- Пустая ячейка -->
        <div></div>
        
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
          :disabled="getCurrentPin.length === 0"
          class="h-16 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"></path>
          </svg>
        </button>
      </div>

      <!-- Дополнительные кнопки для настройки -->
      <div v-if="step === 'setup' || step === 'confirm'" class="flex justify-center space-x-4">
        <button
          @click="clearPin"
          class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Очистить
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
