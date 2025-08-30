// Helper declarations so linter/TS doesn't complain in config outside Nuxt context
// These declarations don't reach runtime, only for typing
declare const defineNuxtConfig: any
declare const process: any

const BASE = process.env.NUXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'production' ? '/KOSH/' : '/')
const CSP_DEV = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https: ws:; worker-src 'self' blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'none'; base-uri 'self'"
// Allow inline scripts for static generation (hashes can be added later for specific scripts)
const CSP_PROD = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https:; worker-src 'self' blob:; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'"

export default defineNuxtConfig({
    app: {
        // Base path of the application. For GitHub Pages/subfolder use NUXT_PUBLIC_BASE_URL or default '/KOSH/' in production
        baseURL: BASE,
        // Important: without leading slash so asset paths are correctly prefixed with baseURL for static hosting
        buildAssetsDir: '_nuxt/',
        head: {
            bodyAttrs: {
                class: 'bg-gray-900'
            },
            meta: [
                { name: 'apple-mobile-web-app-capable', content: 'yes' },
                { name: 'mobile-web-app-capable', content: 'yes' },
                { name: 'display', content: 'standalone' },
                { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
                { name: 'apple-mobile-web-app-title', content: 'KOSH' },
                { name: 'theme-color', content: '#ffffff' },
                { name: 'format-detection', content: 'telephone=no' },
                // CSP: only in dev mode to avoid static generation issues
                ...(process.env.NODE_ENV === 'development' ? [{ 'http-equiv': 'Content-Security-Policy', content: CSP_DEV }] : [])
            ],
            link: [
                { rel: 'apple-touch-startup-image', href: `${BASE}icons/logo.svg` },
                { rel: 'apple-touch-icon', sizes: '192x192', href: `${BASE}icons/kosh192.png` },
                { rel: 'icon', type: 'image/png', sizes: '192x192', href: `${BASE}icons/kosh192.png` }
            ]
        }
    },
    modules: [
        '@nuxtjs/tailwindcss',
        '@vite-pwa/nuxt',
        '@pinia/nuxt'
    ],
    ssr: false,
    nitro: {
        prerender: {
            routes: [],
            crawlLinks: false,
            failOnError: false
        },
        routeRules: {
            '/**': {
                headers: {
                    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https:; worker-src 'self' blob:; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'"
                }
            }
        }
    },
    typescript: {
        strict: false,
        typeCheck: false
    },
    pwa: {
        registerType: 'autoUpdate',
        manifest: {
            name: 'KOSH TRC20 USDT Wallet',
            short_name: 'KOSH',
            description: 'Secure TRC20 USDT Wallet',
            lang: 'en',
            display: 'standalone',
            // Binding to baseURL: relative paths are safer for deployment in subfolder
            start_url: '.',
            scope: BASE,
            theme_color: '#ffffff',
            background_color: '#ffffff',
            icons: [
                {
                    // Relative path resolves correctly within scope
                    src: 'icons/kosh192.png',
                    sizes: '192x192',
                    type: 'image/png'
                },
                {
                    src: 'icons/kosh512.png',
                    sizes: '512x512',
                    type: 'image/png'
                }
            ]
        },
        workbox: {
            // iOS/Safari: use fallback to scope root to match what's actually cached
            // In some environments Workbox puts in precache not index.html but URL with trailing slash (e.g. "/KOSH/")
            navigateFallback: BASE,
            globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
            cleanupOutdatedCaches: true,
            skipWaiting: true,
            clientsClaim: true
        },
        devOptions: {
            enabled: process.env.NODE_ENV === 'production',
            suppressWarnings: true,
            // Allow navigation to baseURL root in plugin dev mode
            navigateFallbackAllowlist: [new RegExp(`^${BASE.replace(/\//g, '\\/')}$`)],
            type: 'module'
        }
    },
    vite: {
        define: {
            global: 'globalThis',
            'process.env': {},
            'process.browser': true,
            // Polyfill for @noble/hashes/_u64
            '__NOBLE_U64_POLYFILL__': JSON.stringify({
                split: function(arr, le) {
                    if (!arr || typeof arr.map !== 'function') return [new Uint32Array(0), new Uint32Array(0)];
                    const len = arr.length;
                    const Ah = new Uint32Array(len);
                    const Al = new Uint32Array(len);
                    for (let i = 0; i < len; i++) {
                        const a = arr[i];
                        Ah[i] = (a >>> 32) | 0;
                        Al[i] = a | 0;
                    }
                    return le ? [Al, Ah] : [Ah, Al];
                },
                rotlBH: function(h, l, s) { return (h << s) | (l >>> (32 - s)); },
                rotlBL: function(h, l, s) { return (l << s) | (h >>> (32 - s)); },
                rotlSH: function(h, l, s) { return (h << s) | (l >>> (32 - s)); },
                rotlSL: function(h, l, s) { return (l << s) | (h >>> (32 - s)); }
            })
        },
        resolve: {
            alias: {
                //'crypto': 'crypto-browserify',
                //'stream': 'stream-browserify',
                'buffer': 'buffer',
                'util': 'util',
                // Force browser build of TronWeb to avoid pulling TronWeb.node.js during bundling
                'tronweb': 'tronweb/dist/TronWeb',
                // Explicitly specify browser variants for sha.js/hash.js chain so inherits works
                'hash.js': 'hash.js/lib/hash.js',
                'sha.js': 'sha.js/sha.js',
                //'process': 'process/browser'
            }
        },
        build: {
            chunkSizeWarningLimit: 1000,
            rollupOptions: {
                external: [],
                output: {
                    manualChunks: {
                        'vendor': ['crypto-js', 'bip39'],
                        'tron': ['tronweb'],
                        'ethereum': ['ethers']
                    }
                }
            }
        },
        optimizeDeps: {
            include: ['buffer', 'util', 'inherits'],
            exclude: ['tiny-secp256k1']
        },
        worker: {
            format: 'es'
        }
    },
    vue: {
        compilerOptions: {
            isCustomElement: (tag) => tag === 'suspense'
        }
    },
    runtimeConfig: {
        public: {
            baseURL: BASE
        }
    },
    experimental: {
        payloadExtraction: false
    }
})
