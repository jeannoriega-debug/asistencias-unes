/**
 * MÓDULO DE AUTENTICACIÓN - VERSIÓN COMPLETA
 * Maneja login, logout, verificación de sesión y permisos
 */

/**
 * Iniciar sesión con email y contraseña
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

        console.log('✅ Login exitoso:', {
            email,
            rol: perfil.rol,
            nombre: window.appState.nombreProfesorGlobal
        });

        // Redirección según rol
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

/**
 * Verificar si hay sesión activa al cargar la página
 */
async function verificarSesion() {
    try {
        const { data, error } = await window.supabaseClient.auth.getSession();
        
        if (error || !data?.session) {
            return; // No hay sesión, no hacer nada
        }
        
        const session = data.session;
        
        // Ocultar login
        const loginContainer = document.getElementById('login-container');
        if (loginContainer) loginContainer.classList.add('hidden');
        
        // Guardar datos del usuario
        window.appState = window.appState || {};
        window.appState.usuarioActualId = session.user.id;
        
        // Cargar datos del profesor
        const { data: perfilData, error: perfilError } = await window.supabaseClient
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
            
            console.log('✅ Sesión verificada:', {
                nombre: window.appState.nombreProfesorGlobal,
                rol: window.appState.rolUsuarioActual
            });
        }
        
        // ⚠️ IMPORTANTE: Verificar rol y mostrar elementos según permisos
        await verificarRolUsuario();
        
        // Inicializar módulos según la página
        if (typeof window.modules?.asistencia?.init === 'function') {
            await window.modules.asistencia.init();
        }
        if (typeof window.modules?.estudiantes?.init === 'function') {
            await window.modules.estudiantes.init();
        }
        
    } catch (e) {
        console.error('Error verificando sesión:', e);
    }
}

/**
 * Verificar rol del usuario y mostrar/ocultar elementos según permisos
 */
async function verificarRolUsuario() {
    try {
        const { data: userData } = await window.supabaseClient.auth.getUser();
        if (!userData?.user) return;

        const { data, error } = await window.supabaseClient
            .from('perfiles_profesores')
            .select('rol')
            .eq('id', userData.user.id)
            .single();

        if (error) {
            console.error('Error obteniendo rol:', error);
            window.appState.rolUsuarioActual = 'profesor';
            return;
        }

        window.appState.rolUsuarioActual = data?.rol || 'profesor';
        console.log('✅ Rol del usuario:', window.appState.rolUsuarioActual);

        // Mostrar elementos de super usuario
        if (window.appState.rolUsuarioActual === 'super_usuario') {
            console.log('🔧 Mostrando elementos de admin...');
            
            const btnAdmin = document.getElementById('btn-admin');
            const filtroReporte = document.getElementById('filtro-profesor-reporte');
            const filtroContainer = document.getElementById('filtro-reporte-container');
            
            if (btnAdmin) {
                btnAdmin.classList.remove('hidden');
                console.log('✅ Botón admin mostrado');
            } else {
                console.warn('⚠️ Botón admin no encontrado en el DOM');
            }
            
            if (filtroReporte) filtroReporte.classList.remove('hidden');
            if (filtroContainer) filtroContainer.classList.remove('hidden');
            
            // Cargar profesores para filtro de reporte
            if (typeof window.modules?.admin?.cargarProfesoresParaFiltroReporte === 'function') {
                await window.modules.admin.cargarProfesoresParaFiltroReporte();
            }
        }
        
    } catch (e) {
        console.error('Error en verificarRolUsuario:', e);
    }
}

/**
 * Cerrar sesión y recargar página
 */
async function cerrarSesion() {
    try {
        await window.supabaseClient.auth.signOut();
        window.appState = {};
        location.reload();
    } catch (e) {
        console.error('Error cerrando sesión:', e);
        Swal.fire('Error', 'No se pudo cerrar la sesión', 'error');
    }
}

// Exportar funciones al scope global
window.iniciarSesion = iniciarSesion;
window.verificarSesion = verificarSesion;
window.verificarRolUsuario = verificarRolUsuario;
window.cerrarSesion = cerrarSesion;

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', verificarSesion);

console.log('✅ Módulo de autenticación cargado');
