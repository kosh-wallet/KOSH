<template>
    <div class="z-50 fixed bottom-6 right-6 group">
        <!-- Menu dropdown -->
        <div v-show="isMenuOpen"
            class="flex flex-col justify-end py-1 mb-4 space-y-2 bg-white border border-gray-100 rounded-lg shadow-lg dark:border-gray-600 dark:bg-gray-700">
            <ul class="text-xl text-gray-500 dark:text-gray-300">
                <li>
                    <button @click="handleSaveToFile"
                        class="flex items-center w-full px-5 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                clip-rule="evenodd">
                            </path>
                        </svg>
                        <span class="text-lg font-medium">Backup to file</span>
                    </button>
                </li>
                <li>
                    <button @click="handleOpenFile"
                        class="flex items-center w-full px-5 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                                clip-rule="evenodd">
                            </path>
                        </svg>
                        <span class="text-lg font-medium">Restore from file</span>
                    </button>
                </li>
                <li>
                    <button @click="handleCreateWallet"
                        class="flex items-center w-full px-5 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"
                                clip-rule="evenodd">
                            </path>
                            <path fill-rule="evenodd"
                                d="M10 7a1 1 0 011 1v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0v-2H7a1 1 0 110-2h2V8a1 1 0 011-1z"
                                clip-rule="evenodd">
                            </path>
                        </svg>
                        <span class="text-lg font-medium">Create Wallet</span>
                    </button>
                </li>
                <li>
                    <button @click="handleAddAddress"
                        class="flex items-center w-full px-5 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                clip-rule="evenodd">
                            </path>
                        </svg>
                        <span class="text-lg font-medium">Add New Address</span>
                    </button>
                </li>
                <li>
                    <button @click="handleSettings"
                        class="flex items-center w-full px-5 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white">
                        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                                clip-rule="evenodd">
                            </path>
                        </svg>
                        <span class="text-lg font-medium">RPC Settings</span>
                    </button>
                </li>
            </ul>
        </div>
        
        <!-- Menu toggle button -->
        <button @click="toggleMenu" type="button"
            class="flex items-center justify-center ml-auto text-white bg-blue-700 rounded-full w-14 h-14 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:focus:ring-blue-800 transition-transform duration-200"
            :class="{ 'rotate-45': isMenuOpen }">
            <svg aria-hidden="true" class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                    d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z">
                </path>
            </svg>
            <span class="sr-only">{{ isMenuOpen ? 'Close menu' : 'Open menu' }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
    'save-to-file': []
    'open-file': []
    'add-address': []
    'create-wallet': []
    'restore-from-seed': []
    'open-settings': []
}>()

const isMenuOpen = ref(false)

const toggleMenu = () => {
    isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
    isMenuOpen.value = false
}

const handleSaveToFile = () => {
    emit('save-to-file')
    closeMenu()
}

const handleOpenFile = () => {
    emit('open-file')
    closeMenu()
}

const handleCreateWallet = () => {
    emit('create-wallet')
    closeMenu()
}

const handleAddAddress = () => {
    emit('add-address')
    closeMenu()
}

const handleRestoreFromSeed = () => {
    emit('restore-from-seed')
    closeMenu()
}

const handleSettings = () => {
    emit('open-settings')
    closeMenu()
}

// Close menu when clicking outside
const handleClickOutside = (event: Event) => {
    const target = event.target as HTMLElement
    if (isMenuOpen.value && !target.closest('.group')) {
        closeMenu()
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>
