/**
 * MÓDULO CONSEJO DISCIPLINARIO 2026
 * Versión: 4.1 - Actualización mejorada de tabla estudiantes
 */

window.modules = window.modules || {};
window.modules.disciplina = {
    registroActualId: null,
    filtroActual: 'TODOS',
    datosCache: [],

    init: async function() {
        console.log('🚀 Iniciando módulo Disciplinario v4.1...');
        await this.cargarLista();
        
        const inputBusqueda = document.getElementById('buscar-cedula');
        if (inputBusqueda) {
            inputBusqueda.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.buscarPorCedula();
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

    toggleFechasFalta: function(tipo) {
        const cantidad = Number(document.getElementById(`disc-${tipo}s-cant`).value) || 0;
        const gruposMap = {
            'leve': 'grupo-fechas-leves',
            'grave': 'grupo-fechas-graves',
            'gravisima': 'grupo-fechas-gravisimas'
        };
        const grupoId = gruposMap[tipo];
        const grupo = document.getElementById(grupoId);
        if (!grupo) return;

        if (cantidad > 0) {
            grupo.classList.remove('hidden');
            const container = grupo.querySelector('.grupo-fechas-container');
            if (container) {
                container.classList.remove('grupo-fechas-destacado');
                void container.offsetWidth;
                container.classList.add('grupo-fechas-destacado');
                setTimeout(() => container.classList.remove('grupo-fechas-destacado'), 1500);
            }
        } else {
            grupo.classList.add('hidden');
            if (tipo === 'leve') {
                document.getElementById('disc-fecha-leve').value = '';
                document.getElementById('disc-fecha-leve-recibida').value = '';
            } else if (tipo === 'grave') {
                document.getElementById('disc-fecha-grave').value = '';
                document.getElementById('disc-fecha-grave-recibida').value = '';
            } else if (tipo === 'gravisima') {
                document.getElementById('disc-fecha-gravisima').value = '';
                document.getElementById('disc-fecha-gravisima-recibida').value = '';
            }
        }
    },

    toggleFechaBaja: function() {
        const tipoBaja = document.getElementById('disc-tipo-baja').value;
        const grupoFechaBaja = document.getElementById('grupo-fecha-baja');
        if (!grupoFechaBaja) return;

        if (tipoBaja !== 'SELECCIONAR') {
            grupoFechaBaja.classList.remove('hidden');
            const container = grupoFechaBaja.querySelector('.grupo-fechas-container');
            if (container) {
                container.classList.remove('grupo-fechas-destacado');
                void container.offsetWidth;
                container.classList.add('grupo-fechas-destacado');
                setTimeout(() => container.classList.remove('grupo-fechas-destacado'), 1500);
            }
            if (!document.getElementById('disc-fecha-baja').value) {
                document.getElementById('disc-fecha-baja').value = new Date().toISOString().split('T')[0];
            }
        } else {
            grupoFechaBaja.classList.add('hidden');
            document.getElementById('disc-fecha-baja').value = '';
        }
    },

    actualizarVisibilidadFechas: function() {
        const leves = Number(document.getElementById('disc-leves-cant').value) || 0;
        const graves = Number(document.getElementById('disc-graves-cant').value) || 0;
        const gravisimas = Number(document.getElementById('disc-gravisimas-cant').value) || 0;
        
        document.getElementById('grupo-fechas-leves')?.classList.toggle('hidden', leves === 0);
        document.getElementById('grupo-fechas-graves')?.classList.toggle('hidden', graves === 0);
        document.getElementById('grupo-fechas-gravisimas')?.classList.toggle('hidden', gravisimas === 0);
        
        const grupoBaja = document.getElementById('grupo-fecha-baja');
        const tipoBaja = document.getElementById('disc-tipo-baja').value;
        if (grupoBaja) {
            grupoBaja.classList.toggle('hidden', tipoBaja === 'SELECCIONAR');
        }
    },

    cargarLista: async function() {
        const tbody = document.getElementById('lista-disciplina-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="10" class="text-center p-8"><div class="animate-pulse text-blue-600 font-bold">⏳ Cargando registros disciplinarios...</div></td></tr>';

        try {
            const { data, error } = await window.supabaseClient.from('disc_registros').select('*').order('id', { ascending: false });
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
                        cedula: reg.cedula, nombres: reg.nombres, apellidos: reg.apellidos,
                        pnf: reg.pnf, proceso: reg.proceso, estatus_general: reg.estatus_general,
                        _total_leves: 0, _total_graves: 0, _total_gravisimas: 0,
                        _ids_registros: [], _ultimo_id: reg.id
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
            if (this.filtroActual === 'ACTIVOS') datosFiltrados = datosFiltrados.filter(e => e.estatus_general === 'ACTIVO');
            else if (this.filtroActual === 'INACTIVOS') datosFiltrados = datosFiltrados.filter(e => e.estatus_general === 'INACTIVO');

            datosFiltrados.sort((a, b) => {
                if (a.estatus_general === 'ACTIVO' && b.estatus_general === 'INACTIVO') return -1;
                if (a.estatus_general === 'INACTIVO' && b.estatus_general === 'ACTIVO') return 1;
                if (b._total_gravisimas !== a._total_gravisimas) return b._total_gravisimas - a._total_gravisimas;
                if (b._total_graves !== a._total_graves) return b._total_graves - a._total_graves;
                if (b._total_leves !== a._total_leves) return b._total_leves - a._total_leves;
                return a.apellidos.localeCompare(b.apellidos);
            });

            datosFiltrados.forEach(est => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-blue-50 border-b border-gray-100 transition';
                const leveClass = est._total_leves > 0 ? 'bg-yellow-200 text-yellow-800 font-bold' : 'bg-gray-100 text-gray-500';
                const graveClass = est._total_graves > 0 ? 'bg-red-200 text-red-800 font-bold' : 'bg-gray-100 text-gray-500';
                const gravisimaClass = est._total_gravisimas > 0 ? 'bg-gray-800 text-white font-bold' : 'bg-gray-100 text-gray-500';
                const statusBadge = (est.estatus_general === 'ACTIVO') ? '<span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-bold shadow-sm">ACTIVO</span>' : '<span class="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 font-bold shadow-sm">INACTIVO</span>';

                const esBaja = est.estatus_general === 'INACTIVO';
                const actionIcon = esBaja ? 
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>' :
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>';
                const actionBg = esBaja ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600';
                const actionTitle = esBaja ? 'Estudiante de Baja' : 'Ver Detalle';

                tr.innerHTML = `
                    <td class="p-2 text-sm text-gray-600 font-mono">${est._ultimo_id}</td>
                    <td class="p-2 text-sm font-bold text-gray-800">${est.cedula}</td>
                    <td class="p-2 text-sm text-gray-700">${est.nombres} ${est.apellidos}</td>
                    <td class="p-2 text-xs uppercase font-bold tracking-wide text-gray-600 hidden md:table-cell">${est.pnf}</td>
                    <td class="p-2 text-sm hidden md:table-cell"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">${est.proceso}</span></td>
                    <td class="p-2">${statusBadge}</td>
                    <td class="p-2 text-center"><span class="${leveClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_leves}</span></td>
                    <td class="p-2 text-center"><span class="${graveClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_graves}</span></td>
                    <td class="p-2 text-center"><span class="${gravisimaClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_gravisimas}</span></td>
                    <td class="p-2 text-center">
                        <div class="flex justify-center gap-1">
                            <button onclick="window.modules.disciplina.abrirModalDetalle('${est.cedula}')" class="${actionBg} text-white px-2 py-1 rounded text-xs font-bold transition shadow-sm flex items-center justify-center" title="${actionTitle}">
                                ${actionIcon}
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error('❌ Error cargando lista:', e);
            tbody.innerHTML = '<tr><td colspan="10" class="text-center p-8 text-red-500 font-bold">❌ Error al cargar datos.</td></tr>';
        }
    },

    buscarPorCedula: async function() {
        const cedulaInput = document.getElementById('buscar-cedula').value.trim();
        if (!cedulaInput) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'Ingrese una cédula', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            return;
        }
        const cedulaNumeros = cedulaInput.replace(/[^0-9]/g, '');
        try {
            const { data: estudiantesData, error: errorEst } = await window.supabaseClient.from('estudiantes').select(`id, cedula, nombres, apellidos, genero, proceso, status, ambiente, categoria, trayecto_id, pnf:pnf_id(nombre)`).or(`cedula.ilike.%${cedulaNumeros}%,cedula.ilike.%V-${cedulaNumeros}%,cedula.ilike.%E-${cedulaNumeros}%`).limit(1);
            if (errorEst) throw errorEst;
            let estudiante = estudiantesData && estudiantesData.length > 0 ? estudiantesData[0] : null;

            if (estudiante) {
                if (!estudiante.pnf || !estudiante.pnf.nombre) {
                    const { data: discData } = await window.supabaseClient.from('disc_registros').select('pnf').eq('cedula', estudiante.cedula).limit(1).maybeSingle();
                    if (discData && discData.pnf) estudiante.pnf = { nombre: discData.pnf };
                }
                this.llenarFormularioEstudiante(estudiante);
                this.mostrarFiltroActivo(cedulaInput);
                document.getElementById('datos-personales-panel').classList.remove('hidden');

                const { data: registrosDisc } = await window.supabaseClient.from('disc_registros').select('*').eq('cedula', estudiante.cedula).order('id', { ascending: false });
                const totalRegistros = registrosDisc ? registrosDisc.length : 0;
                const totalLeves = registrosDisc ? registrosDisc.reduce((sum, r) => sum + (r.faltas_leves_cant || 0), 0) : 0;
                const totalGraves = registrosDisc ? registrosDisc.reduce((sum, r) => sum + (r.faltas_graves_cant || 0), 0) : 0;
                const totalGravisimas = registrosDisc ? registrosDisc.reduce((sum, r) => sum + (r.faltas_gravisimas_cant || 0), 0) : 0;

                let estaDeBaja = false;
                let tipoBajaEstudiante = null;
                let fechaBajaEstudiante = null;

                if (registrosDisc && registrosDisc.length > 0) {
                    const registroBaja = registrosDisc.find(r => r.tipo_baja && r.tipo_baja !== 'SELECCIONAR');
                    if (registroBaja) {
                        estaDeBaja = true;
                        tipoBajaEstudiante = registroBaja.tipo_baja;
                        fechaBajaEstudiante = registroBaja.fecha_baja;
                    }
                }

                const tipoBajaFormateado = tipoBajaEstudiante 
                    ? tipoBajaEstudiante.replace('BAJA_', '').replace(/_/g, ' ')
                    : '';

                Swal.fire({
                    title: estaDeBaja ? '🚫 ESTUDIANTE DE BAJA' : `👤 ${estudiante.nombres} ${estudiante.apellidos}`,
                    html: estaDeBaja ? `
                        <div class="text-left text-sm">
                            <div class="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-3">
                                <p class="text-xs text-gray-600 mb-1"><strong>Cédula:</strong></p>
                                <p class="text-lg font-bold text-gray-800 mb-3">${estudiante.cedula || 'N/A'}</p>
                                
                                <p class="text-xs text-gray-600 mb-1"><strong>Nombre:</strong></p>
                                <p class="text-base font-semibold text-gray-800 mb-3">${estudiante.nombres} ${estudiante.apellidos}</p>
                                
                                <p class="text-xs text-gray-600 mb-1"><strong>PNF:</strong></p>
                                <p class="text-base font-semibold text-blue-700 mb-3">${estudiante.pnf?.nombre || estudiante.pnf || 'N/A'}</p>
                                
                                <p class="text-xs text-gray-600 mb-1"><strong>Motivo de Baja:</strong></p>
                                <p class="text-base font-bold text-red-700 mb-3">${tipoBajaFormateado}</p>
                                
                                <p class="text-xs text-gray-600 mb-1"><strong>Fecha de Baja:</strong></p>
                                <p class="text-base font-semibold text-gray-800">${fechaBajaEstudiante ? this.formatearFecha(fechaBajaEstudiante) : 'No registrada'}</p>
                            </div>
                            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                                <p class="text-sm text-yellow-800 text-center font-semibold">
                                    ⚠️ Este estudiante no puede ser registrado nuevamente.
                                </p>
                            </div>
                        </div>
                    ` : `
                        <div style="text-align: left; font-size: 14px; line-height: 1.8;">
                            <h3 style="border-bottom: 2px solid #3b82f6; padding-bottom: 5px; color: #3b82f6; margin-top: 0; font-size: 16px;">📋 DATOS PERSONALES</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <p><strong>Cédula:</strong> ${estudiante.cedula || 'N/A'}</p>
                                <p><strong>Género:</strong> ${estudiante.genero || 'N/A'}</p>
                                <p><strong>Núcleo:</strong> ${estudiante.nucleo || 'NUEVA ESPARTA'}</p>
                                <p><strong>Ambiente:</strong> ${estudiante.ambiente || 'N/A'}</p>
                            </div>
                            
                            <h3 style="border-bottom: 2px solid #10b981; padding-bottom: 5px; color: #10b981; margin-top: 15px; font-size: 16px;">🎓 DATOS ACADÉMICOS</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <p><strong>PNF:</strong> ${estudiante.pnf?.nombre || estudiante.pnf || 'N/A'}</p>
                                <p><strong>Proceso:</strong> ${estudiante.proceso || 'N/A'}</p>
                                <p><strong>Categoría:</strong> ${estudiante.categoria || 'N/A'}</p>
                                <p><strong>Trayecto:</strong> ${estudiante.trayecto_id ? 'Asignado' : 'No asignado'}</p>
                            </div>

                            <h3 style="border-bottom: 2px solid #f59e0b; padding-bottom: 5px; color: #f59e0b; margin-top: 15px; font-size: 16px;">📊 ESTADÍSTICAS DISCIPLINARIAS</h3>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center;">
                                <div style="background: #fef3c7; padding: 8px; border-radius: 5px;"><strong style="color: #d97706;">${totalLeves}</strong><br><span style="font-size: 12px;">Leves</span></div>
                                <div style="background: #fee2e2; padding: 8px; border-radius: 5px;"><strong style="color: #dc2626;">${totalGraves}</strong><br><span style="font-size: 12px;">Graves</span></div>
                                <div style="background: #1f2937; color: white; padding: 8px; border-radius: 5px;"><strong style="color: white;">${totalGravisimas}</strong><br><span style="font-size: 12px;">Gravísimas</span></div>
                            </div>
                            <p style="margin-top: 10px; text-align: center;"><strong>Total Registros:</strong> ${totalRegistros}</p>
                            
                            <h3 style="border-bottom: 2px solid ${estudiante.status === 'Activo' ? '#10b981' : '#ef4444'}; padding-bottom: 5px; color: ${estudiante.status === 'Activo' ? '#10b981' : '#ef4444'}; margin-top: 15px; font-size: 16px;">ESTATUS GENERAL</h3>
                            <p style="text-align: center; font-size: 16px;">
                                <span style="padding: 5px 15px; border-radius: 20px; background: ${estudiante.status === 'Activo' ? '#d1fae5' : '#fee2e2'}; color: ${estudiante.status === 'Activo' ? '#065f46' : '#991b1b'}; font-weight: bold;">
                                    ${estudiante.status || 'ACTIVO'}
                                </span>
                            </p>
                        </div>
                    `,
                    width: estaDeBaja ? '450px' : '700px',
                    padding: estaDeBaja ? '20px' : '25px',
                    showCloseButton: true,
                    showCancelButton: false,
                    confirmButtonText: 'Aceptar',
                    confirmButtonColor: estaDeBaja ? '#dc2626' : '#3b82f6',
                    focusConfirm: false,
                    customClass: {
                        popup: 'rounded-xl shadow-2xl'
                    },
                    background: estaDeBaja ? '#fef2f2' : '#ffffff'
                });

                if (registrosDisc && registrosDisc.length > 0) await this.renderizarTablaFiltrada(registrosDisc);
                else document.getElementById('lista-disciplina-body').innerHTML = '<tr><td colspan="10" class="text-center p-8 text-gray-500">📭 No hay registros disciplinarios</td></tr>';
                return;
            }

            // Fallback: buscar en DISC_REGISTROS
            console.log('⚠️ No encontrado en ESTUDIANTES, buscando en DISC_REGISTROS...');

            const { data: registrosDiscFallback } = await window.supabaseClient
                .from('disc_registros')
                .select('*')
                .or(`cedula.ilike.%${cedulaNumeros}%`)
                .order('id', { ascending: false });

            if (registrosDiscFallback && registrosDiscFallback.length > 0) {
                // Buscar si hay un registro de baja
                const registroBaja = registrosDiscFallback.find(r => 
                    r.tipo_baja && r.tipo_baja !== 'SELECCIONAR' && r.estatus_general === 'INACTIVO'
                );
                
                const reg = registroBaja || registrosDiscFallback[0]; // Priorizar el de baja
                
                const estudianteFake = { 
                    cedula: reg.cedula, 
                    nombres: reg.nombres, 
                    apellidos: reg.apellidos, 
                    genero: reg.genero || 'SELECCIONAR', 
                    pnf: reg.pnf, 
                    proceso: reg.proceso 
                };
                
                this.llenarFormularioEstudiante(estudianteFake);
                this.mostrarFiltroActivo(cedulaInput);
                document.getElementById('datos-personales-panel').classList.remove('hidden');
                
                await this.renderizarTablaFiltrada(registrosDiscFallback);

                // Si hay registro de baja, mostrar modal compacto de baja
                if (registroBaja) {
                    const tipoBajaFormateado = registroBaja.tipo_baja 
                        ? registroBaja.tipo_baja.replace('BAJA_', '').replace(/_/g, ' ')
                        : '';
                    
                    Swal.fire({
                        title: '🚫 ESTUDIANTE DE BAJA',
                        html: `
                            <div class="text-left text-sm">
                                <div class="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-3">
                                    <p class="text-xs text-gray-600 mb-1"><strong>Cédula:</strong></p>
                                    <p class="text-lg font-bold text-gray-800 mb-3">${registroBaja.cedula || 'N/A'}</p>
                                    
                                    <p class="text-xs text-gray-600 mb-1"><strong>Nombre:</strong></p>
                                    <p class="text-base font-semibold text-gray-800 mb-3">${registroBaja.nombres} ${registroBaja.apellidos}</p>
                                    
                                    <p class="text-xs text-gray-600 mb-1"><strong>PNF:</strong></p>
                                    <p class="text-base font-semibold text-blue-700 mb-3">${registroBaja.pnf || 'N/A'}</p>
                                    
                                    <p class="text-xs text-gray-600 mb-1"><strong>Motivo de Baja:</strong></p>
                                    <p class="text-base font-bold text-red-700 mb-3">${tipoBajaFormateado}</p>
                                    
                                    <p class="text-xs text-gray-600 mb-1"><strong>Fecha de Baja:</strong></p>
                                    <p class="text-base font-semibold text-gray-800">${registroBaja.fecha_baja ? this.formatearFecha(registroBaja.fecha_baja) : 'No registrada'}</p>
                                </div>
                                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                                    <p class="text-sm text-yellow-800 text-center font-semibold">
                                        ⚠️ Este estudiante no puede ser registrado nuevamente.
                                    </p>
                                </div>
                            </div>
                        `,
                        width: '450px',
                        padding: '20px',
                        showCloseButton: true,
                        showCancelButton: false,
                        confirmButtonText: 'Aceptar',
                        confirmButtonColor: '#dc2626',
                        focusConfirm: false,
                        customClass: {
                            popup: 'rounded-xl shadow-2xl'
                        },
                        background: '#fef2f2'
                    });
                } else {
                    Swal.fire('⚠️ Solo en Disciplina', 'Datos obtenidos de registros históricos', 'warning');
                }
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
            console.error('❌ Error:', e);
            Swal.fire({ icon: 'error', title: 'Error', text: e.message });
        }
    },
    
    llenarFormularioEstudiante: function(est) {
        this.registroActualId = null;
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
        setVal('disc-cedula', est.cedula);
        setVal('disc-nombres', est.nombres);
        setVal('disc-apellidos', est.apellidos);
        setVal('disc-genero', est.genero ? est.genero.toUpperCase() : 'SELECCIONAR');
        let pnfNombre = '';
        if (est.pnf) {
            if (typeof est.pnf === 'object' && est.pnf.nombre) pnfNombre = est.pnf.nombre;
            else if (typeof est.pnf === 'string') pnfNombre = est.pnf;
        }
        setVal('disc-pnf', pnfNombre);
        setVal('disc-proceso', est.proceso || '');
        setVal('disc-nucleo', 'NUEVA ESPARTA');
        setVal('disc-tipo-baja', 'SELECCIONAR');
        setVal('disc-estatus-general', 'ACTIVO');
        setVal('disc-leves-cant', 0); setVal('disc-graves-cant', 0); setVal('disc-gravisimas-cant', 0);
        setVal('disc-causal-graves', ''); setVal('disc-programa-supervision', '');
        setVal('disc-acta-compromiso', ''); setVal('disc-observaciones', '');
        ['disc-fecha-baja', 'disc-fecha-leve', 'disc-fecha-leve-recibida', 'disc-fecha-grave', 'disc-fecha-grave-recibida', 'disc-fecha-gravisima', 'disc-fecha-gravisima-recibida', 'disc-fecha-incidencia', 'disc-fecha-consejo'].forEach(id => setVal(id, ''));
        document.getElementById('grupo-fechas-leves')?.classList.add('hidden');
        document.getElementById('grupo-fechas-graves')?.classList.add('hidden');
        document.getElementById('grupo-fechas-gravisimas')?.classList.add('hidden');
        document.getElementById('grupo-fecha-baja')?.classList.add('hidden');

            // ✅ AGREGAR ESTO: Actualizar dropdown de estatus según el status del estudiante
            if (est.status) {
                const statusNormalizado = est.status.toUpperCase() === 'INACTIVO' || est.status.toUpperCase() === 'BAJA' ? 'INACTIVO' : 'ACTIVO';
                setVal('disc-estatus-general', statusNormalizado);
            }
        
    },

    llenarFormulario: function(data) {
        this.registroActualId = data.id;
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
        setVal('disc-cedula', data.cedula); setVal('disc-nombres', data.nombres); setVal('disc-apellidos', data.apellidos);
        setVal('disc-genero', data.genero || 'SELECCIONAR'); setVal('disc-pnf', data.pnf); setVal('disc-proceso', data.proceso);
        setVal('disc-nucleo', data.nucleo || 'NUEVA ESPARTA'); setVal('disc-supervision', data.supervision_continua || 'NO APLICA');
        setVal('disc-tipo-baja', data.tipo_baja || 'SELECCIONAR');
        setVal('disc-fecha-baja', data.fecha_baja); setVal('disc-fecha-leve', data.faltas_leves_fecha);
        setVal('disc-fecha-leve-recibida', data.fecha_falta_leve_recibida); setVal('disc-fecha-grave', data.faltas_graves_fecha);
        setVal('disc-fecha-grave-recibida', data.faltas_graves_fecha_recibida); setVal('disc-fecha-gravisima', data.faltas_gravisima_fecha);
        setVal('disc-fecha-gravisima-recibida', data.faltas_gravisima_fecha_recibida); setVal('disc-fecha-incidencia', data.fecha_incidencia_estudiante);
        setVal('disc-fecha-consejo', data.consejo_disciplinario_fecha);
        setVal('disc-leves-cant', data.faltas_leves_cant || 0); setVal('disc-graves-cant', data.faltas_graves_cant || 0); setVal('disc-gravisimas-cant', data.faltas_gravisimas_cant || 0);
        setVal('disc-causal-graves', data.causal_faltas_graves_impuesta || ''); setVal('disc-programa-supervision', data.programa_supervision_intensiva_aplicado_grave_impuesta || '');
        setVal('disc-acta-compromiso', data.acta_compromiso || ''); setVal('disc-observaciones', data.observaciones_jefe || '');
        setVal('disc-estatus-general', data.estatus_general || 'ACTIVO');
        this.actualizarVisibilidadFechas();
        if(window.innerWidth < 1024) document.querySelector('.lg\\:col-span-1')?.scrollIntoView({ behavior: 'smooth' });
    },

    abrirModalDetalle: function(cedula) {
        const registros = this.datosCache.filter(r => r.cedula === cedula.toUpperCase());
        if (registros.length === 0) { Swal.fire('ℹ️ Info', 'No se encontraron registros disciplinarios para esta cédula', 'info'); return; }

        document.getElementById('modal-cedula').textContent = registros[0].cedula;
        document.getElementById('modal-estudiante').textContent = `${registros[0].nombres} ${registros[0].apellidos}`;
        document.getElementById('modal-total').textContent = registros.length;

        const registrosOrdenados = [...registros].sort((a, b) => b.id - a.id);
        const tbody = document.getElementById('modal-body-faltas');
        tbody.innerHTML = '';

        registrosOrdenados.forEach(reg => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-blue-50 transition';
            
            let fechaMostrar = '-';
            let tipoRegistro = '<span class="text-gray-400 text-[10px]">-</span>';
            
            if (reg.tipo_baja && reg.tipo_baja !== 'SELECCIONAR') {
                fechaMostrar = reg.fecha_baja ? this.formatearFecha(reg.fecha_baja) : 'Sin fecha';
                const tipoBajaTexto = reg.tipo_baja.replace('BAJA_', '').replace(/_/g, ' ');
                tipoRegistro = `<span class="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-800">🚫 ${tipoBajaTexto}</span>`;
            } else {
                if (reg.faltas_leves_cant > 0 && reg.faltas_leves_fecha) fechaMostrar = this.formatearFecha(reg.faltas_leves_fecha);
                if (reg.faltas_graves_cant > 0 && reg.faltas_graves_fecha) fechaMostrar = this.formatearFecha(reg.faltas_graves_fecha);
                if (reg.faltas_gravisimas_cant > 0 && reg.faltas_gravisima_fecha) fechaMostrar = this.formatearFecha(reg.faltas_gravisima_fecha);
                if (fechaMostrar === '-' && reg.fecha_incidencia_estudiante) fechaMostrar = this.formatearFecha(reg.fecha_incidencia_estudiante);
                
                if (reg.faltas_leves_cant > 0) tipoRegistro = '<span class="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800">📋 LEVE</span>';
                else if (reg.faltas_graves_cant > 0) tipoRegistro = '<span class="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-800">⚠️ GRAVE</span>';
                else if (reg.faltas_gravisimas_cant > 0) tipoRegistro = '<span class="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-gray-800 text-white">🔴 GRAVÍSIMA</span>';
            }

            const leveClass = reg.faltas_leves_cant > 0 ? 'bg-yellow-200 text-yellow-800 font-bold' : 'text-gray-400';
            const graveClass = reg.faltas_graves_cant > 0 ? 'bg-red-200 text-red-800 font-bold' : 'text-gray-400';
            const gravisimaClass = reg.faltas_gravisimas_cant > 0 ? 'bg-gray-800 text-white font-bold' : 'text-gray-400';

            tr.innerHTML = `
                <td class="p-2 text-center font-mono text-gray-600 font-semibold">${reg.id}</td>
                <td class="p-2 text-left font-medium text-gray-800">${fechaMostrar}</td>
                <td class="p-2 text-center"><span class="${leveClass} px-2 py-1 rounded text-[10px] font-bold">${reg.faltas_leves_cant || 0}</span></td>
                <td class="p-2 text-center"><span class="${graveClass} px-2 py-1 rounded text-[10px] font-bold">${reg.faltas_graves_cant || 0}</span></td>
                <td class="p-2 text-center"><span class="${gravisimaClass} px-2 py-1 rounded text-[10px] font-bold">${reg.faltas_gravisimas_cant || 0}</span></td>
                <td class="p-2 text-center">${tipoRegistro}</td>
                <td class="p-2 text-center">
                    <div class="flex justify-center gap-1">
                        <button onclick="window.modules.disciplina.editarDesdeModal(${reg.id})" class="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded transition shadow-sm" title="Editar">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onclick="window.modules.disciplina.eliminarRegistroFalta(${reg.id})" class="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded transition shadow-sm" title="Eliminar Registro">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
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
            Swal.fire({ icon: 'info', title: 'Registro Cargado', text: 'Edita los campos y presiona Guardar', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        }
    },

    eliminarRegistroFalta: async function(id) {
        const registro = this.datosCache.find(r => r.id === id);
        if (!registro) { Swal.fire('Error', 'No se encontró el registro', 'error'); return; }

        const confirmacion = await Swal.fire({
            icon: 'warning',
            title: '¿Eliminar Registro de Falta?',
            html: `
                <div class="text-left">
                    <p class="mb-2">Se eliminará permanentemente el registro <strong>#${id}</strong> de:</p>
                    <p class="text-gray-700 mb-2"><strong>Estudiante:</strong> ${registro.nombres} ${registro.apellidos}</p>
                    <p class="text-gray-700 mb-2"><strong>Cédula:</strong> ${registro.cedula}</p>
                    <div class="bg-red-50 border-l-4 border-red-400 p-2 mt-3">
                        <p class="text-sm text-red-700"><strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer y eliminará el registro de la base de datos.</p>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar registro',
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        });

        if (!confirmacion.isConfirmed) return;

        try {
            const { error } = await window.supabaseClient.from('disc_registros').delete().eq('id', id);
            if (error) throw error;

            Swal.fire({ icon: 'success', title: '✅ Registro Eliminado', text: `El registro #${id} ha sido eliminado correctamente`, timer: 2000, showConfirmButton: false });
            this.cerrarModal();
            await this.cargarLista();
        } catch (e) {
            console.error('❌ Error al eliminar registro:', e);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el registro: ' + e.message });
        }
    },

    cerrarModal: function() { document.getElementById('modal-detalle').classList.add('hidden'); document.body.style.overflow = ''; },

    renderizarTablaFiltrada: async function(registrosFiltrados) {
        const tbody = document.getElementById('lista-disciplina-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!registrosFiltrados || registrosFiltrados.length === 0) { tbody.innerHTML = '<tr><td colspan="10" class="text-center p-8 text-gray-500">No hay registros</td></tr>'; return; }

        const estudiantesUnicos = {};
        registrosFiltrados.forEach(reg => {
            if (!estudiantesUnicos[reg.cedula]) {
                estudiantesUnicos[reg.cedula] = { cedula: reg.cedula, nombres: reg.nombres, apellidos: reg.apellidos, pnf: reg.pnf, proceso: reg.proceso, estatus_general: reg.estatus_general, _total_leves: 0, _total_graves: 0, _total_gravisimas: 0, _ids_registros: [], _ultimo_id: reg.id };
            }
            estudiantesUnicos[reg.cedula]._total_leves += (reg.faltas_leves_cant || 0);
            estudiantesUnicos[reg.cedula]._total_graves += (reg.faltas_graves_cant || 0);
            estudiantesUnicos[reg.cedula]._total_gravisimas += (reg.faltas_gravisimas_cant || 0);
            estudiantesUnicos[reg.cedula]._ids_registros.push(reg.id);
            if (reg.id > estudiantesUnicos[reg.cedula]._ultimo_id) { estudiantesUnicos[reg.cedula].nombres = reg.nombres; estudiantesUnicos[reg.cedula].apellidos = reg.apellidos; estudiantesUnicos[reg.cedula].estatus_general = reg.estatus_general; }
        });

        Object.values(estudiantesUnicos).forEach(est => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-blue-50 border-b border-gray-100 transition';
            const leveClass = est._total_leves > 0 ? 'bg-yellow-200 text-yellow-800 font-bold' : 'bg-gray-100 text-gray-500';
            const graveClass = est._total_graves > 0 ? 'bg-red-200 text-red-800 font-bold' : 'bg-gray-100 text-gray-500';
            const gravisimaClass = est._total_gravisimas > 0 ? 'bg-gray-800 text-white font-bold' : 'bg-gray-100 text-gray-500';
            const statusBadge = (est.estatus_general === 'ACTIVO') ? '<span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-bold shadow-sm">ACTIVO</span>' : '<span class="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 font-bold shadow-sm">INACTIVO</span>';

            const esBaja = est.estatus_general === 'INACTIVO';
            const actionIcon = esBaja ? 
                '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>' :
                '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>';
            const actionBg = esBaja ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600';
            const actionTitle = esBaja ? 'Estudiante de Baja' : 'Ver Detalle';

            tr.innerHTML = `
                <td class="p-2 text-sm text-gray-600 font-mono">${est._ultimo_id}</td>
                <td class="p-2 text-sm font-bold text-gray-800">${est.cedula}</td>
                <td class="p-2 text-sm text-gray-700">${est.nombres} ${est.apellidos}</td>
                <td class="p-2 text-xs uppercase font-bold tracking-wide text-gray-600 hidden md:table-cell">${est.pnf}</td>
                <td class="p-2 text-sm hidden md:table-cell"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">${est.proceso}</span></td>
                <td class="p-2">${statusBadge}</td>
                <td class="p-2 text-center"><span class="${leveClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_leves}</span></td>
                <td class="p-2 text-center"><span class="${graveClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_graves}</span></td>
                <td class="p-2 text-center"><span class="${gravisimaClass} px-2 py-1 rounded text-xs shadow-sm">${est._total_gravisimas}</span></td>
                <td class="p-2 text-center">
                    <div class="flex justify-center gap-1">
                        <button onclick="window.modules.disciplina.abrirModalDetalle('${est.cedula}')" class="${actionBg} text-white px-2 py-1 rounded text-xs font-bold transition shadow-sm flex items-center justify-center" title="${actionTitle}">
                            ${actionIcon}
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    guardarRegistro: async function() {
        const cedula = document.getElementById('disc-cedula').value.trim();
        if (!cedula) {
            Swal.fire({ icon: 'warning', title: 'Atención', text: 'Primero busque y seleccione un estudiante', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
            return;
        }

        const estatus = document.getElementById('disc-estatus-general').value;
        const tipoBaja = document.getElementById('disc-tipo-baja').value;
        const hayBaja = (tipoBaja !== 'SELECCIONAR');

        const levesCant = Number(document.getElementById('disc-leves-cant').value) || 0;
        const gravesCant = Number(document.getElementById('disc-graves-cant').value) || 0;
        const gravisimasCant = Number(document.getElementById('disc-gravisimas-cant').value) || 0;

        // ✅ DECLARAR VARIABLES AL INICIO (fuera de cualquier if)
        const nombres = document.getElementById('disc-nombres').value.trim();
        const apellidos = document.getElementById('disc-apellidos').value.trim();
        const pnf = document.getElementById('disc-pnf').value.trim();
        const proceso = document.getElementById('disc-proceso').value.trim();

        let tiposDeFaltaSeleccionados = 0;
        if (levesCant > 0) tiposDeFaltaSeleccionados++;
        if (gravesCant > 0) tiposDeFaltaSeleccionados++;
        if (gravisimasCant > 0) tiposDeFaltaSeleccionados++;

        if (tiposDeFaltaSeleccionados > 1) {
            Swal.fire({
                icon: 'error',
                title: '⚠️ Regla de Negocio',
                html: '<p class="text-sm">Solo se permite guardar <strong>UN tipo de falta</strong> a la vez (Leve, Grave o Gravísima).</p><p class="text-xs text-gray-500 mt-2">Por favor, deje en 0 los otros tipos de falta.</p>',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        if (tiposDeFaltaSeleccionados === 0 && !hayBaja) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ Registro Incompleto',
                html: '<p class="text-sm">Debe registrar al menos una falta o seleccionar un Tipo de Baja.</p>',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        const erroresFechas = [];

        if (levesCant > 0) {
            if (!document.getElementById('disc-fecha-leve').value) erroresFechas.push('Fecha de Falta Leve');
            if (!document.getElementById('disc-fecha-leve-recibida').value) erroresFechas.push('Fecha Recibida de Falta Leve');
        }

        if (gravesCant > 0) {
            if (!document.getElementById('disc-fecha-grave').value) erroresFechas.push('Fecha de Falta Grave');
            if (!document.getElementById('disc-fecha-grave-recibida').value) erroresFechas.push('Fecha Recibida de Falta Grave');
        }

        if (gravisimasCant > 0) {
            if (!document.getElementById('disc-fecha-gravisima').value) erroresFechas.push('Fecha de Falta Gravísima');
            if (!document.getElementById('disc-fecha-gravisima-recibida').value) erroresFechas.push('Fecha Recibida de Falta Gravísima');
        }

        if (hayBaja) {
            if (!document.getElementById('disc-fecha-baja').value) erroresFechas.push('Fecha de Baja');
        }

        if (erroresFechas.length > 0) {
            Swal.fire({
                icon: 'error',
                title: '⚠️ Fechas Incompletas',
                html: `
                    <div class="text-left text-sm">
                        <p class="mb-2">Debe completar las siguientes fechas obligatorias:</p>
                        <ul class="text-red-600 space-y-1 list-disc pl-5">
                            ${erroresFechas.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        // ==========================================
        // 🚨 ADVERTENCIA LLAMATIVA PARA BAJA
        // ==========================================
        if (hayBaja) {
            const fechaBaja = document.getElementById('disc-fecha-baja').value;
            const tipoBajaTexto = tipoBaja.replace('BAJA_', '').replace(/_/g, ' ');
            const fechaBajaFormateada = fechaBaja ? this.formatearFecha(fechaBaja) : 'No especificada';

            const confirm = await Swal.fire({
                icon: 'warning',
                title: '🚨 ADVERTENCIA: PROCESO DE BAJA',
                html: `
                    <div style="text-align: left; font-size: 14px;">
                        <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                            <p style="color: #dc2626; font-weight: bold; font-size: 16px; margin: 0 0 10px 0; text-align: center;">
                                ⚠️ ESTE ESTUDIANTE QUEDARÁ INACTIVO ⚠️
                            </p>
                            <p style="color: #7f1d1d; margin: 0; text-align: center; font-size: 13px;">
                                El cambio se aplicará en <strong>AMBAS tablas</strong>:<br>
                                <strong>• Tabla ESTUDIANTES</strong> (Matrícula)<br>
                                <strong>• Tabla DISC_REGISTROS</strong> (Disciplina)
                            </p>
                        </div>
                        
                        <div style="background: #f8fafc; border-radius: 8px; padding: 12px; border-left: 4px solid #3b82f6;">
                            <p style="margin: 5px 0;"><strong>👤 Estudiante:</strong> ${nombres} ${apellidos}</p>
                            <p style="margin: 5px 0;"><strong>🆔 Cédula:</strong> ${cedula}</p>
                            <p style="margin: 5px 0;"><strong>📚 PNF:</strong> ${pnf || 'N/A'}</p>
                            <p style="margin: 5px 0;"><strong>📅 Proceso:</strong> ${proceso || 'N/A'}</p>
                            <p style="margin: 5px 0;"><strong>📋 Tipo de Baja:</strong> <span style="color: #dc2626; font-weight: bold;">${tipoBajaTexto}</span></p>
                            <p style="margin: 5px 0;"><strong>📆 Fecha de Baja:</strong> ${fechaBajaFormateada}</p>
                        </div>
                        
                        <div style="background: #fef3c7; border-radius: 8px; padding: 10px; margin-top: 15px; border-left: 4px solid #f59e0b;">
                            <p style="margin: 0; color: #92400e; font-size: 13px; text-align: center;">
                                ⚠️ <strong>IMPORTANTE:</strong> Esta acción marcará al estudiante como <strong>INACTIVO</strong> en el sistema. No podrá ser registrado nuevamente hasta que sea reactivado por un administrador.
                            </p>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#6b7280',
                confirmButtonText: '✅ Sí, procesar la BAJA',
                cancelButtonText: '❌ Cancelar',
                reverseButtons: true,
                width: '600px',
                padding: '25px',
                background: '#ffffff',
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    title: 'text-red-600'
                }
            });

            if (!confirm.isConfirmed) return;
        }

        // ==========================================
        // PREPARAR DATOS Y GUARDAR
        // ==========================================
        let supervisionValor = document.getElementById('disc-supervision')?.value || 'NO';
        if (supervisionValor === 'NO APLICA' || supervisionValor === '') supervisionValor = 'NO';

        const datos = {
            cedula: cedula.toUpperCase(),
            nombres: nombres.toUpperCase(),
            apellidos: apellidos.toUpperCase(),
            genero: document.getElementById('disc-genero').value !== 'SELECCIONAR' ? document.getElementById('disc-genero').value : null,
            nucleo: document.getElementById('disc-nucleo').value.trim().toUpperCase() || 'NUEVA ESPARTA',
            pnf: pnf.toUpperCase(),
            proceso: proceso.toUpperCase(),
            supervision_continua: supervisionValor,
            tipo_baja: hayBaja ? tipoBaja : null,
            
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
            
            estatus_general: hayBaja ? 'INACTIVO' : estatus,
            faltas_leves_cant: levesCant,
            faltas_graves_cant: gravesCant,
            faltas_gravisimas_cant: gravisimasCant,
            creado_por: window.appState.usuarioActualId || null
        };

        console.log('💾 Datos a guardar:', datos);

        try {
            let result;
            if (this.registroActualId) {
                result = await window.supabaseClient.from('disc_registros').update(datos).eq('id', this.registroActualId);
            } else {
                result = await window.supabaseClient.from('disc_registros').insert([datos]).select();
                if (result.data && result.data.length > 0) {
                    this.registroActualId = result.data[0].id;
                }
            }

            if (result.error) throw result.error;

            // ✅ ACTUALIZAR AMBAS TABLAS SI HAY BAJA
            if (hayBaja) {
                console.log('========================================');
                console.log('🔄 PROCESANDO BAJA DEL ESTUDIANTE');
                console.log('========================================');
                console.log('Cédula:', cedula.toUpperCase());
                console.log('Tipo de Baja:', tipoBaja);
                console.log('Fecha de Baja:', document.getElementById('disc-fecha-baja').value);
                
                // Actualizar en tabla ESTUDIANTES
                console.log('\n1️⃣ Actualizando tabla ESTUDIANTES...');
                const estudiantesActualizado = await this.actualizarEstatusEstudiante(cedula.toUpperCase(), 'Inactivo');
                
                if (!estudiantesActualizado) {
                    console.warn('⚠️ No se pudo actualizar la tabla ESTUDIANTES');
                    console.warn('⚠️ El estudiante puede haber sido eliminado previamente de la matrícula');
                }

                // Actualizar otros registros en DISC_REGISTROS
                console.log('\n2️⃣ Actualizando otros registros en DISC_REGISTROS...');
                if (this.registroActualId) {
                    const { data: otrosRegistros, error: errorOtros } = await window.supabaseClient
                        .from('disc_registros')
                        .update({ estatus_general: 'INACTIVO' })
                        .eq('cedula', cedula.toUpperCase())
                        .neq('id', this.registroActualId)
                        .eq('estatus_general', 'ACTIVO')
                        .select();

                    if (errorOtros) {
                        console.error('❌ Error actualizando otros registros:', errorOtros.message);
                    } else {
                        console.log('✅ Otros registros actualizados:', otrosRegistros?.length || 0);
                    }
                }
                
                console.log('\n========================================');
                console.log('✅ PROCESO DE BAJA COMPLETADO');
                console.log('========================================\n');
            }

            Swal.fire({
                icon: 'success',
                title: hayBaja ? '✅ Baja Procesada Correctamente' : (this.registroActualId ? '✅ Registro Actualizado' : '✅ Nuevo Registro Guardado'),
                html: hayBaja 
                    ? `<p class="text-sm">El estudiante <strong>${nombres} ${apellidos}</strong> ha sido marcado como <strong class="text-red-600">INACTIVO</strong> en ambas tablas.</p>`
                    : 'La información disciplinaria se guardó correctamente',
                timer: 4000,
                showConfirmButton: false
            });

            await this.cargarLista();
            setTimeout(() => this.resaltarEstudianteEnTabla(cedula.toUpperCase()), 300);
            this.limpiarCamposDisciplinarios();

        } catch (e) {
            console.error('❌ Error al guardar:', e);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar: ' + e.message });
        }
    },

    actualizarEstatusEstudiante: async function(cedula, nuevoEstatus) {
        try {
            console.log('🔍 Buscando estudiante con cédula:', cedula);
            
            // Primero verificar si existe el estudiante
            const { data: estudianteExistente, error: errorBusqueda } = await window.supabaseClient
                .from('estudiantes')
                .select('id, status, cedula')
                .eq('cedula', cedula)
                .maybeSingle();

            if (errorBusqueda) {
                console.error('❌ Error buscando estudiante:', errorBusqueda.message);
                return false;
            }

            if (!estudianteExistente) {
                console.warn('⚠️ No se encontró el estudiante con cédula:', cedula);
                console.warn('💡 Esto puede deberse a que el estudiante fue eliminado de la tabla estudiantes pero existe en disc_registros');
                return false;
            }

            console.log('✅ Estudiante encontrado:', estudianteExistente);
            console.log('🔄 Actualizando status de:', estudianteExistente.status, 'a:', nuevoEstatus);

            // Actualizar el estatus
            const { data: resultado, error: errorUpdate } = await window.supabaseClient
                .from('estudiantes')
                .update({ status: nuevoEstatus })
                .eq('cedula', cedula)
                .select();

            if (errorUpdate) {
                console.error('❌ Error actualizando estatus en estudiantes:', errorUpdate.message);
                console.error('📋 Detalles del error:', errorUpdate);
                return false;
            }

            console.log('✅ Estatus actualizado correctamente en tabla ESTUDIANTES');
            console.log('📄 Resultado:', resultado);
            return true;

        } catch (e) {
            console.error('❌ Error crítico en actualizarEstatusEstudiante:', e);
            return false;
        }
    },
    
    limpiarCamposDisciplinarios: function() {
        this.registroActualId = null;
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        setVal('disc-tipo-baja', 'SELECCIONAR'); setVal('disc-estatus-general', 'ACTIVO'); setVal('disc-supervision', 'NO APLICA');
        setVal('disc-leves-cant', 0); setVal('disc-graves-cant', 0); setVal('disc-gravisimas-cant', 0);
        setVal('disc-causal-graves', ''); setVal('disc-programa-supervision', ''); setVal('disc-acta-compromiso', ''); setVal('disc-observaciones', '');
        ['disc-fecha-baja', 'disc-fecha-leve', 'disc-fecha-leve-recibida', 'disc-fecha-grave', 'disc-fecha-grave-recibida', 'disc-fecha-gravisima', 'disc-fecha-gravisima-recibida', 'disc-fecha-incidencia', 'disc-fecha-consejo'].forEach(id => setVal(id, ''));
        document.getElementById('grupo-fechas-leves')?.classList.add('hidden');
        document.getElementById('grupo-fechas-graves')?.classList.add('hidden');
        document.getElementById('grupo-fechas-gravisimas')?.classList.add('hidden');
        document.getElementById('grupo-fecha-baja')?.classList.add('hidden');
    },

    resaltarEstudianteEnTabla: function(cedula) {
        const tbody = document.getElementById('lista-disciplina-body');
        if (!tbody) return;
        tbody.querySelectorAll('tr').forEach(fila => {
            const celdaCedula = fila.querySelector('td:nth-child(2)');
            if (celdaCedula && celdaCedula.textContent.trim() === cedula) {
                fila.classList.add('bg-blue-100', 'transition', 'duration-500');
                fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => fila.classList.remove('bg-blue-100', 'transition', 'duration-500'), 3000);
            }
        });
    },

    eliminarEstudiante: async function(cedula) {
        const confirm = await Swal.fire({ icon: 'warning', title: '¿Eliminar registros?', text: `Se eliminarán TODOS los registros disciplinarios de la cédula ${cedula}`, showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' });
        if (!confirm.isConfirmed) return;
        try {
            const { error } = await window.supabaseClient.from('disc_registros').delete().eq('cedula', cedula.toUpperCase());
            if (error) throw error;
            Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Registros eliminados correctamente', timer: 2000, showConfirmButton: false });
            this.limpiarFormulario(); await this.cargarLista();
        } catch (e) { Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar: ' + e.message }); }
    },

    filtrarRegistros: function(filtro) { this.filtroActual = filtro; this.cargarLista(); },
    mostrarFiltroActivo: function(cedula) { document.getElementById('filtro-activo').classList.remove('hidden'); document.getElementById('cedula-filtrada').textContent = cedula; },
    limpiarBusqueda: function() { document.getElementById('buscar-cedula').value = ''; document.getElementById('filtro-activo').classList.add('hidden'); },
    limpiarTodo: function() { this.limpiarFormulario(); },

    limpiarFormulario: function() {
        this.registroActualId = null;
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.id !== 'buscar-cedula') {
                if (el.tagName === 'SELECT') {
                    if (el.id === 'disc-genero') el.value = 'SELECCIONAR';
                    else if (el.id === 'disc-tipo-baja') el.value = 'SELECCIONAR';
                    else if (el.id === 'disc-supervision') el.value = 'NO APLICA';
                    else if (el.id === 'disc-estatus-general') el.value = 'ACTIVO';
                    else el.selectedIndex = 0;
                } else if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
                else el.value = '';
            }
        });
        document.getElementById('disc-leves-cant').value = 0;
        document.getElementById('disc-graves-cant').value = 0;
        document.getElementById('disc-gravisimas-cant').value = 0;
        document.getElementById('disc-nucleo').value = 'NUEVA ESPARTA';
        document.getElementById('grupo-fechas-leves')?.classList.add('hidden');
        document.getElementById('grupo-fechas-graves')?.classList.add('hidden');
        document.getElementById('grupo-fechas-gravisimas')?.classList.add('hidden');
        document.getElementById('grupo-fecha-baja')?.classList.add('hidden');
        document.getElementById('datos-personales-panel').classList.add('hidden');
        this.limpiarBusqueda(); this.cargarLista();
        setTimeout(() => { const inputBusqueda = document.getElementById('buscar-cedula'); if (inputBusqueda) { inputBusqueda.value = ''; inputBusqueda.focus(); } }, 100);
    }
};

// Exportar funciones globales
window.buscarEstudiante = function() { window.modules.disciplina.buscarPorCedula(); };
window.guardarRegistro = function() { window.modules.disciplina.guardarRegistro(); };
window.limpiarFormulario = function() { window.modules.disciplina.limpiarFormulario(); };
window.limpiarTodo = function() { window.modules.disciplina.limpiarTodo(); };
window.filtrarRegistros = function(filtro) { window.modules.disciplina.filtrarRegistros(filtro); };
window.generarReporteProceso = function() { Swal.fire('ℹ️ Info', 'Generación de reporte de proceso en desarrollo', 'info'); };
window.generarReporteBajas = function() { abrirModalBajas(); };
window.cerrarSesion = function() { if (window.supabaseClient) window.supabaseClient.auth.signOut().then(() => window.location.href = 'index.html'); else window.location.href = 'index.html'; };

document.addEventListener('DOMContentLoaded', () => { if (window.modules && window.modules.disciplina) window.modules.disciplina.init(); });

// ============================================================================
// FUNCIONES PARA MODAL DE REPORTES
// ============================================================================
function abrirModalBajas() {
    document.getElementById('modal-reporte-bajas').classList.remove('hidden'); document.body.style.overflow = 'hidden';
    const hoy = new Date();
    document.getElementById('bajas-fecha-inicial').value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('bajas-fecha-final').value = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
    document.getElementById('bajas-estadisticas').classList.add('hidden'); document.getElementById('btn-descargar-pdf').classList.add('hidden');
}
function cerrarModalBajas() { document.getElementById('modal-reporte-bajas').classList.add('hidden'); document.body.style.overflow = ''; }

async function generarReporteBajasConFechas() {
    const fechaInicial = document.getElementById('bajas-fecha-inicial').value; const fechaFinal = document.getElementById('bajas-fecha-final').value;
    if (!fechaInicial || !fechaFinal) { Swal.fire('⚠️ Atención', 'Por favor selecciona ambas fechas', 'warning'); return; }
    try {
        const { data, error } = await window.supabaseClient.from('disc_registros').select(`id, cedula, nombres, apellidos, pnf, tipo_baja, fecha_baja, estatus_general`).eq('estatus_general', 'INACTIVO').not('tipo_baja', 'is', null).gte('fecha_baja', fechaInicial).lte('fecha_baja', fechaFinal).order('fecha_baja', { ascending: true });
        if (error) throw error;
        const bajas = (data || []).map(reg => ({ cedula: reg.cedula, nombres: reg.nombres, apellidos: reg.apellidos, pnf: reg.pnf || 'SIN PNF', tipo_baja: reg.tipo_baja || 'SIN TIPO', fecha_baja: window.modules.disciplina.formatearFecha(reg.fecha_baja) }));
        const tiposBajas = ['BAJA_VOLUNTARIA', 'BAJA_POR_INASISTENCIA', 'BAJA_ACADEMICA', 'BAJA_MEDICA'];
        const tablaDinamica = {}; const totalesPorTipo = {}; tiposBajas.forEach(t => totalesPorTipo[t] = 0);
        bajas.forEach(baja => { if (!tablaDinamica[baja.pnf]) { tablaDinamica[baja.pnf] = {}; tiposBajas.forEach(t => tablaDinamica[baja.pnf][t] = 0); } if (tablaDinamica[baja.pnf][baja.tipo_baja] !== undefined) { tablaDinamica[baja.pnf][baja.tipo_baja]++; totalesPorTipo[baja.tipo_baja]++; } });
        document.getElementById('stat-total-bajas').textContent = bajas.length; document.getElementById('stat-total-pnf').textContent = Object.keys(tablaDinamica).length; document.getElementById('stat-total-general').textContent = bajas.length;
        const tbody = document.getElementById('tabla-dinamica-bajas'); tbody.innerHTML = '';
        let totalVoluntaria = 0, totalInasistencia = 0, totalAcademica = 0, totalMedica = 0;
        Object.keys(tablaDinamica).sort().forEach(pnf => {
            const fila = document.createElement('tr'); fila.className = 'hover:bg-gray-50';
            const v = tablaDinamica[pnf]['BAJA_VOLUNTARIA'] || 0; const i = tablaDinamica[pnf]['BAJA_POR_INASISTENCIA'] || 0; const a = tablaDinamica[pnf]['BAJA_ACADEMICA'] || 0; const m = tablaDinamica[pnf]['BAJA_MEDICA'] || 0; const total = v + i + a + m;
            totalVoluntaria += v; totalInasistencia += i; totalAcademica += a; totalMedica += m;
            fila.innerHTML = `<td class="p-3 font-semibold text-gray-800">${pnf}</td><td class="p-3 text-center text-gray-600">${v}</td><td class="p-3 text-center text-gray-600">${i}</td><td class="p-3 text-center text-gray-600">${a}</td><td class="p-3 text-center text-gray-600">${m}</td><td class="p-3 text-center font-bold text-gray-800">${total}</td>`;
            tbody.appendChild(fila);
        });
        document.getElementById('total-voluntaria').textContent = totalVoluntaria; document.getElementById('total-inasistencia').textContent = totalInasistencia; document.getElementById('total-academica').textContent = totalAcademica; document.getElementById('total-medica').textContent = totalMedica; document.getElementById('total-final').textContent = bajas.length;
        document.getElementById('bajas-estadisticas').classList.remove('hidden'); document.getElementById('btn-descargar-pdf').classList.remove('hidden');
        window.datosReporteBajas = { bajas, tablaDinamica, totalesPorTipo, fechaInicial, fechaFinal, totalBajas: bajas.length, totalPnf: Object.keys(tablaDinamica).length };
    } catch (e) { console.error('❌ Error generando reporte:', e); Swal.fire('Error', 'No se pudo generar el reporte: ' + e.message, 'error'); }
}

async function descargarPDFBajas() {
    if (!window.datosReporteBajas) return;
    const { bajas, tablaDinamica, totalesPorTipo, fechaInicial, fechaFinal, totalBajas, totalPnf } = window.datosReporteBajas;
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', margins: { top: 20, bottom: 20, left: 20, right: 20 } });
        const formatearFecha = (fechaStr) => { if (!fechaStr) return ''; const partes = fechaStr.split('-'); if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`; return fechaStr; };
        const fechaIniFormateada = formatearFecha(fechaInicial); const fechaFinFormateada = formatearFecha(fechaFinal);
        const fechaGeneracion = new Date().toLocaleDateString('es-VE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('REPORTE DE BAJAS DISCIPLINARIAS', 105, 25, { align: 'center' });
        doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`Período: ${fechaIniFormateada} al ${fechaFinFormateada}`, 105, 30, { align: 'center' }); doc.text(`Generado: ${fechaGeneracion}`, 105, 35, { align: 'center' });
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(`Total Bajas: ${totalBajas} | PNF: ${totalPnf}`, 105, 42, { align: 'center' });
        doc.setFontSize(10); doc.text('TABLA DINAMICA: BAJAS POR PNF Y TIPO', 20, 52);
        const tiposBajas = ['BAJA_VOLUNTARIA', 'BAJA_POR_INASISTENCIA', 'BAJA_ACADEMICA', 'BAJA_MEDICA']; const labelsTipos = ['Baja Voluntaria', 'Baja por Inasistencia', 'Baja Académica', 'Baja Médica'];
        const tableColumn = ['PNF', ...labelsTipos, 'Total']; const tableRows = [];
        Object.keys(tablaDinamica).sort().forEach(pnf => { const fila = [pnf]; let totalPnf = 0; tiposBajas.forEach(tipo => { const valor = tablaDinamica[pnf][tipo] || 0; fila.push(valor); totalPnf += valor; }); fila.push(totalPnf); tableRows.push(fila); });
        const totales = ['TOTAL GENERAL']; let totalGeneral = 0; tiposBajas.forEach(tipo => { const total = totalesPorTipo[tipo] || 0; totales.push(total); totalGeneral += total; }); totales.push(totalGeneral); tableRows.push(totales);
        doc.autoTable({ head: [tableColumn], body: tableRows, startY: 55, theme: 'grid', fontSize: 7, margin: { left: 20, right: 20 }, headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center' }, styles: { cellPadding: 1.5, halign: 'center', fontSize: 7 }, columnStyles: { 0: { cellWidth: 35, halign: 'left', fontStyle: 'bold', fillColor: [240, 240, 240] }, 5: { fontStyle: 'bold', fillColor: [220, 230, 250] } }, footStyles: { fillColor: [219, 234, 254], textColor: [30, 58, 138], fontStyle: 'bold' } });
        if (bajas.length > 0) {
            let startYListado = doc.lastAutoTable.finalY + 5; doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('LISTADO DETALLADO DE BAJAS', 20, startYListado);
            const detalleColumn = ["#", "Fecha", "Cédula", "Estudiante", "PNF", "Tipo"];
            const detalleRows = bajas.map((b, index) => [(index + 1).toString(), formatearFecha(b.fecha_baja), b.cedula, `${b.nombres} ${b.apellidos}`, b.pnf, b.tipo_baja.replace('BAJA_', '').replace('_', ' ')]);
            doc.autoTable({ head: [detalleColumn], body: detalleRows, startY: startYListado + 3, theme: 'striped', fontSize: 6.5, margin: { left: 20, right: 20, top: 20, bottom: 20 }, headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center' }, styles: { cellPadding: 1, overflow: 'linebreak', fontSize: 6.5, valign: 'middle', minCellHeight: 4 }, columnStyles: { 0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 16, halign: 'center' }, 2: { cellWidth: 18, halign: 'center' }, 3: { cellWidth: 55 }, 4: { cellWidth: 32 }, 5: { cellWidth: 26, halign: 'center' } }, didParseCell: function(data) { if (data.section === 'head') data.cell.styles.fontStyle = 'bold'; } });
        }
        doc.save(`reporte_bajas_${fechaInicial}_a_${fechaFinal}.pdf`); Swal.fire('✅ PDF Descargado', 'El reporte se ha descargado correctamente', 'success');
    } catch (e) { console.error('❌ Error generando PDF:', e); Swal.fire('Error', 'No se pudo generar el PDF: ' + e.message, 'error'); }
}

console.log('✅ Módulo Consejo Disciplinario v4.1 Cargado');
