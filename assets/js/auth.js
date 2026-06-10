/**
 * MÓDULO DE AUTENTICACIÓN - VERSIÓN PANEL
 * Todos los usuarios van al dashboard principal
 */

async function iniciarSesion() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    if (!email || !password) {
        Swal.fire('Atención', 'Ingrese correo y contraseña', 'warning');
        return;
    }

    try {
        console.log(' Intentando login con:', email);

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

        window.appState = {
            usuarioActualId: authData.user.id,
            rolUsuarioActual: perfil.rol,
            nombreProfesorGlobal: `${perfil.nombre} ${perfil.apellido}`.trim()
        };

        console.log('📋 AppState configurado:', window.appState);
        console.log('🎯 Rol:', perfil.rol);

        // ⭐ REDIRECCIÓN AL PANEL (todos los usuarios)
        console.log('➡️ Redirigiendo a panel.html');
        window.location.href = 'panel.html';

    } catch (error) {
        console.error('❌ Error en iniciarSesion:', error);
        Swal.fire('Error', error.message || 'No se pudo iniciar sesión', 'error');
    }
}

async function verificarSesion() {
    try {
        const { data } = await window.supabaseClient.auth.getSession();
        const session = data?.session;
        
        if (!session) {
            console.log('⚠️ No hay sesión activa');
            return;
        }
        
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
            
            console.log('✅ Sesión verificada - Rol:', perfil.rol);
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

// Ejecutar al cargar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarSesion);
} else {
    verificarSesion();
}

console.log('✅ auth.js cargado (versión Panel)');
