// 🔑 CONFIGURACIÓN REAL PARA GITHUB PAGES
// La clave 'anon' es segura de exponer gracias a las políticas RLS de Supabase
const SUPABASE_URL = 'https://sweoveheeayloqvtgjzu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZW92ZWhlZWF5bG9xdnRnanp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODE5NDcsImV4cCI6MjA5MTY1Nzk0N30.y67qfbERRgnMDAxzTSPXJMHQaWWIX96Vha1KoDZZ8IE';

// Hacerlas globales para que los módulos las lean
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

console.log('✅ Supabase conectado');
