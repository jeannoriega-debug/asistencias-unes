/**
 * MÓDULO DE AUTENTICACIÓN
 * Maneja login, logout y verificación de sesión
 */

/**
 * Iniciar sesión con email y contraseña
 */
async function iniciarSesion() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        return Swal.fire('Atención', 'Ingresa email y contraseña', 'warning');
    }
    
    // 1. Intentar login con Supabase Auth
    const { data: authData, error: authError } = await window.supabaseClient.auth.signInWithPassword({ 
        email, 
        password 
    });
    
    if (authError) {
        const errEl = document.getElementById('login-error');
        if (errEl) {
            errEl.innerText = "Error: Credenciales inválidas";
            errEl.classList.remove('hidden');
        }
        return;
    }
    
    // 2. Verificar que el usuario exista en perfiles_profesores
    const userId = authData.user.id;
    const { data: perfil, error: perfilError } = await window.supabaseClient
        .from('perfiles_profesores')
        .select('status, rol')
        .eq('id', userId)
        .single();
    
    if (perfilError || !perfil) {
        // No tiene perfil, cerrar sesión
        await window.supabaseClient.auth.signOut();
        const errEl = document.getElementById('login-error');
        if (errEl) {
            errEl.innerText = "Error: Usuario no registrado en el sistema";
            errEl.classList.remove('hidden');
        }
        return;
    }
    
    // 3. Verificar si está activo
    if (perfil.status !== 'Activo') {
        // Cerrar sesión inmediatamente
        await window.supabaseClient.auth.signOut();
        
        const errEl = document.getElementById('login-error');
        if (errEl) {
            errEl.innerText = "⏳ Cuenta pendiente de activación. Contacta al administrador.";
            errEl.classList.remove('hidden');
        }
        return;
    }
    
    // 4. Todo OK - Recargar página
    location.reload();
}

/**
 * Verificar si hay sesión activa al cargar la página
 */
async function verificarSesion() {
    const { data, error } = await window.supabaseClient.auth.getSession();
    
    if (error) {
        console.error('Error verificando sesión:', error);
        return;
    }
    
    const session = data?.session;
    
    if (session) {
        // Ocultar login
        const loginContainer = document.getElementById('login-container');
        if (loginContainer) loginContainer.classList.add('hidden');
        
        // Guardar datos del usuario
        window.appState.usuarioActualId = session.user.id;
        
        // Cargar datos del profesor
        await obtenerDatosProfesor();
        await verificarRolUsuario();
        
        // Inicializar módulos según la página
        if (typeof window.modules?.asistencia?.init === 'function') {
            await window.modules.asistencia.init();
        }
        if (typeof window.modules?.estudiantes?.init === 'function') {
            await window.modules.estudiantes.init();
        }
    }
}

/**
 * Obtener nombre y datos del profesor desde la BD
 */
async function obtenerDatosProfesor() {
    const { data: userData } = await window.supabaseClient.auth.getUser();
    if (!userData?.user) return;
    
    const { data, error } = await window.supabaseClient
        .from('perfiles_profesores')
        .select('nombre, apellido, rol')
        .eq('id', userData.user.id)
        .single();

    if (error) {
        console.error('Error obteniendo perfil:', error);
        return;
    }

    window.appState.nombreProfesorGlobal = data ? `${data.nombre} ${data.apellido}` : userData.user.email;
    
    const nombreEl = document.getElementById('profesor-nombre');
    if (nombreEl) {
        nombreEl.innerText = window.appState.nombreProfesorGlobal.toUpperCase();
    }
}

/**
 * Verificar rol del usuario y mostrar/ocultar elementos según permisos
 */
async function verificarRolUsuario() {
    const { data: userData } = await window.supabaseClient.auth.getUser();
    if (!userData?.user) return;

    const { data, error } = await window.supabaseClient
        .from('perfiles_profesores')
        .select('rol')
        .eq('id', userData.user.id)
        .single();

    if (error) {
        window.appState.rolUsuarioActual = 'profesor';
        return;
    }

    window.appState.rolUsuarioActual = data?.rol || 'profesor';

    // Mostrar elementos de super usuario si corresponde
    if (window.appState.rolUsuarioActual === 'super_usuario') {
        const btnAdmin = document.getElementById('btn-admin');
        const filtroReporte = document.getElementById('filtro-profesor-reporte');
        const filtroContainer = document.getElementById('filtro-reporte-container');
        
        if (btnAdmin) btnAdmin.classList.remove('hidden');
        if (filtroReporte) filtroReporte.classList.remove('hidden');
        if (filtroContainer) filtroContainer.classList.remove('hidden');
        
        // Cargar profesores para filtro de reporte
        if (typeof window.modules?.admin?.cargarProfesoresParaFiltroReporte === 'function') {
            await window.modules.admin.cargarProfesoresParaFiltroReporte();
        }
    }
}

/**
 * Cerrar sesión y recargar página
 */
async function cerrarSesion() {
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) {
        Swal.fire("Error", "No se pudo cerrar la sesión", "error");
    } else {
        Swal.fire({
            title: 'Cerrando sesión...',
            timer: 1000,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        }).then(() => {
            location.reload();
        });
    }
}

// Exportar funciones al scope global para que funcionen los onclick del HTML
window.iniciarSesion = iniciarSesion;
window.verificarSesion = verificarSesion;
window.cerrarSesion = cerrarSesion;

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', verificarSesion);

console.log('✅ Módulo de autenticación cargado');