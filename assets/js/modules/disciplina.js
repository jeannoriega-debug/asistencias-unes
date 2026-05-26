/**
 * MÓDULO CONSEJO DISCIPLINARIO
 * Conexión directa a tabla disc_registros en Supabase
 */

window.modules.disciplina = {
    registroActualId: null,

    init: async function() {
        console.log(' Iniciando módulo Disciplinario...');
        await this.cargarLista();
        
        // Escuchar Enter en el buscador
        document.getElementById('buscar-cedula')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.buscarPorCedula();
        });
    },

    /**
     * CARGAR TODOS LOS REGISTROS (Tabla derecha)
     */
    cargarLista: async function() {
        const tbody = document.getElementById('lista-disciplina-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="9" class="text-center p-4">Cargando...</td></tr>';

        try {
            // Traemos datos de disc_registros
            const { data, error } = await window.supabaseClient
                .from('disc_registros')
                .select('*')
                .order('created_at', { ascending: false }); // Si tienes created_at, si no, usa 'id'

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
                        <button onclick="window.modules.disciplina.cargarEnFormulario(${row.id})" class="ml-2 text-blue-600 hover:text-blue-800 text-xs font-bold">👁️</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

        } catch (e) {
            console.error('Error cargando lista:', e);
            tbody.innerHTML = '<tr><td colspan="9" class="text-center p-4 text-red-500">Error al cargar datos</td></tr>';
        }
    },

    /**
     * BUSCAR POR CÉDULA (Barra izquierda)
     */
    buscarPorCedula: async function() {
        const cedulaInput = document.getElementById('buscar-cedula').value.trim();
        if (!cedulaInput) return;

        try {
            // Buscamos en disc_registros por cédula
            const { data, error } = await window.supabaseClient
                .from('disc_registros')
                .select('*')
                .eq('cedula', cedulaInput.toUpperCase())
                .single(); // Buscamos el registro más reciente o el único

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 es "no rows returned"

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
                // Si no hay en disc_registros, podríamos buscar en estudiantes (opcional)
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
        }
    },

    /**
     * RELLENAR EL FORMULARIO (Izquierda)
     */
    cargarEnFormulario: function(id) {
        // Buscamos en los datos ya cargados o hacemos fetch
        window.supabaseClient.from('disc_registros').select('*').eq('id', id).single().then(({data}) => {
            if(data) this.llenarFormulario(data);
        });
    },

    llenarFormulario: function(data) {
        this.registroActualId = data.id;

        // Mapeo seguro de campos
        document.getElementById('disc-cedula').value = data.cedula || '';
        document.getElementById('disc-nombres').value = data.nombres || '';
        document.getElementById('disc-apellidos').value = data.apellidos || '';
        document.getElementById('disc-genero').value = data.genero || 'SELECCIONAR';
        document.getElementById('disc-pnf').value = data.pnf || '';
        document.getElementById('disc-proceso').value = data.proceso || '';
        
        // Fechas y estados
        document.getElementById('disc-fecha-baja').value = data.fecha_baja || '';
        document.getElementById('disc-tipo-baja').value = data.tipo_baja || 'SELECCIONAR';
        document.getElementById('disc-fecha-leve').value = data.faltas_leves_fecha || '';
        document.getElementById('disc-fecha-grave').value = data.faltas_graves_fecha || '';
        document.getElementById('disc-fecha-gravisima').value = data.faltas_gravisima_fecha || '';
        
        // Contadores
        // document.getElementById('disc-contador-leves').value = data.faltas_leves_cant || 0;
        // document.getElementById('disc-contador-graves').value = data.faltas_graves_cant || 0;
        
        // Hacer scroll al formulario en móvil
        if(window.innerWidth < 1024) {
            document.querySelector('.lg\\:col-span-1').scrollIntoView({ behavior: 'smooth' });
        }
    },

    limpiarFormulario: function() {
        this.registroActualId = null;
        document.querySelectorAll('input, select').forEach(el => {
            if(el.id !== 'buscar-cedula') el.value = '';
        });
        document.getElementById('disc-genero').value = 'SELECCIONAR';
        document.getElementById('disc-tipo-baja').value = 'SELECCIONAR';
    }
};

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    window.modules.disciplina.init();
});
