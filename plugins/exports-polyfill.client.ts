export default defineNuxtPlugin(() => {
  // Make sure exports is defined in browser environment
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.exports = window.exports || {};
    // @ts-ignore
    if (typeof exports === 'undefined') {
      // @ts-ignore
      window.exports = {};
    }
  }
  
  // Also ensure global exports object
  // @ts-ignore
  if (typeof global !== 'undefined' && typeof global.exports === 'undefined') {
    // @ts-ignore
    global.exports = {};
  }
})