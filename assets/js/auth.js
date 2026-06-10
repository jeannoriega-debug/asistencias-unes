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
        console.log('🔑 Intentando login con:', email);

        const { data: authData, error: authError } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            console.error('❌ Error de autenticación:', authError);
            throw authError;
        }
        
        if (!authData.user) throw new Error('Usuario no encontrado');

        console.log('✅ Autenticación exitosa, buscando perfil...');

        const { data: perfil, error: perfilError } = await window.supabaseClient
            .from('perfiles_profesores')
            .select('rol, status, nombre, apellido')
            .eq('id', authData.user.id)
            .single();

        if (perfilError || !perfil) {
            console.error('❌ Error obteniendo perfil:', perfilError);
            await window.supabaseClient.auth.signOut();
            throw new Error('Perfil no encontrado');
        }

        console.log('✅ Perfil encontrado:', perfil);

        if (perfil.status !== 'Activo') {
            await window.supabaseClient.auth.signOut();
            Swal.fire('Acceso denegado', 'Su cuenta no está activada', 'error');
            return;
        }

        window.appState = window.appState || {};
        window.appState.usuarioActualId = authData.user.id;
        window.appState.rolUsuarioActual = perfil.rol;
        window.appState.nombreProfesorGlobal = `${perfil.nombre} ${perfil.apellido}`.trim();

        console.log('📋 AppState configurado:', window.appState);

        // Redirección según rol
        const rol = perfil.rol.toLowerCase().trim();
        console.log('🎯 Rol normalizado:', rol);

        if (rol.includes('disciplina')) {
            console.log('➡️ Redirigiendo a: disciplina.html');
            window.location.href = 'disciplina.html';
        } else if (rol.includes('inventario')) {
            console.log('➡️ Redirigiendo a: inventario.html');
            window.location.href = 'inventario.html';
        } else if (rol.includes('super') || rol.includes('admin')) {
            console.log('➡️ Redirigiendo a: index.html?panel=admin');
            window.location.href = 'index.html?panel=admin';
        } else if (rol.includes('profesor')) {
            console.log('➡️ Redirigiendo a: asistencia-simple.html');
            window.location.href = 'asistencia-simple.html';
        } else {
            console.log('➡️ Redirigiendo a: index.html (rol desconocido)');
            window.location.href = 'index.html';
        }

    } catch (error) {
        console.error('❌ Error en iniciarSesion:', error);
        Swal.fire('Error', error.message || 'No se pudo iniciar sesión', 'error');
    }
}

async function verificarSesion() {
    try {
        const { data, error } = await window.supabaseClient.auth.getSession();
        const session = data?.session;
        
        if (!session) {
            console.log('⚠️ No hay sesión activa');
            return;
        }
        
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
            
            console.log('✅ Sesión verificada:', window.appState);
        }
        
    } catch (e) {
        console.error('❌ Error verificando sesión:', e);
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

document.addEventListener('DOMContentLoaded', verificarSesion);

console.log('✅ auth.js cargado');
