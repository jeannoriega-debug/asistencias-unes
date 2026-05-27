/**
 * MÓDULO CONSEJO DISCIPLINARIO 2026
 * Versión: 3.1 - Corregido PNF y botón Limpiar
 */

window.modules = window.modules || {};
window.modules.disciplina = {
    registroActualId: null,
    filtroActual: 'TODOS',
    datosCache: [],

    init: async function() {
        console.log('🚀 Iniciando módulo Disciplinario v3.1...');
        await this.cargarLista();
        
        const inputBusqueda = document.getElementById('buscar-cedula');
        if (inputBusqueda) {
            inputBusqueda.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.buscarPorCedula();
            });
        }

        const selectTipoBaja = document.getElementById('disc-tipo-baja');
        if (selectTipoBaja) {
            selectTipoBaja.addEventListener('change', (e) => {
                if (e.target.value !== 'SELECCIONAR') {
                    document.getElementById('disc-estatus-general').value = 'INACTIVO';
                    const fechaBaja = document.getElementById('disc-fecha-baja');
                    if (!fechaBaja.value) {
                        fechaBaja.value = new Date().toISOString().split('T')[0];
                    }
                } else {
                    document.getElementById('disc-estatus-general').value = 'ACTIVO';
                }
            });
        }
    },

    formatearFecha: function(fechaString) {
        if (!fechaString) return '-';
        if (fechaString instanceof Date) {
            const day = String(fechaString.getDate()).padStart(2, '0');
            const month = String(fechaString.getMonth() + 1).padStart(2, '0');
            const year = fechaString.getFullYear();
            return `${day}/${month}/${year}`;
        }
        const partes = fechaString.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return fechaString;
    },

    cargarLista: async function() {
        const tbody = document.getElementById('lista-disciplina-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="10" class="text-center p-8"><div class="animate-pulse text-blue-600 font-bold">⏳ Cargando registros disciplinarios...</div></td></tr>';

        try {
            const { data, error } = await window.supabaseClient
                .from('disc_registros')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;

            tbody.innerHTML = ''; 
            this.datosCache = data || [];

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="10" class="text-center p-8 text-gray-500 bg-gray-50 rounded-lg">📭 No hay registros disciplinarios</td></tr>';
                return;
            }

            const estudiantesUnicos = {};

            data.forEach(reg => {
                if (!estudiantesUnicos[reg.cedula]) {
                    estudiantesUnicos[reg.cedula] = {
                        cedula: reg.cedula,
                        nombres: reg.nombres,
                        apellidos: reg.apellidos,
                        pnf: reg.pnf,
                        proceso: reg.proceso,
                        estatus_general: reg.estatus_general,
                        _total_leves: 0,
                        _total_graves: 0,
                        _total_gravisimas: 0,
                        _ids_registros: [],
                        _ultimo_id: reg.id
                    };
                }
                
                estudiantesUnicos[reg.cedula]._total_leves += (reg.faltas_leves_cant || 0);
                estudiantesUnicos[reg.cedula]._total_graves += (reg.faltas_graves_cant || 0);
                estudiantesUnicos[reg.cedula]._total_gravisimas += (reg.faltas_gravisimas_cant || 0);
                estudiantesUnicos[reg.cedula]._ids_registros.push(reg.id);
                
                if (reg.id > estudiantesUnicos[reg.cedula]._ultimo_id) {
                    estudiantesUnicos[reg.cedula].nombres = reg.nombres;
                    estudiantesUnicos[reg.cedula].apellidos = reg.apellidos;
                    estudiantesUnicos[reg.cedula].estatus_general = reg.estatus_general;
                }
            });

            let datosFiltrados = Object.values(estudiantesUnicos);
            if (this.filtroActual === 'ACTIVOS') {
                datosFiltrados = datosFiltrados.filter(e => e.estatus_general === 'ACTIVO');
            } else if (this.filtroActual === 'INACTIVOS') {
                datosFiltrados = datosFiltrados.filter(e => e.estatus_general === 'INACTIVO');
            }

            datosFiltrados.sort((a, b) => {
                if (a.estatus_general === 'ACTIVO' && b.estatus_general === 'INACTIVO') return -1;
                if (a.estatus_general === 'INACTIVO' && b.estatus_general === 'ACTIVO') return 1;
                
                if (b._total_gravisimas !== a._total_gravisimas) {
                    return b._total_gravisimas - a._total_gravisimas;
                }
                if (b._total_graves !== a._total_graves) {
                    return b._total_graves - a._total_graves;
                }
                if (b._total_leves !== a._total_leves) {
                    return b._total_leves - a._total_leves;
                }
                return a.apellidos.localeCompare(b.apellidos);
            });

            datosFiltrados.forEach(est => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-blue-50 border-b border-gray-100 transition';
                
                const leveClass = est._total_leves > 0 ? 'bg-yellow-200 text-yellow-800 font-bold' : 'bg-gray-100 text-gray-500';
                const graveClass = est._total_graves > 0 ? 'bg-red-200 text-red-800 font-bold' : 'bg-gray-100 text-gray-500';
                const gravisimaClass = est._total_gravisimas > 0 ? 'bg-gray-800 text-white font-bold' : 'bg-gray-100 text-gray-500';
                
                const statusBadge = (est.estatus_general === 'ACTIVO') 
                    ? '<span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-bold shadow-sm">ACTIVO</span>'
                    : '<span class="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 font-bold shadow-sm">INACTIVO</span>';

                tr.innerHTML = `
                    <td class="p-2 text-sm text-gray-600 font-mono">${est._ultimo_id}</td>
                    <td class="p-2 text-sm font-bold text-gray-800">${est.cedula}</td>
                    <td class="p-2 text-sm text-gray-700">${est.nombres} ${est.apellidos}</td>
                    <td class="p-2 text-xs uppercase font-bold tracking-wide text-gray-600 hidden md:table-cell">${est.pnf}</td>
                    <td class="p-2 text-sm hidden md:table-cell"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">${est.proceso}</span></td>
                    <td class="p-2">${statusBadge}</td>
                    <td class="p-2 text-center"><span class="${leveClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_leves}</span></td>
                    <td class="p-2 text-center"><span class="${graveClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_graves}</span></td>
                    <td class="p-2 text-center">
                        <span class="${gravisimaClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_gravisimas}</span>
                    </td>
                    <td class="p-2 text-center">
                        <div class="flex justify-center gap-1">
                            <button onclick="window.modules.disciplina.abrirModalDetalle('${est.cedula}')" 
                                    class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs font-bold transition shadow-sm" 
                                    title="Ver Detalle">👁️</button>
                            <button onclick="window.modules.disciplina.eliminarEstudiante('${est.cedula}')" 
                                    class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-bold transition shadow-sm" 
                                    title="Eliminar">🗑️</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

        } catch (e) {
            console.error('❌ Error cargando lista:', e);
            tbody.innerHTML = '<tr><td colspan="10" class="text-center p-8 text-red-500 font-bold">❌ Error al cargar datos. Verifica la conexión.</td></tr>';
        }
    },

buscarPorCedula: async function() {
    const cedulaInput = document.getElementById('buscar-cedula').value.trim();
    if (!cedulaInput) {
        Swal.fire({ icon: 'warning', title: 'Atención', text: 'Ingrese una cédula', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        return;
    }

    const cedulaNumeros = cedulaInput.replace(/[^0-9]/g, '');
    console.log('🔍 Buscando cédula:', cedulaNumeros);

    try {
        // Buscar en ESTUDIANTES sin JOIN primero
        const { data: estudiantesData, error: errorEst } = await window.supabaseClient
            .from('estudiantes')
            .select('id, cedula, nombres, apellidos, genero, proceso, status, ambiente, categoria, trayecto_id, pnf_id')
            .or(`cedula.ilike.%${cedulaNumeros}%,cedula.ilike.%V-${cedulaNumeros}%,cedula.ilike.%E-${cedulaNumeros}%`)
            .limit(1);

        if (errorEst) {
            console.error('❌ Error en estudiantes:', errorEst);
        }

        console.log('📊 Resultado estudiantes:', estudiantesData);

        let estudiante = estudiantesData && estudiantesData.length > 0 ? estudiantesData[0] : null;

        if (estudiante) {
            console.log('✅ Estudiante encontrado:', estudiante);
            
            // Si tenemos pnf_id, buscar el nombre del PNF
            if (estudiante.pnf_id) {
                const { data: pnfData } = await window.supabaseClient
                    .from('pnf')
                    .select('nombre')
                    .eq('id', estudiante.pnf_id)
                    .single();
                
                // Agregar el nombre del PNF al objeto estudiante
                estudiante.pnf = pnfData ? pnfData.nombre : '';
                console.log('📚 PNF encontrado:', estudiante.pnf);
            } else {
                estudiante.pnf = '';
            }
            
            // Llenar formulario con datos de ESTUDIANTES
            this.llenarFormularioEstudiante(estudiante);
            this.mostrarFiltroActivo(cedulaInput);
            document.getElementById('datos-personales-panel').classList.remove('hidden');

            // Buscar en DISC_REGISTROS
            const { data: registrosDisc, error: errorDisc } = await window.supabaseClient
                .from('disc_registros')
                .select('*')
                .eq('cedula', estudiante.cedula)
                .order('id', { ascending: false });

            if (errorDisc) console.warn('⚠️ Error buscando disciplina:', errorDisc);
            console.log('📋 Registros disciplina encontrados:', registrosDisc?.length || 0);

            if (registrosDisc && registrosDisc.length > 0) {
                this.llenarDatosDisciplinarios(registrosDisc[0]);
                await this.renderizarTablaFiltrada(registrosDisc);

                Swal.fire({
                    icon: 'success',
                    title: '✅ Estudiante Encontrado',
                    html: `<div class="text-left"><p><strong>${estudiante.nombres} ${estudiante.apellidos}</strong></p><p class="text-sm text-blue-600 mt-2">📋 ${registrosDisc.length} registro(s) disciplinario(s)</p></div>`,
                    toast: false,
                    showConfirmButton: true,
                    confirmButtonText: 'Aceptar'
                });
            } else {
                Swal.fire({
                    icon: 'info',
                    title: '📝 Sin Antecedentes',
                    html: `<div class="text-left"><p><strong>${estudiante.nombres} ${estudiante.apellidos}</strong></p></div>`,
                    toast: false,
                    showConfirmButton: true
                });
                document.getElementById('lista-disciplina-body').innerHTML = '<tr><td colspan="10" class="text-center p-8 text-gray-500">📭 No hay registros disciplinarios</td></tr>';
            }
            return;
        }

        // Fallback: buscar en DISC_REGISTROS
        console.log('⚠️ No encontrado en ESTUDIANTES, buscando en DISC_REGISTROS...');
        
        const { data: registrosDiscFallback } = await window.supabaseClient
            .from('disc_registros')
            .select('*')
            .or(`cedula.ilike.%${cedulaNumeros}%`)
            .order('id', { ascending: false })
            .limit(1);

        if (registrosDiscFallback && registrosDiscFallback.length > 0) {
            const reg = registrosDiscFallback[0];
            this.llenarFormulario(reg);
            this.mostrarFiltroActivo(cedulaInput);
            document.getElementById('datos-personales-panel').classList.remove('hidden');
            
            const { data: todos } = await window.supabaseClient.from('disc_registros').select('*').eq('cedula', reg.cedula).order('id', { ascending: false });
            if (todos) await this.renderizarTablaFiltrada(todos);

            Swal.fire('⚠️ Solo en Disciplina', 'No existe en tabla ESTUDIANTES', 'warning');
        } else {
            Swal.fire({ 
                icon: 'error', 
                title: 'No Encontrado', 
                html: `Cédula <strong>${cedulaInput}</strong> no encontrada`,
                toast: false 
            });
            this.limpiarFormulario();
        }

    } catch (e) {
        console.error('❌ Error general:', e);
        Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    }
},
    
    llenarFormularioEstudiante: function(est) {
        this.registroActualId = null;
        console.log('📝 Llenando formulario con:', est);

        const setVal = (id, val) => { 
            const el = document.getElementById(id); 
            if(el) el.value = val || ''; 
        };

        setVal('disc-cedula', est.cedula);
        setVal('disc-nombres', est.nombres);
        setVal('disc-apellidos', est.apellidos);
        
        // Género en mayúsculas
        setVal('disc-genero', est.genero ? est.genero.toUpperCase() : 'SELECCIONAR');
        
        // CORRECCIÓN PNF: Extraer nombre del objeto pnf o usar string directo
        let pnfNombre = '';
        if (est.pnf) {
            if (typeof est.pnf === 'object' && est.pnf.nombre) {
                pnfNombre = est.pnf.nombre;
            } else if (typeof est.pnf === 'string') {
                pnfNombre = est.pnf;
            }
        }
        setVal('disc-pnf', pnfNombre);
        
        setVal('disc-proceso', est.proceso || '');
        setVal('disc-nucleo', 'NUEVA ESPARTA');
        
        // Limpiar campos disciplinarios
        setVal('disc-tipo-baja', 'SELECCIONAR');
        setVal('disc-estatus-general', 'ACTIVO');
        setVal('disc-leves-cant', 0);
        setVal('disc-graves-cant', 0);
        setVal('disc-gravisimas-cant', 0);
        setVal('disc-causal-graves', '');
        setVal('disc-programa-supervision', '');
        setVal('disc-acta-compromiso', '');
        setVal('disc-observaciones', '');
        
        // Limpiar todas las fechas
        const fechasIds = [
            'disc-fecha-baja', 'disc-fecha-leve', 'disc-fecha-leve-recibida', 
            'disc-fecha-grave', 'disc-fecha-grave-recibida', 'disc-fecha-gravisima',
            'disc-fecha-gravisima-recibida', 'disc-fecha-incidencia', 'disc-fecha-consejo'
        ];
        fechasIds.forEach(id => setVal(id, ''));
    },

    llenarDatosDisciplinarios: function(data) {
        this.registroActualId = data.id;

        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };

        // Fechas
        setVal('disc-fecha-baja', data.fecha_baja);
        setVal('disc-fecha-leve', data.faltas_leves_fecha);
        setVal('disc-fecha-leve-recibida', data.fecha_falta_leve_recibida);
        setVal('disc-fecha-grave', data.faltas_graves_fecha);
        setVal('disc-fecha-grave-recibida', data.faltas_graves_fecha_recibida);
        setVal('disc-fecha-gravisima', data.faltas_gravisima_fecha);
        setVal('disc-fecha-gravisima-recibida', data.faltas_gravisima_fecha_recibida);
        setVal('disc-fecha-incidencia', data.fecha_incidencia_estudiante);
        setVal('disc-fecha-consejo', data.consejo_disciplinario_fecha);

        // Contadores
        setVal('disc-leves-cant', data.faltas_leves_cant || 0);
        setVal('disc-graves-cant', data.faltas_graves_cant || 0);
        setVal('disc-gravisimas-cant', data.faltas_gravisimas_cant || 0);

        // Textos largos
        setVal('disc-causal-graves', data.causal_faltas_graves_impuesta || '');
        setVal('disc-programa-supervision', data.programa_supervision_intensiva_aplicado_grave_impuesta || '');
        setVal('disc-acta-compromiso', data.acta_compromiso || '');
        setVal('disc-observaciones', data.observaciones_jefe || '');

        // Estatus
        setVal('disc-estatus-general', data.estatus_general || 'ACTIVO');
    },

    llenarFormulario: function(data) {
        this.registroActualId = data.id;

        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };

        setVal('disc-cedula', data.cedula);
        setVal('disc-nombres', data.nombres);
        setVal('disc-apellidos', data.apellidos);
        setVal('disc-genero', data.genero || 'SELECCIONAR');
        setVal('disc-pnf', data.pnf);
        setVal('disc-proceso', data.proceso);
        setVal('disc-nucleo', data.nucleo || 'NUEVA ESPARTA');
        setVal('disc-supervision', data.supervision_continua || 'NO APLICA');

        setVal('disc-tipo-baja', data.tipo_baja || 'SELECCIONAR');
        setVal('disc-fecha-baja', data.fecha_baja);
        setVal('disc-fecha-leve', data.faltas_leves_fecha);
        setVal('disc-fecha-leve-recibida', data.fecha_falta_leve_recibida);
        setVal('disc-fecha-grave', data.faltas_graves_fecha);
        setVal('disc-fecha-grave-recibida', data.faltas_graves_fecha_recibida);
        setVal('disc-fecha-gravisima', data.faltas_gravisima_fecha);
        setVal('disc-fecha-gravisima-recibida', data.faltas_gravisima_fecha_recibida);
        setVal('disc-fecha-incidencia', data.fecha_incidencia_estudiante);
        setVal('disc-fecha-consejo', data.consejo_disciplinario_fecha);

        setVal('disc-leves-cant', data.faltas_leves_cant || 0);
        setVal('disc-graves-cant', data.faltas_graves_cant || 0);
        setVal('disc-gravisimas-cant', data.faltas_gravisimas_cant || 0);

        setVal('disc-causal-graves', data.causal_faltas_graves_impuesta || '');
        setVal('disc-programa-supervision', data.programa_supervision_intensiva_aplicado_grave_impuesta || '');
        setVal('disc-acta-compromiso', data.acta_compromiso || '');
        setVal('disc-observaciones', data.observaciones_jefe || '');

        setVal('disc-estatus-general', data.estatus_general || 'ACTIVO');

        if(window.innerWidth < 1024) {
            document.querySelector('.lg\\:col-span-1')?.scrollIntoView({ behavior: 'smooth' });
        }
    },

    abrirModalDetalle: function(cedula) {
        const registros = this.datosCache.filter(r => r.cedula === cedula.toUpperCase());
        
        if (registros.length === 0) {
            Swal.fire('ℹ️ Info', 'No se encontraron registros disciplinarios para esta cédula', 'info');
            return;
        }

        document.getElementById('modal-cedula').textContent = registros[0].cedula;
        document.getElementById('modal-estudiante').textContent = `${registros[0].nombres} ${registros[0].apellidos}`;
        document.getElementById('modal-total').textContent = registros.length;

        const registrosOrdenados = [...registros].sort((a, b) => b.id - a.id);

        const tbody = document.getElementById('modal-body-faltas');
        tbody.innerHTML = '';

        registrosOrdenados.forEach(reg => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-blue-50 transition text-xs';
            
            let fechaMostrar = this.formatearFecha(reg.faltas_graves_fecha) || 
                               this.formatearFecha(reg.faltas_leves_fecha) || 
                               this.formatearFecha(reg.faltas_gravisima_fecha) || '-';
            
            const leveClass = reg.faltas_leves_cant > 0 ? 'bg-yellow-200 text-yellow-800 font-bold' : 'text-gray-400';
            const graveClass = reg.faltas_graves_cant > 0 ? 'bg-red-200 text-red-800 font-bold' : 'text-gray-400';
            const gravisimaClass = reg.faltas_gravisimas_cant > 0 ? 'bg-gray-800 text-white font-bold' : 'text-gray-400';

            tr.innerHTML = `
                <td class="p-1.5 font-mono text-gray-500 text-center w-10">${reg.id}</td>
                <td class="p-1.5 text-center font-medium text-gray-700 w-20">${fechaMostrar}</td>
                <td class="p-1.5 text-center text-gray-500 hidden md:table-cell w-24">${reg.cedula}</td>
                <td class="p-1.5 font-semibold text-gray-800 truncate max-w-[150px]" title="${reg.nombres} ${reg.apellidos}">${reg.nombres.split(' ')[0]} ${reg.apellidos}</td>
                <td class="p-1.5 text-center w-12"><span class="${leveClass} px-1.5 py-0.5 rounded text-xs">${reg.faltas_leves_cant || 0}</span></td>
                <td class="p-1.5 text-center w-12"><span class="${graveClass} px-1.5 py-0.5 rounded text-xs">${reg.faltas_graves_cant || 0}</span></td>
                <td class="p-1.5 text-center w-12"><span class="${gravisimaClass} px-1.5 py-0.5 rounded text-xs">${reg.faltas_gravisimas_cant || 0}</span></td>
                <td class="p-1.5 text-center w-16">
                    <button onclick="window.modules.disciplina.editarDesdeModal(${reg.id})" 
                            class="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded transition shadow-sm" 
                            title="Editar">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('modal-detalle').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    editarDesdeModal: function(id) {
        const registro = this.datosCache.find(r => r.id === id);
        if (registro) {
            this.cerrarModal();
            this.llenarFormulario(registro);
            this.mostrarFiltroActivo(registro.cedula);
            document.getElementById('datos-personales-panel').classList.remove('hidden');
            
            Swal.fire({
                icon: 'info',
                title: 'Registro Cargado',
                text: 'Edita los campos y presiona Guardar',
                toast: true,
                position: 'top-end',
                timer: 2000,
                showConfirmButton: false
            });
        }
    },

    cerrarModal: function() {
        document.getElementById('modal-detalle').classList.add('hidden');
        document.body.style.overflow = '';
    },

    renderizarTablaFiltrada: async function(registrosFiltrados) {
        const tbody = document.getElementById('lista-disciplina-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!registrosFiltrados || registrosFiltrados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center p-8 text-gray-500">No hay registros</td></tr>';
            return;
        }

        const estudiantesUnicos = {};

        registrosFiltrados.forEach(reg => {
            if (!estudiantesUnicos[reg.cedula]) {
                estudiantesUnicos[reg.cedula] = {
                    cedula: reg.cedula,
                    nombres: reg.nombres,
                    apellidos: reg.apellidos,
                    pnf: reg.pnf,
                    proceso: reg.proceso,
                    estatus_general: reg.estatus_general,
                    _total_leves: 0,
                    _total_graves: 0,
                    _total_gravisimas: 0,
                    _ids_registros: [],
                    _ultimo_id: reg.id
                };
            }
            
            estudiantesUnicos[reg.cedula]._total_leves += (reg.faltas_leves_cant || 0);
            estudiantesUnicos[reg.cedula]._total_graves += (reg.faltas_graves_cant || 0);
            estudiantesUnicos[reg.cedula]._total_gravisimas += (reg.faltas_gravisimas_cant || 0);
            estudiantesUnicos[reg.cedula]._ids_registros.push(reg.id);
            
            if (reg.id > estudiantesUnicos[reg.cedula]._ultimo_id) {
                estudiantesUnicos[reg.cedula].nombres = reg.nombres;
                estudiantesUnicos[reg.cedula].apellidos = reg.apellidos;
                estudiantesUnicos[reg.cedula].estatus_general = reg.estatus_general;
            }
        });

        Object.values(estudiantesUnicos).forEach(est => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-blue-50 border-b border-gray-100 transition';
            
            const leveClass = est._total_leves > 0 ? 'bg-yellow-200 text-yellow-800 font-bold' : 'bg-gray-100 text-gray-500';
            const graveClass = est._total_graves > 0 ? 'bg-red-200 text-red-800 font-bold' : 'bg-gray-100 text-gray-500';
            const gravisimaClass = est._total_gravisimas > 0 ? 'bg-gray-800 text-white font-bold' : 'bg-gray-100 text-gray-500';
            
            const statusBadge = (est.estatus_general === 'ACTIVO') 
                ? '<span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-bold shadow-sm">ACTIVO</span>'
                : '<span class="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 font-bold shadow-sm">INACTIVO</span>';

            tr.innerHTML = `
                <td class="p-2 text-sm text-gray-600 font-mono">${est._ultimo_id}</td>
                <td class="p-2 text-sm font-bold text-gray-800">${est.cedula}</td>
                <td class="p-2 text-sm text-gray-700">${est.nombres} ${est.apellidos}</td>
                <td class="p-2 text-xs uppercase font-bold tracking-wide text-gray-600 hidden md:table-cell">${est.pnf}</td>
                <td class="p-2 text-sm hidden md:table-cell"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">${est.proceso}</span></td>
                <td class="p-2">${statusBadge}</td>
                <td class="p-2 text-center"><span class="${leveClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_leves}</span></td>
                <td class="p-2 text-center"><span class="${graveClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_graves}</span></td>
                <td class="p-2 text-center">
                    <span class="${gravisimaClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_gravisimas}</span>
                </td>
                <td class="p-2 text-center">
                    <div class="flex justify-center gap-1">
                        <button onclick="window.modules.disciplina.abrirModalDetalle('${est.cedula}')" 
                                class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs font-bold transition shadow-sm" 
                                title="Ver Detalle">👁️</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

guardarRegistro: async function() {
    const cedula = document.getElementById('disc-cedula').value.trim();
    
    if (!cedula) {
        Swal.fire({ icon: 'warning', title: 'Atención', text: 'Primero busque un estudiante', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        return;
    }

    const estatus = document.getElementById('disc-estatus-general').value;
    const tipoBaja = document.getElementById('disc-tipo-baja').value;

    if (estatus === 'INACTIVO' && tipoBaja !== 'SELECCIONAR') {
        const confirm = await Swal.fire({
            icon: 'warning',
            title: '¿Confirmar Baja?',
            html: `Se marcará al estudiante como <strong>INACTIVO</strong> con tipo de baja: <strong>${tipoBaja}</strong><br>Esto también actualizará su estatus en la tabla ESTUDIANTES.`,
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, guardar baja',
            cancelButtonText: 'Cancelar'
        });

        if (!confirm.isConfirmed) return;
    }

    // Obtener valor de supervisión y asegurar que sea 'SI' o 'NO'
    let supervisionValor = document.getElementById('disc-supervision')?.value || 'NO APLICA';
    if (supervisionValor === 'NO APLICA' || supervisionValor === '' || supervisionValor === null) {
        supervisionValor = 'NO';
    } else if (supervisionValor === 'SI') {
        supervisionValor = 'SI';
    } else {
        supervisionValor = 'NO';
    }

    const datos = {
        cedula: cedula.toUpperCase(),
        nombres: document.getElementById('disc-nombres').value.trim().toUpperCase(),
        apellidos: document.getElementById('disc-apellidos').value.trim().toUpperCase(),
        genero: document.getElementById('disc-genero').value !== 'SELECCIONAR' ? document.getElementById('disc-genero').value : null,
        nucleo: document.getElementById('disc-nucleo').value.trim().toUpperCase() || 'NUEVA ESPARTA',
        pnf: document.getElementById('disc-pnf').value.trim().toUpperCase(),
        proceso: document.getElementById('disc-proceso').value.trim().toUpperCase(),
        supervision_continua: supervisionValor, // ✅ Valor válido: 'SI' o 'NO'
        tipo_baja: tipoBaja !== 'SELECCIONAR' ? tipoBaja : null,
        fecha_baja: document.getElementById('disc-fecha-baja').value || null,
        faltas_leves_fecha: document.getElementById('disc-fecha-leve').value || null,
        fecha_falta_leve_recibida: document.getElementById('disc-fecha-leve-recibida').value || null,
        faltas_graves_fecha: document.getElementById('disc-fecha-grave').value || null,
        faltas_graves_fecha_recibida: document.getElementById('disc-fecha-grave-recibida').value || null,
        faltas_gravisima_fecha: document.getElementById('disc-fecha-gravisima').value || null,
        faltas_gravisima_fecha_recibida: document.getElementById('disc-fecha-gravisima-recibida').value || null,
        fecha_incidencia_estudiante: document.getElementById('disc-fecha-incidencia').value || null,
        consejo_disciplinario_fecha: document.getElementById('disc-fecha-consejo').value || null,
        causal_faltas_graves_impuesta: document.getElementById('disc-causal-graves').value.trim() || null,
        programa_supervision_intensiva_aplicado_grave_impuesta: document.getElementById('disc-programa-supervision').value.trim() || null,
        acta_compromiso: document.getElementById('disc-acta-compromiso').value.trim() || null,
        observaciones_jefe: document.getElementById('disc-observaciones').value.trim() || null,
        estatus_general: estatus,
        faltas_leves_cant: parseInt(document.getElementById('disc-leves-cant').value) || 0,
        faltas_graves_cant: parseInt(document.getElementById('disc-graves-cant').value) || 0,
        faltas_gravisimas_cant: parseInt(document.getElementById('disc-gravisimas-cant').value) || 0,
        creado_por: window.appState.usuarioActualId || null
    };

    console.log('💾 Datos a guardar:', datos);

    try {
        let result;
        
        if (this.registroActualId) {
            result = await window.supabaseClient
                .from('disc_registros')
                .update(datos)
                .eq('id', this.registroActualId);
        } else {
            result = await window.supabaseClient
                .from('disc_registros')
                .insert([datos]);
        }

        if (result.error) throw result.error;

        if (estatus === 'INACTIVO' && tipoBaja !== 'SELECCIONAR') {
            await this.actualizarEstatusEstudiante(cedula.toUpperCase(), 'Inactivo');
        }

        Swal.fire({
            icon: 'success',
            title: this.registroActualId ? '✅ Registro Actualizado' : '✅ Registro Creado',
            text: 'La información ha sido guardada correctamente',
            timer: 2500,
            showConfirmButton: false
        });

        await this.cargarLista();
        this.limpiarFormulario();

    } catch (e) {
        console.error('❌ Error al guardar:', e);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar: ' + e.message });
    }
},

    
    actualizarEstatusEstudiante: async function(cedula, nuevoEstatus) {
        try {
            const { error } = await window.supabaseClient
                .from('estudiantes')
                .update({ status: nuevoEstatus })
                .eq('cedula', cedula);

            if (error) {
                console.warn('⚠️ No se pudo actualizar estatus en tabla estudiantes:', error.message);
            } else {
                console.log('✅ Estatus actualizado en tabla estudiantes para:', cedula);
            }
        } catch (e) {
            console.error('❌ Error actualizando estatus:', e);
        }
    },

    eliminarEstudiante: async function(cedula) {
        const confirm = await Swal.fire({
            icon: 'warning',
            title: '¿Eliminar registros?',
            text: `Se eliminarán TODOS los registros disciplinarios de la cédula ${cedula}`,
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirm.isConfirmed) return;

        try {
            const { error } = await window.supabaseClient
                .from('disc_registros')
                .delete()
                .eq('cedula', cedula.toUpperCase());

            if (error) throw error;

            Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Registros eliminados correctamente', timer: 2000, showConfirmButton: false });
            this.limpiarFormulario();
            await this.cargarLista();
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar: ' + e.message });
        }
    },

    filtrarRegistros: function(filtro) {
        this.filtroActual = filtro;
        this.cargarLista();
    },

    mostrarFiltroActivo: function(cedula) {
        document.getElementById('filtro-activo').classList.remove('hidden');
        document.getElementById('cedula-filtrada').textContent = cedula;
    },

    limpiarBusqueda: function() {
        document.getElementById('buscar-cedula').value = '';
        document.getElementById('filtro-activo').classList.add('hidden');
    },

    /**
     * LIMPIAR FORMULARIO COMPLETO
     * Limpia TODOS los inputs, selects, textareas y date inputs
     */
    limpiarFormulario: function() {
        this.registroActualId = null;
        
        // Limpiar TODOS los elementos del formulario
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id !== 'buscar-cedula') {
                if (el.tagName === 'SELECT') {
                    // Resetear selects a su opción por defecto
                    if (el.id === 'disc-genero') el.value = 'SELECCIONAR';
                    else if (el.id === 'disc-tipo-baja') el.value = 'SELECCIONAR';
                    else if (el.id === 'disc-supervision') el.value = 'NO APLICA';
                    else if (el.id === 'disc-estatus-general') el.value = 'ACTIVO';
                    else el.selectedIndex = 0;
                } else if (el.type === 'checkbox' || el.type === 'radio') {
                    el.checked = false;
                } else {
                    el.value = '';
                }
            }
        });

        // Resetear valores numéricos específicos
        document.getElementById('disc-leves-cant').value = 0;
        document.getElementById('disc-graves-cant').value = 0;
        document.getElementById('disc-gravisimas-cant').value = 0;
        document.getElementById('disc-nucleo').value = 'NUEVA ESPARTA';
        
        // Ocultar panel de datos personales
        document.getElementById('datos-personales-panel').classList.add('hidden');

        // Limpiar búsqueda
        this.limpiarBusqueda();
        
        console.log('🧹 Formulario limpiado completamente');
    }
};

// Exportar funciones globales
window.buscarEstudiante = function() { window.modules.disciplina.buscarPorCedula(); };
window.guardarRegistro = function() { window.modules.disciplina.guardarRegistro(); };
window.limpiarFormulario = function() { window.modules.disciplina.limpiarFormulario(); };
window.filtrarRegistros = function(filtro) { window.modules.disciplina.filtrarRegistros(filtro); };
window.generarReporteProceso = function() { Swal.fire('ℹ️ Info', 'Generación de reporte de proceso en desarrollo', 'info'); };
window.generarReporteBajas = function() { Swal.fire('ℹ️ Info', 'Generación de reporte de bajas en desarrollo', 'info'); };

window.cerrarSesion = function() {
    if (window.supabaseClient) {
        window.supabaseClient.auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    } else {
        window.location.href = 'index.html';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.modules && window.modules.disciplina) {
        window.modules.disciplina.init();
    }
});

console.log('✅ Módulo Consejo Disciplinario v3.1 Cargado');
