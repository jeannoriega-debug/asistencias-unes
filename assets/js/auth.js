/**
 * MÓDULO DE AUTENTICACIÓN - VERSIÓN SIMPLE
 */

async function iniciarSesion() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!email || !password) {
        Swal.fire('Atención', 'Ingrese correo y contraseña', 'warning');
        return;
    }

    try {
        const { data: authData, error: authError } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Usuario no encontrado');

        const { data: perfil, error: perfilError } = await window.supabaseClient
            .from('perfiles_profesores')
            .select('rol, status, nombre, apellido')
            .eq('id', authData.user.id)
            .single();

        if (perfilError || !perfil) throw new Error('Perfil no encontrado');
        if (perfil.status !== 'Activo') {
            Swal.fire('Acceso denegado', 'Su cuenta no está activada', 'error');
            return;
        }

        window.appState = {
            usuarioActualId: authData.user.id,
            rolUsuarioActual: perfil.rol,
            nombreProfesorGlobal: `${perfil.nombre} ${perfil.apellido}`.trim()
        };

        // Redirección
        if (perfil.rol === 'disciplina_admin') window.location.href = 'disciplina.html';
        else if (perfil.rol === 'inventario_admin') window.location.href = 'inventario.html';
        else if (perfil.rol === 'super_usuario') window.location.href = 'index.html?panel=admin';
        else if (perfil.rol === 'profesor') window.location.href = 'asistencia-simple.html';
        else window.location.href = 'index.html';

    } catch (error) {
        console.error('Error login:', error);
        Swal.fire('Error', error.message || 'No se pudo iniciar sesión', 'error');
    }
}

async function verificarSesion() {
    try {
        const { data } = await window.supabaseClient.auth.getSession();
        const session = data?.session;
        
        if (!session) return;
        
        const loginContainer = document.getElementById('login-container');
        if (loginContainer) loginContainer.classList.add('hidden');
        
        const { data: perfil } = await window.supabaseClient
            .from('perfiles_profesores')
            .select('nombre, apellido, rol')
            .eq('id', session.user.id)
            .single();

        if (perfil) {
            window.appState = {
                usuarioActualId: session.user.id,
                rolUsuarioActual: perfil.rol,
                nombreProfesorGlobal: `${perfil.nombre} ${perfil.apellido}`.trim()
            };
            
            const nombreEl = document.getElementById('profesor-nombre');
            if (nombreEl) nombreEl.innerText = window.appState.nombreProfesorGlobal.toUpperCase();
            
            // Mostrar botón admin si es super_usuario
            if (perfil.rol === 'super_usuario') {
                const btnAdmin = document.getElementById('btn-admin');
                if (btnAdmin) btnAdmin.classList.remove('hidden');
            }
            
            // ⭐ NUEVO: Redirigir según el rol si está en página incorrecta
            const paginaActual = window.location.pathname.split('/').pop() || 'index.html';
            const esIndex = paginaActual === 'index.html' || paginaActual === '';
            
            // Si es PROFESOR y está en index.html → redirigir a asistencia
            if (perfil.rol === 'profesor' && esIndex) {
                console.log('🎓 Profesor detectado en index, redirigiendo a asistencia-simple.html');
                window.location.href = 'asistencia-simple.html';
                return;
            }
            
            // Si es DISCIPLINA y está en index.html → redirigir
            if (perfil.rol === 'disciplina_admin' && esIndex) {
                console.log('🛡️ Disciplina detectado en index, redirigiendo a disciplina.html');
                window.location.href = 'disciplina.html';
                return;
            }
            
            // Si es INVENTARIO y está en index.html → redirigir
            if (perfil.rol === 'inventario_admin' && esIndex) {
                console.log('📦 Inventario detectado en index, redirigiendo a inventario.html');
                window.location.href = 'inventario.html';
                return;
            }
        }
    } catch (e) {
        console.error('Error en verificarSesion:', e);
    }
}


async function cerrarSesion() {
    await window.supabaseClient.auth.signOut();
    window.appState = {};
    location.reload();
}

window.iniciarSesion = iniciarSesion;
window.verificarSesion = verificarSesion;
window.cerrarSesion = cerrarSesion;

// Ejecutar sin bloquear
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarSesion);
} else {
    verificarSesion();
}

console.log('✅ auth.js cargado');
