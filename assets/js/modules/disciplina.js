/**
 * MÓDULO CONSEJO DISCIPLINARIO
 * Conexión directa a tabla disc_registros en Supabase
 * CORREGIDO: Exportación global de funciones y inicialización segura
 */

// 1. Asegurar que el objeto contenedor existe
window.modules = window.modules || {};
window.modules.disciplina = {};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    window.modules.disciplina.init();
});

window.modules.disciplina = {
    registroActualId: null,

    init: async function() {
        console.log('Iniciando módulo Disciplinario...');
        // Cargar la tabla al abrir
        await this.cargarLista();
        
        // Escuchar Enter en el buscador
        const inputBusqueda = document.getElementById('buscar-cedula');
        if (inputBusqueda) {
            inputBusqueda.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') window.modules.disciplina.buscarPorCedula();
            });
        }
    },

    /**
     * CARGAR TODOS LOS REGISTROS (Tabla derecha)
     */
    cargarLista: async function() {
        const tbody = document.getElementById('lista-disciplina-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="9" class="text-center p-4">Cargando registros...</td></tr>';

        try {
            // Ordenamos por ID descendente para ver los últimos primero
            const { data, error } = await window.supabaseClient
                .from('disc_registros')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;

            tbody.innerHTML = ''; // Limpiar loader

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center p-4 text-gray-500">No hay registros disciplinarios</td></tr>';
                return;
            }

            // Renderizar fila por fila
            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-gray-50 border-b transition';
                
                // Estilos para los contadores de faltas
                const leveClass = (row.faltas_leves_cant > 0) ? 'bg-yellow-200 text-yellow-800 font-bold' : 'text-gray-500';
                const graveClass = (row.faltas_graves_cant > 0) ? 'bg-red-200 text-red-800 font-bold' : 'text-gray-500';
                const gravisimaClass = (row.faltas_gravisimas_cant > 0) ? 'bg-gray-800 text-white font-bold' : 'text-gray-500';
                
                const statusBadge = (row.estatus_general === 'ACTIVO') 
                    ? '<span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-bold">ACTIVO</span>'
                    : '<span class="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 font-bold">INACTIVO</span>';

                tr.innerHTML = `
                    <td class="p-2 text-sm text-gray-600">${row.id}</td>
                    <td class="p-2 text-sm font-bold">${row.cedula}</td>
                    <td class="p-2 text-sm">${row.nombres} ${row.apellidos}</td>
                    <td class="p-2 text-sm uppercase text-xs font-bold tracking-wide text-gray-600">${row.pnf}</td>
                    <td class="p-2 text-sm"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">${row.proceso}</span></td>
                    <td class="p-2">${statusBadge}</td>
                    <td class="p-2 text-center"><span class="${leveClass} px-2 py-1 rounded text-xs">${row.faltas_leves_cant || 0}</span></td>
                    <td class="p-2 text-center"><span class="${graveClass} px-2 py-1 rounded text-xs">${row.faltas_graves_cant || 0}</span></td>
                    <td class="p-2 text-center">
                        <span class="${gravisimaClass} px-2 py-1 rounded text-xs">${row.faltas_gravisimas_cant || 0}</span>
                        <button onclick="window.modules.disciplina.cargarEnFormulario(${row.id})" class="ml-2 text-blue-600 hover:text-blue-800 text-xs font-bold" title="Editar">👁️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

        } catch (e) {
            console.error('Error cargando lista:', e);
            tbody.innerHTML = '<tr><td colspan="9" class="text-center p-4 text-red-500">Error al cargar datos. Ver consola.</td></tr>';
        }
    },

    /**
     * BUSCAR POR CÉDULA (Barra izquierda)
     */
    buscarPorCedula: async function() {
        const cedulaInput = document.getElementById('buscar-cedula').value.trim();
        if (!cedulaInput) {
            Swal.fire('Atención', 'Ingrese una cédula', 'warning');
            return;
        }

        try {
            // Buscamos en disc_registros por cédula
            const { data, error } = await window.supabaseClient
                .from('disc_registros')
                .select('*')
                .eq('cedula', cedulaInput.toUpperCase())
                .order('id', { ascending: false }) // Trae el más reciente
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                this.llenarFormulario(data);
                Swal.fire({
                    icon: 'success',
                    title: 'Estudiante Encontrado',
                    text: `${data.nombres} ${data.apellidos}`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin Registro',
                    text: 'No hay antecedentes disciplinarios para esta cédula.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                this.limpiarFormulario();
            }
        } catch (e) {
            console.error('Error búsqueda:', e);
            Swal.fire('Error', 'Error al buscar: ' + e.message, 'error');
        }
    },

    /**
     * RELLENAR EL FORMULARIO (Izquierda) desde la tabla
     */
    cargarEnFormulario: function(id) {
        window.supabaseClient.from('disc_registros').select('*').eq('id', id).maybeSingle().then(({data}) => {
            if(data) this.llenarFormulario(data);
        });
    },

    llenarFormulario: function(data) {
        this.registroActualId = data.id;

        // Mapeo seguro de campos
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };

        setVal('disc-cedula', data.cedula);
        setVal('disc-nombres', data.nombres);
        setVal('disc-apellidos', data.apellidos);
        setVal('disc-genero', data.genero || 'SELECCIONAR');
        setVal('disc-pnf', data.pnf);
        setVal('disc-proceso', data.proceso);
        
        // Fechas y estados
        setVal('disc-tipo-baja', data.tipo_baja || 'SELECCIONAR');
        setVal('disc-fecha-baja', data.fecha_baja);
        setVal('disc-fecha-leve', data.faltas_leves_fecha);
        setVal('disc-fecha-grave', data.faltas_graves_fecha);
        setVal('disc-fecha-gravisima', data.faltas_gravisima_fecha);
        setVal('disc-fecha-incidencia', data.fecha_incidencia_estudiante);
        setVal('disc-fecha-consejo', data.consejo_disciplinario_fecha);
        
        // Hacer scroll al formulario en móvil
        if(window.innerWidth < 1024) {
            document.querySelector('.lg\\:col-span-1')?.scrollIntoView({ behavior: 'smooth' });
        }
    },

    limpiarFormulario: function() {
        this.registroActualId = null;
        document.querySelectorAll('input, select').forEach(el => {
            if(el.id !== 'buscar-cedula') el.value = '';
        });
        document.getElementById('disc-genero').value = 'SELECCIONAR';
        document.getElementById('disc-tipo-baja').value = 'SELECCIONAR';
        document.getElementById('buscar-cedula').value = '';
    }
};

// ==========================================
// EXPORTAR FUNCIONES AL SCOPE GLOBAL (WINDOW)
// Esto es necesario para que los onclick="..." del HTML funcionen
// ==========================================

window.buscarEstudiante = function() { 
    window.modules.disciplina.buscarPorCedula(); 
};

window.guardarRegistro = function() { 
    Swal.fire('Info', 'Función de guardar en desarrollo', 'info'); 
    // Aquí iría la lógica para INSERT/UPDATE
};

window.limpiarFormulario = function() { 
    window.modules.disciplina.limpiarFormulario(); 
};

window.filtrarRegistros = function(filtro) { 
    Swal.fire('Info', 'Filtrado por estado en desarrollo', 'info'); 
};

window.generarReporteProceso = function() { 
    Swal.fire('Info', 'Generación de reporte de proceso en desarrollo', 'info'); 
};

window.generarReporteBajas = function() { 
    Swal.fire('Info', 'Generación de reporte de bajas en desarrollo', 'info'); 
};

window.cerrarSesion = function() { 
    // Lógica de logout global
    if(window.supabaseClient) {
        window.supabaseClient.auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    } else {
        window.location.href = 'index.html';
    }
};

console.log('✅ Módulo de Consejo Disciplinario cargado y funciones exportadas');
