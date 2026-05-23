/**
 * CONFIGURACIÓN DE SUPABASE
 * ⚠️ ESTE ARCHIVO ES DE EJEMPLO - NO CONTIENE CLAVES REALES
 * 
 * INSTRUCCIONES:
 * 1. Copia este archivo y renómbralo a: config.js
 * 2. Reemplaza los valores con tus credenciales reales de Supabase
 * 3. NUNCA subas config.js a GitHub (está en .gitignore)
 */

const SUPABASE_URL = 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = 'tu_anon_key_aqui';

// Variables globales para que estén disponibles en toda la app
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

console.log('✅ Configuración cargada (modo ejemplo)');