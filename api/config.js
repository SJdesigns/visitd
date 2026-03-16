// api/config.js
// Esta función devuelve las variables de configuración desde las variables de entorno de Vercel

export default function handler(req, res) {
    // Headers CORS para permitir acceso desde tu dominio
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Obtener las variables de entorno
    const config = {
        supabaseUrl: process.env.VITE_SUPABASE_URL,
        supabaseKey: process.env.VITE_SUPABASE_ANON_KEY
    };

    // Validar que existan
    if (!config.supabaseUrl || !config.supabaseKey) {
        return res.status(500).json({ 
            error: 'Variables de Supabase no configuradas en Vercel' 
        });
    }

    res.status(200).json(config);
}
