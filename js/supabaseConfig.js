/**
 * supabaseConfig.js
 * Carga las variables de Supabase desde:
 * - Desarrollo (Apache): js/config.php (lee del archivo .env)
 * - Vercel: /api/config (función serverless Node.js)
 */

// Variables globales que estarán disponibles en toda la aplicación
let supabaseUrl;
let supabaseKey;

/**
 * Carga las variables de configuración de Supabase
 * En desarrollo: usa js/config.php (requiere PHP)
 * En Vercel: usa /api/config (función serverless)
 */
async function loadSupabaseConfig() {
    try {
        let config = null;

        // Determinar si estamos en desarrollo o producción
        const isDevelopment = window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';

        if (isDevelopment) {
            // En desarrollo, cargar desde PHP
            try {
                const response = await fetch('js/config.php');
                if (response.ok) {
                    const text = await response.text();
                    // El PHP devuelve JavaScript que define supabaseUrl y supabaseKey globalmente
                    // Por eso ejecutamos el código
                    eval(text);
                    console.log('Configuración de Supabase cargada desde PHP (desarrollo)');
                    return;
                } else {
                    throw new Error('No se pudo cargar config.php');
                }
            } catch (error) {
                console.warn('No se pudo cargar config.php:', error);
                console.warn('Intentando desde /api/config (Vercel)...');
            }
        }

        // Si no está en desarrollo O el PHP falló, intentar desde la API
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                config = await response.json();
                supabaseUrl = config.supabaseUrl;
                supabaseKey = config.supabaseKey;
                console.log('Configuración de Supabase cargada desde /api/config (Vercel)');
                return;
            } else {
                throw new Error('No se pudo cargar /api/config');
            }
        } catch (error) {
            console.error('No se pudo cargar desde /api/config:', error);
        }

        // Si todo falla, usar valores por defecto (emergencia)
        console.warn('Usando valores de configuración por defecto');
        supabaseUrl = 'https://szqwuzyycuicmxfkyqbm.supabase.co/';
        supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cXd1enl5Y3VpY214Zmt5cWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYzMTQ2NjYsImV4cCI6MjA0MTg5MDY2Nn0.B7aQV38LH6oH_CQsqRhqfxOVXXwqCQsrZu9b8ajKoRA';

    } catch (error) {
        console.error('Error crítico al cargar configuración de Supabase:', error);
    }
}

// Cargar configuración al ejecutar este script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSupabaseConfig);
} else {
    loadSupabaseConfig();
}
