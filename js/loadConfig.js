/**
 * loadConfig.js
 * Carga las variables de Supabase de forma inteligente:
 * - Primero intenta /api/config (Vercel)
 * - Si falla, intenta config.php (Apache)
 * - Si todo falla, usa valores por defecto
 */

// IMPORTANTE: Declarar como variables globales (window) para que estén disponibles en todo el documento
var supabaseUrl = '';
var supabaseKey = '';
var configReady = false;
var configPromise = null;

/**
 * Carga la configuración de Supabase desde /api/config (Vercel)
 */
async function loadFromApi() {
    try {
        const response = await fetch('./api/config');
        if (response.ok) {
            const config = await response.json();
            console.log('✓ /api/config respondió correctamente');
            // Asignar a variables globales (window)
            window.supabaseUrl = config.supabaseUrl;
            window.supabaseKey = config.supabaseKey;
            supabaseUrl = config.supabaseUrl;
            supabaseKey = config.supabaseKey;
            console.log('✓ Variables de Supabase asignadas desde /api/config');
            return true;
        }
    } catch (error) {
        console.log('⚠ /api/config no disponible:', error.message);
    }
    return false;
}

/**
 * Carga la configuración de Supabase desde config.php (Apache)
 */
async function loadFromPhp() {
    try {
        const response = await fetch('js/config.php');
        if (response.ok) {
            const text = await response.text();
            // Verificar que no es un error HTML de Vercel
            if (text.startsWith('<')) {
                console.log('⚠ config.php no disponible (html devuelto)');
                return false;
            }
            console.log('✓ config.php respondió correctamente');
            // El PHP devuelve JavaScript que define window.supabaseUrl y window.supabaseKey globalmente
            eval(text);
            // Copiar desde window a las variables locales también
            supabaseUrl = window.supabaseUrl;
            supabaseKey = window.supabaseKey;
            console.log('✓ Variables de Supabase asignadas desde config.php');
            console.log('  - supabaseUrl:', !!window.supabaseUrl);
            console.log('  - supabaseKey:', !!window.supabaseKey);
            return true;
        }
    } catch (error) {
        console.log('⚠ config.php no disponible:', error.message);
    }
    return false;
}

/**
 * Carga la configuración de Supabase
 * Intenta primero la API (Vercel), luego PHP (Apache)
 * Retorna una promesa que se resuelve cuando está completada
 */
async function loadConfig() {
    console.log('📡 Iniciando carga de configuración de Supabase...');
    try {
        // Intentar primero desde /api/config (Vercel/Apache)
        let loaded = await loadFromApi();
        
        // Si falla, intentar desde config.php (Apache)
        if (!loaded) {
            console.log('📡 Intentando config.php...');
            loaded = await loadFromPhp();
        }
        
        // Si todo falla, usar valores por defecto
        if (!loaded) {
            console.warn('⚠ Usando valores de configuración por defecto');
            window.supabaseUrl = 'https://szqwuzyycuicmxfkyqbm.supabase.co/';
            window.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cXd1enl5Y3VpY214Zmt5cWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYzMTQ2NjYsImV4cCI6MjA0MTg5MDY2Nn0.B7aQV38LH6oH_CQsqRhqfxOVXXwqCQsrZu9b8ajKoRA';
            supabaseUrl = window.supabaseUrl;
            supabaseKey = window.supabaseKey;
        }
        
        window.configReady = true;
        configReady = true;
        console.log('✅ Configuración completada. supabaseUrl:', !!window.supabaseUrl, 'supabaseKey:', !!window.supabaseKey);
        return true;
    } catch (error) {
        console.error('❌ Error al cargar configuración:', error);
        // Usar valores por defecto en caso de error
        window.supabaseUrl = 'https://szqwuzyycuicmxfkyqbm.supabase.co/';
        window.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cXd1enl5Y3VpY214Zmt5cWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYzMTQ2NjYsImV4cCI6MjA0MTg5MDY2Nn0.B7aQV38LH6oH_CQsqRhqfxOVXXwqCQsrZu9b8ajKoRA';
        supabaseUrl = window.supabaseUrl;
        supabaseKey = window.supabaseKey;
        window.configReady = true;
        configReady = true;
        return false;
    }
}

/**
 * Espera a que la configuración esté lista
 */
function waitForConfigReady() {
    return new Promise((resolve) => {
        if (window.configReady) {
            resolve();
            return;
        }
        
        const checkInterval = setInterval(() => {
            if (window.configReady) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 50);
        
        // Timeout de 5 segundos
        setTimeout(() => {
            clearInterval(checkInterval);
            console.warn('⚠ Timeout esperando configuración');
            resolve();
        }, 5000);
    });
}

// Crear promesa global que se resuelve cuando la configuración está lista
// Esta promesa se inicia INMEDIATAMENTE cuando este script se carga
console.log('🔧 Configurando promesa global de Supabase...');
window.configPromise = loadConfig();
window.configPromise.then(() => {
    console.log('✅ Configuración lista para usar');
}).catch((error) => {
    console.error('❌ Error en la promesa global:', error);
});

