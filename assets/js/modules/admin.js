/**
 * MÓDULO DE ADMINISTRACIÓN
 * Gestión de profesores, asignaciones y promociones
 * ✅ Incluye: carga de trayectos, categoría en asignaciones, activación masiva
 */

window.modules = window.modules || {};
window.modules.admin = {};

/**
 * Inicializar panel de administración
 */
window.modules.admin.init = async function () {
    const panelAdmin = document.getElementById('panel-admin');
    if (!panelAdmin || panelAdmin.classList.contains('hidden')) return;

    await window.modules.admin.cargarListaProfesores();
    await window.modules.admin.cargarProfesoresParaSelect();
    await window.modules.admin.cargarPNFParaAsignacion();
    await window.modules.admin.cargarTrayectosParaAsignacion(); // ✅ NUEVO: Cargar trayectos

    console.log('✅ Panel de administración inicializado');
};

/**
 * Crear nuevo profesor
 */
window.modules.admin.crearProfesor = async function (e) {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.textContent;
    btn.textContent = '⏳ Creando...';
    btn.disabled = true;

    try {
        const res = await fetch('https://sweoveheeayloqvtgjzu.supabase.co/functions/v1/crear-profesor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                email: document.getElementById('prof-email').value.trim(),
                nombre: document.getElementById('prof-nombre').value.trim(),
                apellido: document.getElementById('prof-apellido').value.trim(),
                cedula: document.getElementById('prof-cedula').value.trim(),
                rol: document.getElementById('prof-rol').value
            })
        });

        const r = await res.json();

        if (r.success) {
            Swal.fire('✅ Éxito', r.message || 'Profesor creado exitosamente. Requiere activación.', 'success');
            e.target.reset();
            await window.modules.admin.cargarListaProfesores();
            await window.modules.admin.cargarProfesoresParaSelect();
        } else {
            Swal.fire('❌ Error', r.error || 'No se pudo crear el profesor', 'error');
        }
    } catch (err) {
        Swal.fire('❌ Error', 'No se pudo conectar con el servidor: ' + err.message, 'error');
    } finally {
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
};

/**
 * Cargar lista de profesores CON CHECKBOXES
 */
window.modules.admin.cargarListaProfesores = async function () {
    const { data } = await window.supabaseClient.from('perfiles_profesores').select('*').order('nombre, apellido');
    const tbody = document.getElementById('lista-profesores-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">No hay profesores registrados</td></tr>';
        return;
    }

    for (const p of data) {
        const { count } = await window.supabaseClient
            .from('asignaciones_profesor')
            .select('*', { count: 'exact', head: true })
            .eq('profesor_id', p.id);

        const isActive = p.status === 'Activo';
        const esTuPropioId = (p.id === window.appState.usuarioActualId);

        const estadoTexto = isActive ? '✅ Activo' : '⏳ Pendiente';
        const estadoColor = isActive ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800';
        const btnClase = isActive ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800';
        const btnTexto = isActive ? '🚫 Desactivar' : '✅ Activar';
        const accion = isActive ? 'Inactivo' : 'Activo';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';

        const checkboxDisabled = isActive ? 'disabled checked' : '';

        let htmlBotonAccion = '';
        if (!esTuPropioId) {
            htmlBotonAccion = `
                <button onclick="window.modules.admin.activarDesactivarProfesor('${p.id}', '${accion}')" 
                    class="${btnClase} font-bold text-sm mx-1">
                    ${btnTexto}
                </button>
            `;
        } else {
            htmlBotonAccion = '<span class="text-gray-400 text-xs">(Tú)</span>';
        }

        tr.innerHTML = `
            <td class="p-2 text-center">
                <input type="checkbox" 
                       class="profesor-checkbox w-4 h-4 rounded cursor-pointer" 
                       value="${p.id}" 
                       ${checkboxDisabled}
                       title="${isActive ? 'Ya activado' : 'Seleccionar para activar'}">
            </td>
            <td class="p-2">${p.nombre} ${p.apellido}</td>
            <td class="p-2">${p.correo || p.email || '-'}</td>
            <td class="p-2">
                <span class="px-2 py-1 rounded text-xs font-bold ${p.rol === 'super_usuario' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                    ${p.rol}
                </span>
            </td>
            <td class="p-2 text-center">${count || 0} asignaciones</td>
            <td class="p-2">
                <span class="px-2 py-1 rounded text-xs font-bold ${estadoColor}">
                    ${estadoTexto}
                </span>
            </td>
            <td class="p-2 text-center">
                <button onclick="window.modules.admin.verAsignaciones('${p.id}')" class="text-blue-600 hover:text-blue-800 mr-2 font-bold text-sm">Ver</button>
                ${htmlBotonAccion}
            </td>
        `;
        tbody.appendChild(tr);
    }
};

/**
 * Ver asignaciones de un profesor
 */
window.modules.admin.verAsignaciones = async function (pid) {
    const { data } = await window.supabaseClient
        .from('asignaciones_profesor')
        .select(`
            pnf:pnf_id(nombre), 
            unidad:unidad_curricular_id(nombre), 
            ambiente, 
            proceso, 
            tipos_trayecto:trayecto_id(nombre),
            categoria
        `)
        .eq('profesor_id', pid);

    const t = (data || []).map(a =>
        `${a.pnf?.nombre || 'N/A'} - ${a.unidad?.nombre || 'N/A'} ${a.categoria ? `(${a.categoria})` : ''} ${a.ambiente ? `(Amb ${a.ambiente})` : '(Todos)'} [${a.proceso || 'N/A'} - ${a.tipos_trayecto?.nombre || 'N/A'}]`
    ).join(', ') || 'Sin asignaciones';

    Swal.fire('Asignaciones', t, 'info');
};

/**
 * Eliminar profesor
 */
window.modules.admin.eliminarProfesor = async function (pid) {
    if (pid === window.appState.usuarioActualId) {
        return Swal.fire("No permitido", "No puedes eliminarte a ti mismo", "warning");
    }

    const r = await Swal.fire({
        title: '¿Eliminar profesor?',
        text: 'Esta acción eliminará sus asignaciones y perfil. ¿Continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (r.isConfirmed) {
        await window.supabaseClient.from('asignaciones_profesor').delete().eq('profesor_id', pid);
        const { error } = await window.supabaseClient.from('perfiles_profesores').delete().eq('id', pid);

        if (error) {
            Swal.fire('Error', error.message, 'error');
        } else {
            Swal.fire('Eliminado', 'El profesor ha sido eliminado', 'success');
            await window.modules.admin.cargarListaProfesores();
            await window.modules.admin.cargarProfesoresParaSelect();
        }
    }
};

/**
 * Activar o desactivar profesor (individual)
 */
window.modules.admin.activarDesactivarProfesor = async function (profesorId, nuevoStatus) {
    const accion = nuevoStatus === 'Activo' ? 'activar' : 'desactivar';
    const confirmacion = await Swal.fire({
        title: `¿${accion === 'activar' ? '✅ Activar' : '🚫 Desactivar'} profesor?`,
        text: `El profesor ${accion === 'activar' ? 'podrá' : 'NO podrá'} iniciar sesión`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    try {
        const res = await fetch('https://sweoveheeayloqvtgjzu.supabase.co/functions/v1/activar-profesor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                userId: profesorId,
                nuevoStatus: nuevoStatus
            })
        });

        const result = await res.json();

        if (result.success) {
            Swal.fire(
                accion === 'activar' ? '✅ Activado' : '🚫 Desactivado',
                `El profesor ha sido ${accion} correctamente`,
                'success'
            );
            await window.modules.admin.cargarListaProfesores();
        } else {
            Swal.fire('Error', result.error, 'error');
        }

    } catch (error) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    }
};

/**
 * Asignar recursos a profesor ✅ ACTUALIZADO CON CATEGORÍA
 */
window.modules.admin.asignarRecursos = async function (e) {
    e.preventDefault();

    const pid = document.getElementById('asign-profesor')?.value;
    const pnfId = document.getElementById('asign-pnf')?.value;
    const uid = document.getElementById('asign-unidad')?.value;
    const amb = document.getElementById('asign-ambiente')?.value || null;
    const proceso = document.getElementById('asign-proceso')?.value;
    const trayecto = document.getElementById('asign-trayecto')?.value;
    const categoria = document.getElementById('asign-categoria')?.value || null; // ✅ NUEVO

    if (!pid || !pnfId || !uid || !trayecto) {
        return Swal.fire("Atención", "Complete Profesor, PNF, Unidad y Trayecto", "warning");
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.textContent;
    btn.textContent = '⏳ Asignando...';
    btn.disabled = true;

    try {
        const { error } = await window.supabaseClient.from('asignaciones_profesor').insert({
            profesor_id: pid,
            pnf_id: pnfId,
            unidad_curricular_id: uid,
            ambiente: amb,
            proceso: proceso,
            trayecto_id: trayecto,
            categoria: categoria, // ✅ Guardamos la categoría
            asignado_por: window.appState.usuarioActualId
        });

        if (error) throw error;

        Swal.fire('Éxito', `Asignación creada para ${proceso}`, 'success');
        e.target.reset();
        await window.modules.admin.cargarListaProfesores();

        // Recargar unidades y categorías por si se cambia el PNF
        const selPnf = document.getElementById('asign-pnf');
        if (selPnf?.value) {
            await window.modules.admin.cargarUnidadesPorPNF(selPnf.value);
            await window.modules.admin.cargarCategoriasPorPNF(selPnf.value);
        }

    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    } finally {
        btn.textContent = textoOriginal;
        btn.disabled = false;
    }
};

/**
 * Cargar profesores para select
 */
window.modules.admin.cargarProfesoresParaSelect = async function () {
    const { data } = await window.supabaseClient.from('perfiles_profesores').select('id, nombre, apellido').order('nombre');
    const sel = document.getElementById('asign-profesor');
    if (!sel) return;

    sel.innerHTML = '<option value="">Seleccione Profesor</option>';
    (data || []).forEach(p => {
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = `${p.nombre} ${p.apellido}`;
        sel.appendChild(o);
    });
};

/**
 * Cargar PNFs para asignación + evento para cargar unidades y categorías
 */
window.modules.admin.cargarPNFParaAsignacion = async function () {
    const { data } = await window.supabaseClient.from('pnf').select('id, nombre').order('nombre');
    const sel = document.getElementById('asign-pnf');
    if (!sel) return;

    sel.innerHTML = '<option value="">Seleccione PNF</option>';
    (data || []).forEach(p => {
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.nombre;
        sel.appendChild(o);
    });

    sel.addEventListener('change', async () => {
        await window.modules.admin.cargarUnidadesPorPNF(sel.value);
        await window.modules.admin.cargarCategoriasPorPNF(sel.value); // ✅ NUEVO
    });
};

/**
 * Cargar unidades curriculares por PNF (función extraída para reutilizar)
 */
window.modules.admin.cargarUnidadesPorPNF = async function (pnfId) {
    const sU = document.getElementById('asign-unidad');
    if (!sU || !pnfId) {
        if (sU) sU.innerHTML = '<option value="">Unidad Curricular</option>';
        return;
    }

    sU.innerHTML = '<option value="">Cargando...</option>';

    const { data: u } = await window.supabaseClient
        .from('unidades_curriculares')
        .select('id, nombre')
        .eq('pnf_id', pnfId)
        .order('nombre');

    sU.innerHTML = '<option value="">Unidad Curricular</option>';
    (u || []).forEach(x => {
        const o = document.createElement('option');
        o.value = x.id;
        o.textContent = x.nombre;
        sU.appendChild(o);
    });
};

/**
 * ✅ NUEVO: Cargar categorías disponibles por PNF (desde estudiantes activos)
 */
window.modules.admin.cargarCategoriasPorPNF = async function (pnfId) {
    const sel = document.getElementById('asign-categoria');
    if (!sel || !pnfId) {
        if (sel) sel.innerHTML = '<option value="">Todas las categorías</option>';
        return;
    }

    sel.innerHTML = '<option value="">Cargando...</option>';

    try {
        const { data } = await window.supabaseClient
            .from('estudiantes')
            .select('categoria')
            .eq('pnf_id', pnfId)
            .not('categoria', 'is', null)
            .eq('status', 'Activo');

        const categorias = window.utils.getUniqueValues(data, 'categoria').filter(Boolean);

        sel.innerHTML = '<option value="">Todas las categorías</option>';
        categorias.forEach(c => {
            const o = document.createElement('option');
            o.value = c;
            o.textContent = c;
            sel.appendChild(o);
        });
    } catch (err) {
        console.error('Error cargando categorías:', err);
        sel.innerHTML = '<option value="">Todas las categorías</option>';
    }
};

/**
 * ✅ NUEVO: Cargar trayectos para el formulario de asignación
 */
window.modules.admin.cargarTrayectosParaAsignacion = async function () {
    const select = document.getElementById('asign-trayecto');
    if (!select) return;

    select.innerHTML = '<option value="">Cargando trayectos...</option>';

    try {
        const { data, error } = await window.supabaseClient
            .from('tipos_trayecto')
            .select('id, nombre')
            .eq('activo', true)
            .order('orden');

        if (error) throw error;

        select.innerHTML = '<option value="">Seleccione Trayecto</option>';
        (data || []).forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.nombre;
            select.appendChild(opt);
        });

    } catch (err) {
        console.error('Error cargando trayectos:', err);
        select.innerHTML = '<option value="">Error al cargar</option>';
    }
};

/**
 * Cargar profesores para filtro de reporte
 */
window.modules.admin.cargarProfesoresParaFiltroReporte = async function () {
    const selectProf = document.getElementById('select-profesor-reporte');
    if (!selectProf) return;

    selectProf.innerHTML = '<option value="">📊 Mis asistencias (Por defecto)</option>';
    const { data, error } = await window.supabaseClient
        .from('perfiles_profesores')
        .select('id, nombre, apellido')
        .order('nombre');

    if (error) return;
    (data || []).forEach(prof => {
        const option = document.createElement('option');
        option.value = prof.id;
        option.textContent = `${prof.nombre} ${prof.apellido}`;
        selectProf.appendChild(option);
    });
};

/**
 * Promocionar estudiantes de trayecto
 */
window.modules.admin.promocionarEstudiantes = async function () {
    const trayectoOrigenId = document.getElementById('promo-trayecto-origen')?.value;
    const trayectoDestinoId = document.getElementById('promo-trayecto-destino')?.value;

    if (!trayectoOrigenId || !trayectoDestinoId) {
        return Swal.fire("Atención", "Seleccione ambos trayectos", "warning");
    }

    if (trayectoOrigenId === trayectoDestinoId) {
        return Swal.fire("Atención", "El trayecto origen y destino deben ser diferentes", "warning");
    }

    // Cargar trayectos si no están en appState
    if (!window.appState.tiposTrayectos || window.appState.tiposTrayectos.length === 0) {
        const { data } = await window.supabaseClient.from('tipos_trayecto').select('*').eq('activo', true).order('orden');
        window.appState.tiposTrayectos = data || [];
    }

    const tiposTrayectos = window.appState.tiposTrayectos;
    const origen = tiposTrayectos.find(t => t.id === trayectoOrigenId);
    const destino = tiposTrayectos.find(t => t.id === trayectoDestinoId);

    const confirmacion = await Swal.fire({
        title: '¿Promocionar estudiantes?',
        text: `Se actualizará el trayecto de los estudiantes activos de "${origen?.nombre}" a "${destino?.nombre}"`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, promocionar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    const { data, error } = await window.supabaseClient
        .from('estudiantes')
        .update({ trayecto_id: trayectoDestinoId })
        .eq('trayecto_id', trayectoOrigenId)
        .eq('status', 'Activo')
        .select('id, nombres, apellidos');

    if (error) {
        Swal.fire('Error', error.message, 'error');
    } else {
        const cantidad = data?.length || 0;
        Swal.fire({
            title: '¡Promoción exitosa!',
            text: `${cantidad} estudiante(s) promocionados de ${origen?.nombre} a ${destino?.nombre}`,
            icon: 'success'
        });
    }
};

// ================= FUNCIONES DE ACTIVACIÓN MASIVA =================

function toggleSelectAll() {
    const selectAll = document.getElementById('select-all-profesores').checked;
    const checkboxes = document.querySelectorAll('.profesor-checkbox:not(:disabled)');
    checkboxes.forEach(cb => cb.checked = selectAll);
}

async function activarProfesoresSeleccionados() {
    const checkboxes = document.querySelectorAll('.profesor-checkbox:checked:not(:disabled)');

    if (checkboxes.length === 0) {
        return Swal.fire('Atención', 'Selecciona al menos un profesor pendiente', 'warning');
    }

    const confirmacion = await Swal.fire({
        title: `¿Activar ${checkboxes.length} profesor(es)?`,
        text: 'Se confirmará el email y podrán iniciar sesión',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, activar todos',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    let exitosos = 0;
    let fallidos = 0;

    Swal.fire({
        title: 'Activando...',
        html: '0 / ' + checkboxes.length,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    for (const checkbox of checkboxes) {
        try {
            const res = await fetch('https://sweoveheeayloqvtgjzu.supabase.co/functions/v1/activar-profesor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    userId: checkbox.value,
                    nuevoStatus: 'Activo'
                })
            });

            if (res.ok) exitosos++;
            else fallidos++;

            Swal.update({ html: `${exitosos + fallidos} / ${checkboxes.length}` });

        } catch (error) {
            fallidos++;
        }
    }

    Swal.fire({
        title: '✅ Proceso completado',
        html: `Activados: ${exitosos}<br>Fallidos: ${fallidos}`,
        icon: exitosos > 0 ? 'success' : 'error'
    });

    await window.modules.admin.cargarListaProfesores();
}

async function activarTodosPendientes() {
    const { data } = await window.supabaseClient
        .from('perfiles_profesores')
        .select('id')
        .eq('status', 'Inactivo');

    if (!data || data.length === 0) {
        return Swal.fire('Info', 'No hay profesores pendientes de activación', 'info');
    }

    const confirmacion = await Swal.fire({
        title: `¿Activar ${data.length} profesores pendientes?`,
        text: 'Se activarán todos los profesores con estado "Pendiente"',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, activar todos',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;

    const checkboxes = document.querySelectorAll('.profesor-checkbox:not(:disabled)');
    checkboxes.forEach(cb => cb.checked = true);

    await activarProfesoresSeleccionados();
}

// ================= EXPORTAR FUNCIONES AL SCOPE GLOBAL =================
window.crearProfesor = window.modules.admin.crearProfesor;

window.abrirPanelAdmin = function() {
    if (window.appState.rolUsuarioActual !== 'super_usuario') {
        return Swal.fire("Acceso denegado", "Solo super usuarios", "error");
    }
    const panel = document.getElementById('panel-admin');
    if (panel) {
        panel.classList.remove('hidden');
        // 🔥 ESTO ES LO QUE FALTA:
        if (window.modules && window.modules.admin) {
            window.modules.admin.init();
        }
    }
};

window.cerrarPanelAdmin = function () {
    const panel = document.getElementById('panel-admin');
    if (panel) panel.classList.add('hidden');
};

window.asignarRecursos = window.modules.admin.asignarRecursos;
window.verAsignaciones = window.modules.admin.verAsignaciones;
window.eliminarProfesor = window.modules.admin.eliminarProfesor;
window.promocionarEstudiantes = window.modules.admin.promocionarEstudiantes;
window.cargarListaProfesores = window.modules.admin.cargarListaProfesores;
window.cargarProfesoresParaSelect = window.modules.admin.cargarProfesoresParaSelect;
window.cargarPNFParaAsignacion = window.modules.admin.cargarPNFParaAsignacion;

// ✅ Nuevas funciones exportadas
window.cargarUnidadesPorPNF = window.modules.admin.cargarUnidadesPorPNF;
window.cargarCategoriasPorPNF = window.modules.admin.cargarCategoriasPorPNF;
window.cargarTrayectosParaAsignacion = window.modules.admin.cargarTrayectosParaAsignacion;

window.toggleSelectAll = toggleSelectAll;
window.activarProfesoresSeleccionados = activarProfesoresSeleccionados;
window.activarTodosPendientes = activarTodosPendientes;

console.log('✅ Módulo de administración cargado con mejoras');
