<?php
header('Content-Type: application/javascript; charset=utf-8');

// Leer archivo .env y convertir a variables JavaScript
$envFile = __DIR__ . '/../.env';
$supabaseUrl = '';
$supabaseKey = '';

if (file_exists($envFile)) {
    $envContent = file_get_contents($envFile);
    $lines = explode("\n", $envContent);
    
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        
        $parts = explode('=', $line, 2);
        if (count($parts) === 2) {
            $key = trim($parts[0]);
            $value = trim($parts[1]);
            
            if ($key === 'VITE_SUPABASE_URL') {
                $supabaseUrl = $value;
            } elseif ($key === 'VITE_SUPABASE_ANON_KEY') {
                $supabaseKey = $value;
            }
        }
    }
}

// Si no se cargó, usar valores por defecto
if (empty($supabaseUrl)) {
    $supabaseUrl = 'https://szqwuzyycuicmxfkyqbm.supabase.co/';
}
if (empty($supabaseKey)) {
    $supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cXd1enl5Y3VpY214Zmt5cWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYzMTQ2NjYsImV4cCI6MjA0MTg5MDY2Nn0.B7aQV38LH6oH_CQsqRhqfxOVXXwqCQsrZu9b8ajKoRA';
}

// Generar JavaScript que define las variables globales en window
window.supabaseUrl = '<?php echo addslashes($supabaseUrl); ?>';
window.supabaseKey = '<?php echo addslashes($supabaseKey); ?>';

