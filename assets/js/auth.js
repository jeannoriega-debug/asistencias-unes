/**
 * MÓDULO DE AUTENTICACIÓN - VERSIÓN FINAL CON BOTÓN ADMIN
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

        console.log('✅ Login exitoso:', window.appState);

        // Redirección
        const rol = perfil.rol.toLowerCase().trim();
        if (rol.includes('disciplina')) {
            window.location.href = 'disciplina.html';
        } else if (rol.includes('inventario')) {
            window.location.href = 'inventario.html';
        } else if (rol.includes('super') || rol.includes('admin')) {
            window.location.href = 'index.html?panel=admin';
        } else if (rol.includes('profesor')) {
            window.location.href = 'asistencia-simple.html';
        } else {
            window.location.href = 'index.html';
        }

    } catch (error) {
        console.error('❌ Error login:', error);
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
            
            console.log('✅ Sesión verificada:', window.appState);
            
            // ⭐ VERIFICAR ROL Y REDIRIGIR SI CORRESPONDE
            await verificarRolUsuario();
            
            // ⭐ AGREGAR: Redirección si está en la página incorrecta
            const rol = perfil.rol.toLowerCase().trim();
            const paginaActual = window.location.pathname.split('/').pop();
            
            console.log(' Página actual:', paginaActual);
            console.log('🎯 Rol:', rol);
            
            // Si es profesor y está en index.html, redirigir a asistencia-simple.html
            if (rol.includes('profesor') && (paginaActual === 'index.html' || paginaActual === '' || paginaActual === '/')) {
                console.log('⚠️ Profesor en página incorrecta, redirigiendo a asistencia-simple.html');
                window.location.href = 'asistencia-simple.html';
                return;
            }
            
            // Si es super_usuario y está en index.html sin panel=admin, redirigir
            if (rol.includes('super') && paginaActual === 'index.html' && !window.location.search.includes('panel=admin')) {
                console.log('⚠️ Super usuario sin panel=admin, redirigiendo');
                window.location.href = 'index.html?panel=admin';
                return;
            }
        }
        
    } catch (e) {
        console.error('❌ Error verificando sesión:', e);
    }
}


// ⭐ NUEVA FUNCIÓN: Verificar rol y mostrar elementos según permisos
async function verificarRolUsuario() {
    try {
        const rol = window.appState?.rolUsuarioActual || '';
        console.log('🔍 Verificando rol:', rol);

        // Mostrar elementos de super usuario
        if (rol === 'super_usuario' || rol.toLowerCase().includes('super')) {
            console.log('🔧 Usuario es super_usuario, mostrando elementos de admin...');
            
            const btnAdmin = document.getElementById('btn-admin');
            if (btnAdmin) {
                btnAdmin.classList.remove('hidden');
                console.log('✅ Botón admin mostrado');
            } else {
                console.warn('⚠️ Botón admin NO encontrado en el DOM. Buscando...');
                // Buscar en todo el documento
                const todosLosBotones = document.querySelectorAll('button, a, div');
                todosLosBotones.forEach((el, index) => {
                    if (el.id && el.id.toLowerCase().includes('admin')) {
                        console.log(`🔍 Encontrado elemento con ID: ${el.id}`, el);
                    }
                });
            }
            
            // Mostrar otros elementos de admin si existen
            const filtroReporte = document.getElementById('filtro-profesor-reporte');
            const filtroContainer = document.getElementById('filtro-reporte-container');
            
            if (filtroReporte) filtroReporte.classList.remove('hidden');
            if (filtroContainer) filtroContainer.classList.remove('hidden');
            
            // Cargar profesores para filtro de reporte si el módulo existe
            if (typeof window.modules?.admin?.cargarProfesoresParaFiltroReporte === 'function') {
                await window.modules.admin.cargarProfesoresParaFiltroReporte();
            }
        } else {
            console.log('ℹ️ Usuario NO es super_usuario. Rol:', rol);
        }
        
    } catch (e) {
        console.error('❌ Error en verificarRolUsuario:', e);
    }
}

async function cerrarSesion() {
    await window.supabaseClient.auth.signOut();
    window.appState = {};
    location.reload();
}

window.iniciarSesion = iniciarSesion;
window.verificarSesion = verificarSesion;
window.verificarRolUsuario = verificarRolUsuario;
window.cerrarSesion = cerrarSesion;

// Ejecutar al cargar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarSesion);
} else {
    verificarSesion();
}

console.log('✅ auth.js cargado');
