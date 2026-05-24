/**
 * CONFIGURACIÓN GLOBAL DEL SISTEMA
 */

// ================= SUPABASE =================
const SUPABASE_URL = 'https://sweoveheeayloqvtgjzu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3ZW92ZWhlZWF5bG9xdnRnanp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODE5NDcsImV4cCI6MjA5MTY1Nzk0N30.y67qfbERRgnMDAxzTSPXJMHQaWWIX96Vha1KoDZZ8IE';
const EDGE_FUNCTION_URL = 'https://sweoveheeayloqvtgjzu.supabase.co/functions/v1/crear-profesor';

// Hacerlas globales PARA QUE OTROS ARCHIVOS LAS VEAN
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;

// Crear cliente de Supabase
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= VARIABLES GLOBALES =================
window.appState = {
    usuarioActualId: null,
    rolUsuarioActual: null,
    nombreProfesorGlobal: "",
    estudiantesActuales: [],
    procesoActual: 'I-2026',
    trayectoActual: null,
    tiposTrayectos: [],
    paginaActual: 1,
    POR_PAGINA: 20
};

// ================= UTILIDADES =================
window.utils = {
    formatDate: (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-VE');
    },
    
    getFechaISO: () => {
        const ahora = new Date();
        return new Date(ahora - ahora.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    },
    
    showError: (mensaje) => {
        console.error('❌ Error:', mensaje);
        Swal.fire('Error', mensaje, 'error');
    },
    
    showSuccess: (mensaje) => {
        Swal.fire('Éxito', mensaje, 'success');
    },
    
    clearSelect: (selectId, defaultText = 'Seleccione...') => {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = `<option value="">${defaultText}</option>`;
        return select;
    },
    
    getUniqueValues: (array, key) => {
        if (!array || !key) return [];
        return [...new Set(array.map(item => item[key]).filter(v => v))].sort();
    }
};

console.log('✅ Configuración cargada');
console.log('✅ Supabase conectado:', SUPABASE_URL);
