/**
 * MÓDULO DE ASISTENCIA DE PERSONAL
 * Versión: 1.0 - Sistema completo de control de asistencia
 */

window.modules = window.modules || {};
window.modules.asistenciaPersonal = {
    datosCache: {
        personal: [],
        tiposPersonal: [],
        tiposAsistencia: [],
        registros: [],
        fechaActual: null
    },

    // ============================================
    // CARGAR TIPOS DE PERSONAL
    // ============================================
    cargarTiposPersonal: async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('tipo_personal')
                .select('*')
                .eq('activo', true)
                .order('orden');

            if (error) throw error;

            this.datosCache.tiposPersonal = data || [];
            
            // Llenar select de filtro
            const select = document.getElementById('filtro-tipo-personal');
            if (select) {
                select.innerHTML = '<option value="">Todos los tipos</option>' +
                    data.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
            }

            console.log('✅ Tipos de personal cargados:', data.length);
            return data;

        } catch (e) {
            console.error('❌ Error cargando tipos de personal:', e);
            return [];
        }
    },

    // ============================================
    // CARGAR TIPOS DE ASISTENCIA
    // ============================================
    cargarTiposAsistencia: async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('tipo_asistencia')
                .select('*')
                .eq('activo', true)
                .order('orden');

            if (error) throw error;

            this.datosCache.tiposAsistencia = data || [];
            
            // Llenar select de tipo de registro
            const select = document.getElementById('reg-tipo');
            if (select) {
                select.innerHTML = '<option value="">Seleccione...</option>' +
                    data.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
            }

            console.log('✅ Tipos de asistencia cargados:', data.length);
            return data;

        } catch (e) {
            console.error(' Error cargando tipos de asistencia:', e);
            return [];
        }
    },

    // ============================================
    // CARGAR PERSONAL
    // ============================================
    cargarPersonal: async function(tipoPersonalId = null) {
        try {
            let query = window.supabaseClient
                .from('personal')
                .select('*, tipo_personal(nombre)')
                .eq('activo', true);

            if (tipoPersonalId) {
                query = query.eq('tipo_personal_id', tipoPersonalId);
            }

            const { data, error } = await query.order('nombre_completo');

            if (error) throw error;

            this.datosCache.personal = data || [];
            console.log('✅ Personal cargado:', data.length);
            return data;

        } catch (e) {
            console.error('❌ Error cargando personal:', e);
            return [];
        }
    },

    // ============================================
    // CARGAR REGISTROS DE ASISTENCIA
    // ============================================
    cargarRegistrosAsistencia: async function(fecha, tipoPersonalId = null) {
        try {
            let query = window.supabaseClient
                .from('registro_asistencia')
                .select('*, personal(nombre_completo, cedula, tipo_personal_id, tipo_personal(nombre)), tipo_asistencia(nombre, codigo, color, icono)')
                .eq('fecha', fecha);

            const { data, error } = await query;

            if (error) throw error;

            this.datosCache.registros = data || [];
            console.log('✅ Registros cargados:', data.length);
            return data;

        } catch (e) {
            console.error('❌ Error cargando registros:', e);
            return [];
        }
    },

    // ============================================
    // CARGAR Y MOSTRAR ASISTENCIA
    // ============================================
    cargarRegistroAsistencia: async function() {
        try {
            const fecha = document.getElementById('fecha-asistencia').value;
            const tipoPersonalId = document.getElementById('filtro-tipo-personal').value;

            if (!fecha) {
                Swal.fire('Atención', 'Seleccione una fecha', 'warning');
                return;
            }

            this.datosCache.fechaActual = fecha;

            // Cargar personal y registros en paralelo
            const [personal, registros] = await Promise.all([
                this.cargarPersonal(tipoPersonalId || null),
                this.cargarRegistrosAsistencia(fecha, tipoPersonalId)
            ]);

            // Crear mapa de registros por personal_id
            const registrosMap = {};
            registros.forEach(r => {
                registrosMap[r.personal_id] = r;
            });

            // Agrupar personal por tipo
            const agrupadoPorTipo = {};
            personal.forEach(p => {
                const tipoNombre = p.tipo_personal?.nombre || 'Sin tipo';
                if (!agrupadoPorTipo[tipoNombre]) {
                    agrupadoPorTipo[tipoNombre] = [];
                }
                agrupadoPorTipo[tipoNombre].push(p);
            });

            // Renderizar
            this.renderizarAsistenciaPorTipo(agrupadoPorTipo, registrosMap);
            this.actualizarEstadisticas(personal, registros);

            console.log('✅ Asistencia cargada para:', fecha);

        } catch (e) {
            console.error('❌ Error en cargarRegistroAsistencia:', e);
            Swal.fire('Error', 'No se pudo cargar la asistencia: ' + e.message, 'error');
        }
    },

    // ============================================
    // RENDERIZAR ASISTENCIA POR TIPO
    // ============================================
    renderizarAsistenciaPorTipo: function(agrupadoPorTipo, registrosMap) {
        const container = document.getElementById('lista-asistencia-container');
        
        if (Object.keys(agrupadoPorTipo).length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-xl shadow-lg p-8 text-center">
                    <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-bold text-gray-600">No hay personal registrado</h3>
                    <p class="text-gray-500 mt-2">Agregue personal al sistema para comenzar</p>
                </div>
            `;
            return;
        }

        let html = '';
        
        Object.entries(agrupadoPorTipo).forEach(([tipoNombre, personalLista]) => {
            const total = personalLista.length;
            const presentes = personalLista.filter(p => {
                const reg = registrosMap[p.id];
                return reg && reg.tipo_asistencia?.codigo === 'ASISTENCIA';
            }).length;

            html += `
                <div class="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
                    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                        <div class="flex justify-between items-center">
                            <h3 class="text-xl font-bold">
                                <i class="fas fa-users mr-2"></i>${tipoNombre}
                            </h3>
                            <div class="text-right">
                                <p class="text-sm">Matrícula: <strong>${total}</strong></p>
                                <p class="text-sm">Asistencia: <strong>${presentes}</strong></p>
                            </div>
                        </div>
                    </div>

                    <div class="divide-y">
                        ${personalLista.map(p => {
                            const registro = registrosMap[p.id];
                            const estado = registro ? registro.tipo_asistencia : null;
                            
                            let estadoHtml = '';
                            if (estado) {
                                const colorClass = this.getColorClass(estado.codigo);
                                estadoHtml = `
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${colorClass}">
                                        <i class="fas fa-${estado.icono || 'circle'} mr-1"></i>
                                        ${estado.nombre}
                                    </span>
                                `;
                            } else {
                                estadoHtml = `
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-600">
                                        <i class="fas fa-question-circle mr-1"></i>
                                        Sin registro
                                    </span>
                                `;
                            }

                            return `
                                <div class="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                                    <div class="flex items-center space-x-4">
                                        <div class="bg-gray-100 rounded-full p-3">
                                            <i class="fas fa-user text-gray-600"></i>
                                        </div>
                                        <div>
                                            <p class="font-bold text-gray-800">${p.nombre_completo}</p>
                                            <p class="text-sm text-gray-500">C.I: ${p.cedula}</p>
                                        </div>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        ${estadoHtml}
                                        <button onclick="window.modules.asistenciaPersonal.editarRegistro('${p.id}')" 
                                                class="text-indigo-600 hover:text-indigo-800 transition" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    // ============================================
    // OBTENER CLASE DE COLOR SEGÚN CÓDIGO
    // ============================================
    getColorClass: function(codigo) {
        const colores = {
            'ASISTENCIA': 'bg-green-100 text-green-800',
            'AUS_INJUSTIFICADA': 'bg-red-100 text-red-800',
            'DIA_LIBRE': 'bg-gray-100 text-gray-800',
            'PERMISO_OBLIGATORIO': 'bg-yellow-100 text-yellow-800',
            'PERMISO_POTESTATIVO': 'bg-orange-100 text-orange-800',
            'REPOSO': 'bg-purple-100 text-purple-800',
            'RETARDO': 'bg-yellow-100 text-yellow-800',
            'VACACIONES': 'bg-blue-100 text-blue-800',
            'EGRESO': 'bg-pink-100 text-pink-800',
            'INGRESO': 'bg-teal-100 text-teal-800'
        };
        return colores[codigo] || 'bg-gray-100 text-gray-800';
    },

    // ============================================
    // ACTUALIZAR ESTADÍSTICAS
    // ============================================
    actualizarEstadisticas: function(personal, registros) {
        const total = personal.length;
        const presentes = registros.filter(r => r.tipo_asistencia?.codigo === 'ASISTENCIA').length;
        const ausentes = registros.filter(r => r.tipo_asistencia?.codigo === 'AUS_INJUSTIFICADA').length;
        const permisos = registros.filter(r => 
            ['PERMISO_OBLIGATORIO', 'PERMISO_POTESTATIVO', 'RETARDO', 'REPOSO'].includes(r.tipo_asistencia?.codigo)
        ).length;

        document.getElementById('count-total').textContent = total;
        document.getElementById('count-presentes').textContent = presentes;
        document.getElementById('count-ausentes').textContent = ausentes;
        document.getElementById('count-permisos').textContent = permisos;
    },

    // ============================================
    // CARGAR PERSONAL PARA REGISTRO
    // ============================================
    cargarPersonalParaRegistro: async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('personal')
                .select('id, nombre_completo, cedula')
                .eq('activo', true)
                .order('nombre_completo');

            if (error) throw error;

            const select = document.getElementById('reg-personal');
            if (select) {
                select.innerHTML = '<option value="">Seleccione...</option>' +
                    data.map(p => `<option value="${p.id}">${p.nombre_completo} - ${p.cedula}</option>`).join('');
            }

        } catch (e) {
            console.error('❌ Error cargando personal para registro:', e);
        }
    },

    // ============================================
    // GUARDAR REGISTRO DE ASISTENCIA
    // ============================================
    guardarRegistroAsistencia: async function() {
        try {
            const personalId = document.getElementById('reg-personal').value;
            const fecha = document.getElementById('reg-fecha').value;
            const tipoAsistenciaId = document.getElementById('reg-tipo').value;
            const hora = document.getElementById('reg-hora').value;
            const observaciones = document.getElementById('reg-observaciones').value;

            if (!personalId || !fecha || !tipoAsistenciaId) {
                Swal.fire('Atención', 'Complete los campos obligatorios', 'warning');
                return;
            }

            const registro = {
                personal_id: personalId,
                fecha: fecha,
                tipo_asistencia_id: tipoAsistenciaId,
                hora_registro: hora || new Date().toTimeString().slice(0, 5),
                observaciones: observaciones || null,
                registrado_por: window.appState.usuarioActualId
            };

            // Verificar si ya existe registro para esa fecha
            const { data: existente } = await window.supabaseClient
                .from('registro_asistencia')
                .select('id')
                .eq('personal_id', personalId)
                .eq('fecha', fecha)
                .single();

            let result;
            if (existente) {
                // Actualizar
                result = await window.supabaseClient
                    .from('registro_asistencia')
                    .update(registro)
                    .eq('id', existente.id);
            } else {
                // Insertar
                result = await window.supabaseClient
                    .from('registro_asistencia')
                    .insert([registro]);
            }

            if (result.error) throw result.error;

            Swal.fire({
                icon: 'success',
                title: '✅ Registro Guardado',
                text: 'La asistencia se registró correctamente',
                timer: 2000,
                showConfirmButton: false
            });

            this.cerrarModal('modal-registro');
            await this.cargarRegistroAsistencia();

        } catch (e) {
            console.error('❌ Error guardando registro:', e);
            Swal.fire('Error', 'No se pudo guardar: ' + e.message, 'error');
        }
    },

    // ============================================
    // EDITAR REGISTRO
    // ============================================
    editarRegistro: async function(personalId) {
        try {
            const fecha = this.datosCache.fechaActual;
            
            const { data: registro } = await window.supabaseClient
                .from('registro_asistencia')
                .select('*, tipo_asistencia_id')
                .eq('personal_id', personalId)
                .eq('fecha', fecha)
                .single();

            // Abrir modal
            this.mostrarModalRegistro();
            
            // Esperar a que cargue el personal
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Seleccionar personal
            document.getElementById('reg-personal').value = personalId;
            document.getElementById('reg-fecha').value = fecha;
            
            if (registro) {
                document.getElementById('reg-tipo').value = registro.tipo_asistencia_id;
                document.getElementById('reg-hora').value = registro.hora_registro;
                document.getElementById('reg-observaciones').value = registro.observaciones || '';
            }

            this.cambiarTipoRegistro();

        } catch (e) {
            console.error('❌ Error editando registro:', e);
        }
    },

    // ============================================
    // GENERAR REPORTE DIARIO
    // ============================================
    generarReporteDiario: async function() {
        try {
            const fecha = this.datosCache.fechaActual;
            if (!fecha) {
                Swal.fire('Atención', 'Seleccione una fecha primero', 'warning');
                return;
            }

            const { data: personal } = await this.cargarPersonal();
            const { data: registros } = await this.cargarRegistrosAsistencia(fecha);

            // Agrupar por tipo de personal
            const agrupado = {};
            personal.forEach(p => {
                const tipo = p.tipo_personal?.nombre || 'Sin tipo';
                if (!agrupado[tipo]) agrupado[tipo] = [];
                agrupado[tipo].push(p);
            });

            // Generar contenido del reporte
            let contenido = `REPORTE DE ASISTENCIA - ${fecha}\n\n`;
            
            let totalGeneral = 0;
            let presentesGeneral = 0;
            let ausentesGeneral = 0;

            Object.entries(agrupado).forEach(([tipo, lista]) => {
                const matricula = lista.length;
                const presentes = lista.filter(p => {
                    const reg = registros.find(r => r.personal_id === p.id);
                    return reg && reg.tipo_asistencia?.codigo === 'ASISTENCIA';
                }).length;

                contenido += `${tipo}\n`;
                contenido += `Matrícula: ${matricula}\n`;
                contenido += `Asistencia: ${presentes.toString().padStart(2, '0')}\n`;
                
                lista.forEach(p => {
                    const reg = registros.find(r => r.personal_id === p.id);
                    if (reg && reg.tipo_asistencia?.codigo === 'ASISTENCIA') {
                        contenido += `  ${p.nombre_completo} C.I ${p.cedula}\n`;
                    }
                });

                // Contar ausencias y otros
                const ausencias = lista.filter(p => {
                    const reg = registros.find(r => r.personal_id === p.id);
                    return reg && reg.tipo_asistencia?.codigo === 'AUS_INJUSTIFICADA';
                }).length;

                const diasLibres = lista.filter(p => {
                    const reg = registros.find(r => r.personal_id === p.id);
                    return reg && reg.tipo_asistencia?.codigo === 'DIA_LIBRE';
                }).length;

                contenido += `Ausencias Injustificadas: ${ausencias.toString().padStart(2, '0')}\n`;
                contenido += `Día libre: ${diasLibres.toString().padStart(2, '0')}\n\n`;

                totalGeneral += matricula;
                presentesGeneral += presentes;
                ausentesGeneral += ausencias;
            });

            contenido += `Total: ${totalGeneral}\n`;
            contenido += `Total, Presentes: ${presentesGeneral}\n`;
            contenido += `Total, Ausentes: ${ausentesGeneral}\n`;

            // Mostrar en modal
            Swal.fire({
                title: 'Reporte Diario',
                html: `<pre class="text-left text-sm max-h-96 overflow-y-auto">${contenido}</pre>`,
                width: '800px',
                confirmButtonText: 'Cerrar'
            });

        } catch (e) {
            console.error('❌ Error generando reporte:', e);
            Swal.fire('Error', 'No se pudo generar el reporte: ' + e.message, 'error');
        }
    },

    // ============================================
    // REPORTES AVANZADOS
    // ============================================
    generarReporteInasistencias: async function() {
        try {
            const fechaInicio = prompt('Fecha inicio (YYYY-MM-DD):', '2026-01-01');
            const fechaFin = prompt('Fecha fin (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);

            if (!fechaInicio || !fechaFin) return;

            const { data, error } = await window.supabaseClient
                .from('registro_asistencia')
                .select('personal_id, personal(nombre_completo, cedula), tipo_asistencia(codigo)')
                .gte('fecha', fechaInicio)
                .lte('fecha', fechaFin)
                .in('tipo_asistencia.codigo', ['AUS_INJUSTIFICADA', 'REPOSO', 'VACACIONES']);

            if (error) throw error;

            // Agrupar por personal
            const agrupado = {};
            data.forEach(r => {
                const id = r.personal_id;
                if (!agrupado[id]) {
                    agrupado[id] = {
                        nombre: r.personal.nombre_completo,
                        cedula: r.personal.cedula,
                        total: 0
                    };
                }
                agrupado[id].total++;
            });

            // Ordenar y mostrar top 10
            const top10 = Object.values(agrupado)
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);

            let contenido = `TOP 10 - PERSONAL CON MÁS INASISTENCIAS\n`;
            contenido += `Período: ${fechaInicio} al ${fechaFin}\n\n`;
            
            top10.forEach((p, idx) => {
                contenido += `${idx + 1}. ${p.nombre} - C.I: ${p.cedula}\n`;
                contenido += `   Total inasistencias: ${p.total}\n\n`;
            });

            Swal.fire({
                title: 'Reporte de Inasistencias',
                html: `<pre class="text-left text-sm max-h-96 overflow-y-auto">${contenido}</pre>`,
                width: '800px',
                confirmButtonText: 'Cerrar'
            });

        } catch (e) {
            console.error('❌ Error:', e);
            Swal.fire('Error', e.message, 'error');
        }
    },

    generarReportePermisos: async function() {
        try {
            const fechaInicio = prompt('Fecha inicio (YYYY-MM-DD):', '2026-01-01');
            const fechaFin = prompt('Fecha fin (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);

            if (!fechaInicio || !fechaFin) return;

            const { data, error } = await window.supabaseClient
                .from('registro_asistencia')
                .select('personal_id, personal(nombre_completo, cedula), tipo_asistencia(codigo)')
                .gte('fecha', fechaInicio)
                .lte('fecha', fechaFin)
                .in('tipo_asistencia.codigo', ['PERMISO_OBLIGATORIO', 'PERMISO_POTESTATIVO']);

            if (error) throw error;

            const agrupado = {};
            data.forEach(r => {
                const id = r.personal_id;
                if (!agrupado[id]) {
                    agrupado[id] = {
                        nombre: r.personal.nombre_completo,
                        cedula: r.personal.cedula,
                        obligatorios: 0,
                        potestativos: 0
                    };
                }
                if (r.tipo_asistencia.codigo === 'PERMISO_OBLIGATORIO') {
                    agrupado[id].obligatorios++;
                } else {
                    agrupado[id].potestativos++;
                }
            });

            const lista = Object.values(agrupado).sort((a, b) => 
                (b.obligatorios + b.potestativos) - (a.obligatorios + a.potestativos)
            );

            let contenido = `PERSONAL CON MÁS PERMISOS\n`;
            contenido += `Período: ${fechaInicio} al ${fechaFin}\n\n`;
            
            lista.forEach((p, idx) => {
                contenido += `${idx + 1}. ${p.nombre} - C.I: ${p.cedula}\n`;
                contenido += `   Obligatorios: ${p.obligatorios} | Potestativos: ${p.potestativos}\n\n`;
            });

            Swal.fire({
                title: 'Reporte de Permisos',
                html: `<pre class="text-left text-sm max-h-96 overflow-y-auto">${contenido}</pre>`,
                width: '800px',
                confirmButtonText: 'Cerrar'
            });

        } catch (e) {
            console.error('❌ Error:', e);
            Swal.fire('Error', e.message, 'error');
        }
    },

    generarReporteRetardos: async function() {
        try {
            const fechaInicio = prompt('Fecha inicio (YYYY-MM-DD):', '2026-01-01');
            const fechaFin = prompt('Fecha fin (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);

            if (!fechaInicio || !fechaFin) return;

            const { data, error } = await window.supabaseClient
                .from('registro_asistencia')
                .select('personal_id, personal(nombre_completo, cedula), hora_entrada, fecha')
                .gte('fecha', fechaInicio)
                .lte('fecha', fechaFin)
                .eq('tipo_asistencia.codigo', 'RETARDO');

            if (error) throw error;

            const agrupado = {};
            data.forEach(r => {
                const id = r.personal_id;
                if (!agrupado[id]) {
                    agrupado[id] = {
                        nombre: r.personal.nombre_completo,
                        cedula: r.personal.cedula,
                        total: 0,
                        fechas: []
                    };
                }
                agrupado[id].total++;
                agrupado[id].fechas.push(`${r.fecha} (${r.hora_entrada})`);
            });

            const lista = Object.values(agrupado).sort((a, b) => b.total - a.total);

            let contenido = `PERSONAL CON RETARDOS\n`;
            contenido += `Período: ${fechaInicio} al ${fechaFin}\n\n`;
            
            lista.forEach((p, idx) => {
                contenido += `${idx + 1}. ${p.nombre} - C.I: ${p.cedula}\n`;
                contenido += `   Total retardos: ${p.total}\n`;
                contenido += `   Fechas: ${p.fechas.join(', ')}\n\n`;
            });

            Swal.fire({
                title: 'Reporte de Retardos',
                html: `<pre class="text-left text-sm max-h-96 overflow-y-auto">${contenido}</pre>`,
                width: '800px',
                confirmButtonText: 'Cerrar'
            });

        } catch (e) {
            console.error('❌ Error:', e);
            Swal.fire('Error', e.message, 'error');
        }
    },

    generarReporteVacaciones: async function() {
        try {
            const fechaInicio = prompt('Fecha inicio (YYYY-MM-DD):', '2026-01-01');
            const fechaFin = prompt('Fecha fin (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);

            if (!fechaInicio || !fechaFin) return;

            const { data, error } = await window.supabaseClient
                .from('registro_asistencia')
                .select('personal_id, personal(nombre_completo, cedula, tipo_personal(nombre)), fecha, observaciones')
                .gte('fecha', fechaInicio)
                .lte('fecha', fechaFin)
                .eq('tipo_asistencia.codigo', 'VACACIONES');

            if (error) throw error;

            let contenido = `PERSONAL DE VACACIONES\n`;
            contenido += `Período: ${fechaInicio} al ${fechaFin}\n\n`;
            
            if (data.length === 0) {
                contenido += 'No hay personal de vacaciones en este período\n';
            } else {
                data.forEach((r, idx) => {
                    contenido += `${idx + 1}. ${r.personal.nombre_completo}\n`;
                    contenido += `   C.I: ${r.personal.cedula}\n`;
                    contenido += `   Tipo: ${r.personal.tipo_personal?.nombre}\n`;
                    contenido += `   Fecha: ${r.fecha}\n`;
                    if (r.observaciones) contenido += `   Observaciones: ${r.observaciones}\n`;
                    contenido += '\n';
                });
            }

            Swal.fire({
                title: 'Reporte de Vacaciones',
                html: `<pre class="text-left text-sm max-h-96 overflow-y-auto">${contenido}</pre>`,
                width: '800px',
                confirmButtonText: 'Cerrar'
            });

        } catch (e) {
            console.error('❌ Error:', e);
            Swal.fire('Error', e.message, 'error');
        }
    },

    // ============================================
    // CARGAR DATOS PERSONALES (GESTIÓN)
    // ============================================
    cargarDatosPersonales: async function() {
        const { value: formValues } = await Swal.fire({
            title: 'Gestionar Personal',
            html: `
                <div class="text-left space-y-3">
                    <input id="swal-cedula" class="swal2-input" placeholder="Cédula (V-12345678)">
                    <input id="swal-nombre" class="swal2-input" placeholder="Nombre completo">
                    <select id="swal-tipo" class="swal2-select" style="width: 100%; padding: 10px;">
                        <option value="">Seleccione tipo...</option>
                        ${this.datosCache.tiposPersonal.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
                    </select>
                    <input id="swal-cargo" class="swal2-input" placeholder="Cargo (opcional)">
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                return {
                    cedula: document.getElementById('swal-cedula').value,
                    nombre: document.getElementById('swal-nombre').value,
                    tipo: document.getElementById('swal-tipo').value,
                    cargo: document.getElementById('swal-cargo').value
                };
            }
        });

        if (formValues) {
            try {
                const { error } = await window.supabaseClient
                    .from('personal')
                    .insert([{
                        cedula: formValues.cedula,
                        nombre_completo: formValues.nombre,
                        tipo_personal_id: formValues.tipo,
                        cargo: formValues.cargo,
                        creado_por: window.appState.usuarioActualId
                    }]);

                if (error) throw error;

                Swal.fire('✅ Guardado', 'Personal agregado correctamente', 'success');
                await this.cargarRegistroAsistencia();

            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    // ============================================
    // UTILIDADES
    // ============================================
    cerrarModal: function(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }
};

// Exportar funciones globales
window.cargarTiposPersonal = () => window.modules.asistenciaPersonal.cargarTiposPersonal();
window.cargarTiposAsistencia = () => window.modules.asistenciaPersonal.cargarTiposAsistencia();
window.cargarRegistroAsistencia = () => window.modules.asistenciaPersonal.cargarRegistroAsistencia();
window.mostrarModalRegistro = () => window.modules.asistenciaPersonal.mostrarModalRegistro();
window.guardarRegistroAsistencia = () => window.modules.asistenciaPersonal.guardarRegistroAsistencia();
window.generarReporteDiario = () => window.modules.asistenciaPersonal.generarReporteDiario();
window.mostrarModalReportesAvanzados = () => window.modules.asistenciaPersonal.mostrarModalReportesAvanzados();
window.generarReporteInasistencias = () => window.modules.asistenciaPersonal.generarReporteInasistencias();
window.generarReportePermisos = () => window.modules.asistenciaPersonal.generarReportePermisos();
window.generarReporteRetardos = () => window.modules.asistenciaPersonal.generarReporteRetardos();
window.generarReporteVacaciones = () => window.modules.asistenciaPersonal.generarReporteVacaciones();
window.cargarDatosPersonales = () => window.modules.asistenciaPersonal.cargarDatosPersonales();
window.cambiarTipoRegistro = () => window.modules.asistenciaPersonal.cambiarTipoRegistro();

console.log('✅ Módulo de Asistencia de Personal v1.0 cargado');
