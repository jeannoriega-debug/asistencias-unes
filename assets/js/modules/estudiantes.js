/**
 * MÓDULO DE GESTIÓN DE ESTUDIANTES
 * CRUD completo, filtros, paginación y carga masiva
 */

window.modules = window.modules || {};
window.modules.estudiantes = {};

// Variables del módulo
let estudiantes = [];
let pnfs = [];
let totalEstudiantes = 0;

/**
 * Inicializar módulo de estudiantes
 */
window.modules.estudiantes.init = async function() {
    // Solo ejecutar si estamos en gestión de estudiantes
    if (!document.getElementById('tabla-estudiantes')) return;
    
    await cargarPNFs();
    await cargarEstudiantes();
    
    // Event listeners
    const btnFiltrar = document.querySelector('button[onclick="aplicarFiltros()"]');
    const btnLimpiar = document.querySelector('button[onclick="limpiarFiltros()"]');
    const btnExportar = document.querySelector('button[onclick="exportarExcel()"]');
    const btnNuevo = document.querySelector('button[onclick="abrirModalCrear()"]');
    const busquedaInput = document.getElementById('busqueda-texto');
    
    if (btnFiltrar) btnFiltrar.onclick = window.modules.estudiantes.aplicarFiltros;
    if (btnLimpiar) btnLimpiar.onclick = window.modules.estudiantes.limpiarFiltros;
    if (btnExportar) btnExportar.onclick = window.modules.estudiantes.exportarExcel;
    if (btnNuevo) btnNuevo.onclick = window.modules.estudiantes.abrirModalCrear;
    if (busquedaInput) busquedaInput.onkeyup = (e) => window.modules.estudiantes.buscarEnTiempoReal(e);
    
    console.log('✅ Módulo de estudiantes inicializado');
};

/**
 * Cargar PNFs disponibles
 */
async function cargarPNFs() {
    const { data } = await window.supabaseClient.from('pnf').select('id, nombre').order('nombre');
    pnfs = data || [];
    
    // Llenar select de filtro
    const selectPnf = document.getElementById('filtro-pnf');
    if (selectPnf) {
        selectPnf.innerHTML = '<option value="">Todos los PNF</option>';
        pnfs.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.nombre;
            selectPnf.appendChild(opt);
        });
    }
}

/**
 * Cargar estudiantes con filtros
 */
async function cargarEstudiantes() {
    const tbody = document.getElementById('tabla-estudiantes');
    if (tbody) tbody.innerHTML = '<tr><td colspan="13" class="p-8 text-center">Cargando...</td></tr>';

    const filtros = window.modules.estudiantes.filtros || {};
    
    let query = window.supabaseClient.from('estudiantes').select(`
        *,
        pnf:pnf_id(nombre),
        tipos_trayecto:trayecto_id(nombre)
    `, { count: 'exact' });

    // Aplicar filtros
    if (filtros.pnf) query = query.eq('pnf_id', filtros.pnf);
    if (filtros.categoria) query = query.eq('categoria', filtros.categoria);
    if (filtros.proceso) query = query.eq('proceso', filtros.proceso);
    if (filtros.trayecto) query = query.eq('trayecto_id', filtros.trayecto);
    if (filtros.ambiente) query = query.eq('ambiente', filtros.ambiente);
    if (filtros.genero) query = query.eq('genero', filtros.genero);
    if (filtros.status) query = query.eq('status', filtros.status);
    if (filtros.busqueda) {
        query = query.or(`cedula.ilike.%${filtros.busqueda}%,nombres.ilike.%${filtros.busqueda}%,apellidos.ilike.%${filtros.busqueda}%`);
    }

    const { data, error, count } = await query.order('apellidos, nombres');

    if (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudieron cargar los estudiantes', 'error');
        return;
    }

    estudiantes = data || [];
    totalEstudiantes = count || 0;
    
    window.components?.tablas?.renderizarTablaEstudiantes?.();
    window.components?.tablas?.actualizarPaginacion?.();
    window.components?.tablas?.actualizarContador?.();
}

/**
 * Aplicar filtros
 */
window.modules.estudiantes.aplicarFiltros = function() {
    window.modules.estudiantes.filtros = {
        pnf: document.getElementById('filtro-pnf')?.value || '',
        categoria: document.getElementById('filtro-categoria')?.value || '',
        proceso: document.getElementById('filtro-proceso')?.value || '',
        trayecto: document.getElementById('filtro-trayecto')?.value || '',
        ambiente: document.getElementById('filtro-ambiente')?.value || '',
        genero: document.getElementById('filtro-genero')?.value || '',
        status: document.getElementById('filtro-status')?.value || '',
        busqueda: window.modules.estudiantes.filtros?.busqueda || ''
    };
    window.appState.paginaActual = 1;
    cargarEstudiantes();
};

/**
 * Limpiar filtros
 */
window.modules.estudiantes.limpiarFiltros = function() {
    document.getElementById('filtro-pnf')?.value = '';
    document.getElementById('filtro-categoria')?.value = '';
    document.getElementById('filtro-proceso')?.value = '';
    document.getElementById('filtro-trayecto')?.value = '';
    document.getElementById('filtro-ambiente')?.value = '';
    document.getElementById('filtro-genero')?.value = '';
    document.getElementById('filtro-status')?.value = '';
    const busquedaInput = document.getElementById('busqueda-texto');
    if (busquedaInput) busquedaInput.value = '';
    
    window.modules.estudiantes.filtros = { pnf: '', categoria: '', proceso: '', trayecto: '', ambiente: '', genero: '', status: '', busqueda: '' };
    window.appState.paginaActual = 1;
    cargarEstudiantes();
};

/**
 * Búsqueda en tiempo real
 */
window.modules.estudiantes.buscarEnTiempoReal = function(e) {
    window.modules.estudiantes.filtros = window.modules.estudiantes.filtros || {};
    window.modules.estudiantes.filtros.busqueda = e.target.value.trim().toLowerCase();
    window.appState.paginaActual = 1;
    cargarEstudiantes();
};

/**
 * Abrir modal para crear estudiante
 */
window.modules.estudiantes.abrirModalCrear = async function() {
    Swal.fire('Info', 'Modal de creación - Implementar formulario completo', 'info');
};

/**
 * Editar estudiante
 */
window.modules.estudiantes.editarEstudiante = async function(id) {
    Swal.fire('Info', `Editar estudiante ${id}`, 'info');
};

/**
 * Eliminar estudiante
 */
window.modules.estudiantes.eliminarEstudiante = async function(id, nombre) {
    const confirmacion = await Swal.fire({
        title: '¿Eliminar estudiante?',
        text: `Se eliminará permanentemente a: ${nombre}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    });

    if (confirmacion.isConfirmed) {
        const { error } = await window.supabaseClient.from('estudiantes').delete().eq('id', id);
        if (error) {
            Swal.fire('Error', error.message, 'error');
        } else {
            Swal.fire('Eliminado', 'El estudiante ha sido eliminado', 'success');
            cargarEstudiantes();
        }
    }
};

/**
 * Exportar a Excel
 */
window.modules.estudiantes.exportarExcel = function() {
    Swal.fire('Info', 'Función de exportar Excel - Implementar con SheetJS', 'info');
};

// Exportar funciones al scope global
window.aplicarFiltros = window.modules.estudiantes.aplicarFiltros;
window.limpiarFiltros = window.modules.estudiantes.limpiarFiltros;
window.exportarExcel = window.modules.estudiantes.exportarExcel;
window.abrirModalCrear = window.modules.estudiantes.abrirModalCrear;
window.editarEstudiante = window.modules.estudiantes.editarEstudiante;
window.eliminarEstudiante = window.modules.estudiantes.eliminarEstudiante;
window.buscarEnTiempoReal = window.modules.estudiantes.buscarEnTiempoReal;

console.log('✅ Módulo de estudiantes cargado');