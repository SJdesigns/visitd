/**
 * loadConfig.js
 * Carga las variables de Supabase según el ambiente:
 * - Desarrollo (Apache/localhost): lee del config.php
 * - Producción (Vercel): lee de /api/config
 */

let supabaseUrl = '';
let supabaseKey = '';
let configReady = false;

/**
 * Carga la configuración de Supabase
 * Retorna una promesa que se resuelve cuando está lista
 */
async function loadConfig() {
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';

    try {
        if (isDevelopment) {
            // En desarrollo: intenta cargar desde config.php
            console.log('Ambiente: Desarrollo (Apache)');
            const response = await fetch('js/config.php');
            if (response.ok) {
                const text = await response.text();
                // El PHP devuelve JavaScript que define supabaseUrl y supabaseKey
                // Ejecutar ese código para definir las variables globales
                eval(text);
                console.log('Configuración cargada desde config.php');
                configReady = true;
                return { supabaseUrl, supabaseKey };
            }
        } else {
            // En producción: intenta cargar desde /api/config
            console.log('Ambiente: Producción (Vercel)');
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                supabaseUrl = config.supabaseUrl;
                supabaseKey = config.supabaseKey;
                console.log('Configuración cargada desde /api/config');
                configReady = true;
                return config;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Error al cargar configuración');
            }
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
        
        // Fallback: usar valores por defecto
        console.warn('Usando valores por defecto');
        supabaseUrl = 'https://szqwuzyycuicmxfkyqbm.supabase.co/';
        supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cXd1enl5Y3VpY214Zmt5cWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYzMTQ2NjYsImV4cCI6MjA0MTg5MDY2Nn0.B7aQV38LH6oH_CQsqRhqfxOVXXwqCQsrZu9b8ajKoRA';
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
