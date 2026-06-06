/**
 * MÓDULO DE ASISTENCIA SIMPLIFICADA
 * Versión: 1.0 - Interfaz simplificada para profesores
 */

window.modules = window.modules || {};
window.modules.asistenciaSimple = {};
window.modules.asistencia = window.modules.asistencia || {};

let tiposTrayectos = [];
let asignacionesProfesor = [];
let asignacionSeleccionada = null;

// ============================================
// INICIALIZACIÓN
// ============================================
window.modules.asistenciaSimple.init = async function() {
    console.log('🚀 Iniciando Asistencia Simplificada v1.0...');
    
    const rol = window.appState.rolUsuarioActual;
    const nombre = window.appState.nombreUsuarioActual || 'Usuario';
    
    // Mostrar bienvenida
    document.getElementById('welcome-banner').classList.remove('hidden');
    document.getElementById('welcome-nombre').textContent = `👋 ${nombre}`;
    document.getElementById('profesor-nombre').textContent = nombre;
    document.getElementById('profesor-rol').textContent = rol === 'super_usuario' ? 'Administrador' : 'Profesor';
    
    if (rol === 'super_usuario') {
        // Vista completa para administradores
        await this.inicializarVistaCompleta();
    } else {
        // Vista simplificada para profesores
        await this.cargarAsignaciones();
    }
};

// ============================================
// VISTA COMPLETA (super_usuario)
// ============================================
window.modules.asistenciaSimple.inicializarVistaCompleta = async function() {
    document.getElementById('welcome-info').textContent = 'Modo Administrador - Vista Completa';
    document.getElementById('vista-completa').classList.remove('hidden');
    
    await cargarTrayectos();
    await cargarPNF();
    
    const btnCargar = document.getElementById('btn-cargar');
    const btnReporte = document.getElementById('btn-reporte');
    if (btnCargar) btnCargar.onclick = window.modules.asistencia.cargarLista;
    if (btnReporte) btnReporte.onclick = window.modules.reportes?.generarReporteMatriz;
    
    console.log('✅ Vista completa inicializada');
};

// ============================================
// CARGAR ASIGNACIONES DEL PROFESOR
// ============================================
window.modules.asistenciaSimple.cargarAsignaciones = async function() {
    const profesorId = window.appState.usuarioActualId;
    
    try {
        // Ocultar todos los paneles
        document.getElementById('no-asignaciones').classList.add('hidden');
        document.getElementById('una-asignacion').classList.add('hidden');
        document.getElementById('multiplas-asignaciones').classList.add('hidden');
        document.getElementById('vista-completa').classList.add('hidden');
        
        console.log('🔍 Cargando asignaciones del profesor:', profesorId);
        
        // Obtener todas las asignaciones del profesor con datos relacionados
        const { data: asignaciones, error } = await window.supabaseClient
            .from('asignaciones_profesor')
            .select(`
                id,
                pnf:pnf_id(id, nombre),
                unidad:unidad_curricular_id(id, nombre),
                categoria,
                proceso,
                trayecto:trayecto_id(id, nombre),
                ambiente
            `)
            .eq('profesor_id', profesorId);
        
        if (error) throw error;
        
        if (!asignaciones || asignaciones.length === 0) {
            console.warn('⚠️ El profesor no tiene asignaciones');
            document.getElementById('welcome-info').textContent = 'No tiene asignaciones registradas';
            document.getElementById('no-asignaciones').classList.remove('hidden');
            return;
        }
        
        console.log('✅ Asignaciones encontradas:', asignaciones.length);
        
        // Agrupar asignaciones únicas (combinaciones PNF+Unidad+Proceso+Trayecto)
        const asignacionesUnicas = this.agruparAsignaciones(asignaciones);
        console.log('📊 Asignaciones únicas:', asignacionesUnicas.length);
        
        asignacionesProfesor = asignacionesUnicas;
        
        if (asignacionesUnicas.length === 1) {
            // Una sola asignación: autocompletar
            this.mostrarUnaAsignacion(asignacionesUnicas[0]);
        } else {
            // Múltiples asignaciones: mostrar lista
            this.mostrarMultiplesAsignaciones(asignacionesUnicas);
        }
        
    } catch (e) {
        console.error('❌ Error cargando asignaciones:', e);
        Swal.fire('Error', 'No se pudieron cargar sus asignaciones: ' + e.message, 'error');
    }
};

// ============================================
// AGRUPAR ASIGNACIONES ÚNICAS
// ============================================
window.modules.asistenciaSimple.agruparAsignaciones = function(asignaciones) {
    const mapa = new Map();
    
    asignaciones.forEach(asig => {
        // Crear clave única basada en PNF + Unidad + Proceso + Trayecto
        const clave = `${asig.pnf?.id}-${asig.unidad?.id}-${asig.proceso}-${asig.trayecto?.id}`;
        
        if (!mapa.has(clave)) {
            mapa.set(clave, {
                pnf: asig.pnf,
                unidad: asig.unidad,
                categoria: asig.categoria,
                proceso: asig.proceso,
                trayecto: asig.trayecto,
                ambientes: []
            });
        }
        
        // Agregar ambiente si no está repetido
        const grupo = mapa.get(clave);
        if (asig.ambiente && !grupo.ambientes.includes(asig.ambiente)) {
            grupo.ambientes.push(asig.ambiente);
        }
    });
    
    return Array.from(mapa.values());
};

// ============================================
// MOSTRAR UNA ASIGNACIÓN (automático)
// ============================================
window.modules.asistenciaSimple.mostrarUnaAsignacion = function(asignacion) {
    document.getElementById('welcome-info').textContent = '1 clase detectada - Configuración automática';
    document.getElementById('una-asignacion').classList.remove('hidden');
    
    // Llenar información de clase detectada
    document.getElementById('clase-detectada-info').innerHTML = `
        <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-gray-600">PNF:</span> <span class="font-bold">${asignacion.pnf?.nombre || 'N/A'}</span></div>
            <div><span class="text-gray-600">Categoría:</span> <span class="font-bold">${asignacion.categoria || 'N/A'}</span></div>
            <div class="col-span-2"><span class="text-gray-600">Unidad Curricular:</span> <span class="font-bold text-blue-700">${asignacion.unidad?.nombre || 'N/A'}</span></div>
            <div><span class="text-gray-600">Proceso:</span> <span class="font-bold">${asignacion.proceso || 'N/A'}</span></div>
            <div><span class="text-gray-600">Trayecto:</span> <span class="font-bold">${asignacion.trayecto?.nombre || 'N/A'}</span></div>
        </div>
    `;
    
    // Llenar selector de ambiente
    this.llenarAmbientes(asignacion, 'ambiente-una', 'total-estudiantes-una');
    
    // Guardar asignación seleccionada
    asignacionSeleccionada = asignacion;
};

// ============================================
// MOSTRAR MÚLTIPLES ASIGNACIONES
// ============================================
window.modules.asistenciaSimple.mostrarMultiplesAsignaciones = function(asignaciones) {
    document.getElementById('welcome-info').textContent = `${asignaciones.length} clases detectadas - Seleccione una`;
    document.getElementById('multiplas-asignaciones').classList.remove('hidden');
    document.getElementById('selector-ambiente-multi').classList.add('hidden');
    document.getElementById('btn-cargar-multi').classList.add('hidden');
    
    const lista = document.getElementById('lista-asignaciones');
    lista.innerHTML = '';
    
    asignaciones.forEach((asig, idx) => {
        const card = document.createElement('div');
        card.className = 'asignacion-card border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 cursor-pointer transition';
        card.onclick = () => this.seleccionarAsignacion(idx);
        card.id = `asignacion-card-${idx}`;
        card.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                    ${idx + 1}
                </div>
                <div class="flex-1">
                    <div class="font-bold text-gray-800">${asig.unidad?.nombre || 'N/A'}</div>
                    <div class="text-sm text-gray-600 mt-1">
                        <span class="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs mr-1">${asig.pnf?.nombre || 'N/A'}</span>
                        <span class="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs mr-1">${asig.categoria || 'N/A'}</span>
                    </div>
                    <div class="text-xs text-gray-500 mt-2">
                        <i class="fas fa-calendar mr-1"></i>${asig.proceso || 'N/A'} • 
                        <i class="fas fa-route mr-1"></i>${asig.trayecto?.nombre || 'N/A'} • 
                        <i class="fas fa-door-open mr-1"></i>${asig.ambientes.length} ambiente(s)
                    </div>
                </div>
                <i class="fas fa-chevron-right text-gray-400 mt-2"></i>
            </div>
        `;
        lista.appendChild(card);
    });
};

// ============================================
// SELECCIONAR ASIGNACIÓN
// ============================================
window.modules.asistenciaSimple.seleccionarAsignacion = function(idx) {
    asignacionSeleccionada = asignacionesProfesor[idx];
    
    // Resaltar tarjeta seleccionada
    document.querySelectorAll('.asignacion-card').forEach((card, i) => {
        if (i === idx) {
            card.classList.add('selected', 'border-blue-500', 'bg-blue-50');
            card.classList.remove('border-gray-200');
        } else {
            card.classList.remove('selected', 'border-blue-500', 'bg-blue-50');
            card.classList.add('border-gray-200');
        }
    });
    
    // Mostrar selector de ambiente
    document.getElementById('selector-ambiente-multi').classList.remove('hidden');
    this.llenarAmbientes(asignacionSeleccionada, 'ambiente-multi', 'total-estudiantes-multi');
};

// ============================================
// LLENAR AMBIENTES
// ============================================
window.modules.asistenciaSimple.llenarAmbientes = function(asignacion, selectId, contadorId) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">-- Seleccione un ambiente --</option>';
    
    asignacion.ambientes.forEach((amb, idx) => {
        select.innerHTML += `<option value="${amb}">Ambiente ${amb}</option>`;
    });
    
    select.onchange = async function() {
        const amb = this.value;
        if (amb) {
            // Contar estudiantes en ese ambiente
            const total = await window.modules.asistenciaSimple.contarEstudiantes(asignacion, amb);
            document.getElementById(contadorId).textContent = total;
            
            // Mostrar botón de cargar si es multi
            if (selectId === 'ambiente-multi') {
                document.getElementById('btn-cargar-multi').classList.remove('hidden');
            }
        } else {
            document.getElementById(contadorId).textContent = '0';
            if (selectId === 'ambiente-multi') {
                document.getElementById('btn-cargar-multi').classList.add('hidden');
            }
        }
    };
};

// ============================================
// CONTAR ESTUDIANTES
// ============================================
window.modules.asistenciaSimple.contarEstudiantes = async function(asignacion, ambiente) {
    try {
        let query = window.supabaseClient
            .from('estudiantes')
            .select('id', { count: 'exact', head: true })
            .eq('pnf_id', asignacion.pnf?.id)
            .eq('proceso', asignacion.proceso)
            .eq('trayecto_id', asignacion.trayecto?.id)
            .eq('ambiente', ambiente)
            .eq('status', 'Activo');
        
        if (asignacion.categoria) {
            query = query.eq('categoria', asignacion.categoria);
        }
        
        const { count, error } = await query;
        
        if (error) throw error;
        return count || 0;
        
    } catch (e) {
        console.error('❌ Error contando estudiantes:', e);
        return 0;
    }
};

// ============================================
// CARGAR LISTA DESDE VISTA SIMPLIFICADA
// ============================================
window.modules.asistenciaSimple.cargarListaDesdeSimple = async function() {
    if (!asignacionSeleccionada) {
        Swal.fire('Atención', 'Seleccione una clase primero', 'warning');
        return;
    }
    
    // Determinar qué selector de ambiente usar
    let ambiente;
    if (asignacionesProfesor.length === 1) {
        ambiente = document.getElementById('ambiente-una').value;
    } else {
        ambiente = document.getElementById('ambiente-multi').value;
    }
    
    if (!ambiente) {
        Swal.fire('Atención', 'Seleccione un ambiente', 'warning');
        return;
    }
    
    try {
        // Construir consulta
        let query = window.supabaseClient
            .from('estudiantes')
            .select(`*, tipos_trayecto(id, codigo, nombre, orden)`)
            .eq('pnf_id', asignacionSeleccionada.pnf?.id)
            .eq('proceso', asignacionSeleccionada.proceso)
            .eq('trayecto_id', asignacionSeleccionada.trayecto?.id)
            .eq('ambiente', ambiente)
            .eq('status', 'Activo');
        
        if (asignacionSeleccionada.categoria) {
            query = query.eq('categoria', asignacionSeleccionada.categoria);
        }
        
        const { data, error } = await query.order('numero_lista');
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            Swal.fire('Info', 'No hay estudiantes en este ambiente', 'info');
            return;
        }
        
        // Guardar datos en appState para usar en marcarAsistencia
        window.appState.estudiantesActuales = data;
        window.appState.asignacionActual = {
            ...asignacionSeleccionada,
            ambiente: ambiente,
            unidad_id: asignacionSeleccionada.unidad?.id
        };
        
        // Renderizar lista
        if (window.components?.tablas?.renderizarListaEstudiantes) {
            window.components.tablas.renderizarListaEstudiantes();
        }
        
        // Mostrar resumen
        document.getElementById('lista-contenedor').classList.remove('hidden');
        const activos = data.filter(e => e.status === 'Activo').length;
        const bajas = data.filter(e => e.status === 'Inactivo').length;
        document.getElementById('count-activos').textContent = activos;
        document.getElementById('count-bajas').textContent = bajas;
        document.getElementById('count-total').textContent = data.length;
        
        // Scroll a la lista
        document.getElementById('lista-contenedor').scrollIntoView({ behavior: 'smooth' });
        
        Swal.fire({
            icon: 'success',
            title: '✅ Lista cargada',
            text: `${data.length} estudiantes cargados correctamente`,
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (e) {
        console.error('❌ Error cargando lista:', e);
        Swal.fire('Error', 'No se pudo cargar la lista: ' + e.message, 'error');
    }
};

// ============================================
// MARCAR ASISTENCIA (adaptado para vista simple)
// ============================================
window.modules.asistencia.marcarAsistencia = async function(estId, estado, btn) {
    const contenedor = btn.parentElement;
    const btnP = contenedor.querySelector('button:first-child');
    const btnA = contenedor.querySelector('button:last-child');
    const claseGris = 'bg-gray-300 hover:bg-gray-400 text-gray-700 w-8 h-8 rounded-lg font-bold text-xs transition shadow-sm flex items-center justify-center';

    // Obtener datos de la asignación actual
    const asignacion = window.appState.asignacionActual;
    const matId = asignacion?.unidad_id;
    const amb = asignacion?.ambiente;
    const proc = asignacion?.proceso;
    const fecha = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

    console.log('📤 Intentando guardar:', { estId, estado, matId, amb, proc, fecha });

    const { data, error } = await window.supabaseClient
        .from('asistencias')
        .upsert({
            estudiante_id: estId,
            unidad_curricular_id: matId,
            profesor_id: window.appState.usuarioActualId,
            estado: estado,
            proceso: proc,
            ambiente_registro: amb,
            fecha: fecha
        }, { onConflict: 'estudiante_id, unidad_curricular_id, fecha' });

    if (error) {
        console.error('❌ ERROR SUPABASE:', error);
        Swal.fire("No se guardó", error.message || "Verifica consola (F12) para más detalles", "error");
        if(btnP) btnP.className = claseGris;
        if(btnA) btnA.className = claseGris;
        return;
    }

    console.log('✅ Guardado exitoso en BD');
};

// ============================================
// FUNCIONES DE LA VISTA COMPLETA (reutilizadas)
// ============================================
async function cargarTrayectos() {
    try {
        const { data, error } = await window.supabaseClient.from('tipos_trayecto').select('*').eq('activo', true).order('orden');
        console.log('🔍 Trayectos cargados:', data?.length || 0, 'registros');
        tiposTrayectos = (!error && data && data.length > 0) ? data : [];
    } catch (err) { console.error('❌ Error trayectos:', err); }
}

async function cargarPNF() {
    const sel = document.getElementById('select-pnf');
    if (!sel) return;
    
    try {
        const { data, error } = await window.supabaseClient.from('pnf').select('id, nombre').order('nombre');
        if (error) throw error;
        
        sel.innerHTML = '<option value="">Seleccione PNF</option>';
        (data || []).forEach(p => { 
            const o = document.createElement('option'); 
            o.value = p.id; 
            o.textContent = p.nombre; 
            sel.appendChild(o); 
        });
    } catch (err) {
        console.error('❌ Error cargando PNFs:', err);
    }
}

// Handlers para vista completa (delegados al módulo original si existe)
window.onPnfChangeAsistencia = function() {
    if (window.modules.asistencia._onPnfChangeHandler) {
        window.modules.asistencia._onPnfChangeHandler.call(document.getElementById('select-pnf'));
    }
};
window.onCategoriaChangeAsistencia = function() {};
window.onMateriaChangeAsistencia = function() {};
window.onProcesoChangeAsistencia = function() {};
window.onTrayectoChangeAsistencia = function() {};
window.onAmbienteChangeAsistencia = function() {};
window.onStatusChangeAsistencia = function() {};
window.onGeneroChangeAsistencia = function() {};

// ============================================
// EXPORTAR FUNCIONES
// ============================================
window.marcarAsistencia = window.modules.asistencia.marcarAsistencia;

console.log('✅ Asistencia Simplificada JS cargado');
