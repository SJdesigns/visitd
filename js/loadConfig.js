/**
 * loadConfig.js
 * Carga las variables de Supabase de forma inteligente:
 * - Primero intenta /api/config (Vercel)
 * - Si falla, intenta config.php (Apache)
 * - Si todo falla, usa valores por defecto
 */

let supabaseUrl = '';
let supabaseKey = '';
let configReady = false;

/**
 * Carga la configuración de Supabase desde /api/config (Vercel)
 */
async function loadFromApi() {
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            supabaseUrl = config.supabaseUrl;
            supabaseKey = config.supabaseKey;
            console.log('✓ Configuración cargada desde /api/config (Vercel)');
            return true;
        }
    } catch (error) {
        // No es error crítico, intentaremos PHP después
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
            // El PHP devuelve JavaScript que define supabaseUrl y supabaseKey
            eval(text);
            console.log('✓ Configuración cargada desde config.php (Apache)');
            return true;
        }
    } catch (error) {
        console.log('⚠ No se pudo cargar config.php:', error.message);
    }
    return false;
}

/**
 * Carga la configuración de Supabase
 * Intenta primero la API (Vercel), luego PHP (Apache)
 */
async function loadConfig() {
    try {
        // Intentar primero desde /api/config (Vercel)
        let loaded = await loadFromApi();
        
        // Si falla, intentar desde config.php (Apache)
        if (!loaded) {
            loaded = await loadFromPhp();
        }
        
        // Si todo falla, usar valores por defecto
        if (!loaded) {
            console.warn('⚠ Usando valores de configuración por defecto');
            supabaseUrl = 'https://szqwuzyycuicmxfkyqbm.supabase.co/';
            supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cXd1enl5Y3VpY214Zmt5cWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYzMTQ2NjYsImV4cCI6MjA0MTg5MDY2Nn0.B7aQV38LH6oH_CQsqRhqfxOVXXwqCQsrZu9b8ajKoRA';
        }
        
        configReady = true;
        return { supabaseUrl, supabaseKey };
    } catch (error) {
        console.error('Error crítico al cargar configuración:', error);
        configReady = true;
        return { supabaseUrl, supabaseKey };
    }
}

// Iniciar la carga cuando el documento esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
} else {
    // Si el document ya está cargado, ejecutar inmediatamente
    loadConfig();
}
