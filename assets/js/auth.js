/**
 * MÓDULO DE AUTENTICACIÓN - VERSIÓN CORREGIDA
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

        if (authError) {
            console.error('Error auth:', authError);
            throw authError;
        }
        
        if (!authData.user) throw new Error('Usuario no encontrado');

        const { data: perfil, error: perfilError } = await window.supabaseClient
            .from('perfiles_profesores')
            .select('rol, status, nombre, apellido')
            .eq('id', authData.user.id)
            .single();

        if (perfilError || !perfil) {
            await window.supabaseClient.auth.signOut();
            throw new Error('Perfil no encontrado');
        }

        if (perfil.status !== 'Activo') {
            await window.supabaseClient.auth.signOut();
            Swal.fire('Acceso denegado', 'Su cuenta no está activada', 'error');
            return;
        }

        window.appState = window.appState || {};
        window.appState.usuarioActualId = authData.user.id;
        window.appState.rolUsuarioActual = perfil.rol;
        window.appState.nombreProfesorGlobal = `${perfil.nombre} ${perfil.apellido}`.trim();

        // Redirección
        if (perfil.rol === 'disciplina_admin') {
            window.location.href = 'disciplina.html';
        } else if (perfil.rol === 'inventario_admin') {
            window.location.href = 'inventario.html';
        } else if (perfil.rol === 'super_usuario') {
            window.location.href = 'index.html?panel=admin';
        } else if (perfil.rol === 'profesor') {
            window.location.href = 'asistencia-simple.html';
        } else {
            window.location.href = 'index.html';
        }

    } catch (error) {
        console.error('Error login:', error);
        Swal.fire('Error', error.message || 'No se pudo iniciar sesión', 'error');
    }
}

async function verificarSesion() {
    try {
        const { data, error } = await window.supabaseClient.auth.getSession();
        
        if (error || !data?.session) {
            return; // No hay sesión, no hacer nada
        }
        
        const session = data.session;
        
        const loginContainer = document.getElementById('login-container');
        if (loginContainer) loginContainer.classList.add('hidden');
        
        window.appState = window.appState || {};
        window.appState.usuarioActualId = session.user.id;
        
        const { data: perfilData } = await window.supabaseClient
            .from('perfiles_profesores')
            .select('nombre, apellido, rol')
            .eq('id', session.user.id)
            .single();

        if (perfilData) {
            window.appState.nombreProfesorGlobal = `${perfilData.nombre} ${perfilData.apellido}`.trim();
            window.appState.rolUsuarioActual = perfilData.rol;
            
            const nombreEl = document.getElementById('profesor-nombre');
            if (nombreEl) {
                nombreEl.innerText = window.appState.nombreProfesorGlobal.toUpperCase();
            }
        }
        
    } catch (e) {
        console.error('Error verificando sesión:', e);
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

// SOLO verificar sesión al cargar, NO refrescar token
document.addEventListener('DOMContentLoaded', verificarSesion);

console.log('✅ Módulo de autenticación cargado');
