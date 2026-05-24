// 🔑 CONFIGURACIÓN REAL PARA GITHUB PAGES
const SUPABASE_URL = 'https://sweoveheeayloqvtgjzu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZW92ZWhlZWF5bG9xdnRnanp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODE5NDcsImV4cCI6MjA5MTY1Nzk0N30.y67qfbERRgnMDAxzTSPXJMHQaWWIX96Vha1KoDZZ8IE';

// ✅ Crear el cliente de Supabase
if (typeof supabase !== 'undefined') {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // ✅ Inicializar appState (ESTO ES LO QUE FALTABA)
    window.appState = {
        usuarioActualId: null,
        rolUsuarioActual: null,
        estudiantesActuales: [],
        procesoActual: null,
        trayectoActual: null
    };
    
    console.log('✅ Supabase conectado correctamente');
    console.log('✅ appState inicializado');
} else {
    console.error('❌ Librería de Supabase no cargada');
}
