/**
 * MÓDULO DE ASISTENCIA DE PERSONAL - VERSIÓN 2.0
 * Sistema dinámico con botones rápidos P/R/A, modal avanzado y reordenamiento
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
    personalSeleccionado: null,
    accionRapidaSeleccionada: null,

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
            
            // Llenar select de opciones avanzadas (excluir P, R, A que son botones rápidos)
            const select = document.getElementById('reg-tipo');
            if (select) {
                const opcionesAvanzadas = data.filter(t => 
                    !['ASISTENCIA', 'RETARDO', 'AUS_INJUSTIFICADA'].includes(t.codigo)
                );
                
                select.innerHTML = '<option value="">Seleccione...</option>' +
                    opcionesAvanzadas.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
            }

            console.log('✅ Tipos de asistencia cargados:', data.length);
            return data;

        } catch (e) {
            console.error('❌ Error cargando tipos de asistencia:', e);
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
    cargarRegistrosAsistencia: async function(fecha) {
        try {
            const { data, error } = await window.supabaseClient
                .from('registro_asistencia')
                .select('*, personal(nombre_completo, cedula, tipo_personal_id, tipo_personal(nombre)), tipo_asistencia(nombre, codigo, color, icono)')
                .eq('fecha', fecha);

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
    // CARGAR Y MOSTRAR ASISTENCIA (FUNCIÓN PRINCIPAL)
    // ============================================
    cargarRegistroAsistencia: async function() {
        try {
            const fecha = document.getElementById('fecha-asistencia')?.value;
            const tipoPersonalId = document.getElementById('filtro-tipo-personal')?.value;
            const busqueda = document.getElementById('buscar-personal')?.value?.toLowerCase() || '';

            if (!fecha) {
                Swal.fire('Atención', 'Seleccione una fecha', 'warning');
                return;
            }

            this.datosCache.fechaActual = fecha;

            const [personal, registros] = await Promise.all([
                this.cargarPersonal(tipoPersonalId || null),
                this.cargarRegistrosAsistencia(fecha)
            ]);

            // Crear mapa de registros por personal_id
            const registrosMap = {};
            registros.forEach(r => {
                registrosMap[r.personal_id] = r;
            });

            // Filtrar por búsqueda
            let personalFiltrado = personal;
            if (busqueda) {
                personalFiltrado = personal.filter(p => 
                    p.nombre_completo.toLowerCase().includes(busqueda) ||
                    p.cedula.toLowerCase().includes(busqueda)
                );
            }

            // Separar en pendientes y registrados
            const pendientes = personalFiltrado.filter(p => !registrosMap[p.id]);
            const registrados = personalFiltrado.filter(p => registrosMap[p.id]);

            // Renderizar
            this.renderizarPendientes(pendientes);
            this.renderizarRegistrados(registrados, registrosMap);
            this.actualizarEstadisticas(personalFiltrado, registros);

            console.log('✅ Asistencia cargada para:', fecha);

        } catch (e) {
            console.error('❌ Error en cargarRegistroAsistencia:', e);
            console.error('Stack trace:', e.stack);
            Swal.fire('Error', 'No se pudo cargar la asistencia: ' + e.message, 'error');
        }
    },

    // ============================================
    // RENDERIZAR PENDIENTES
    // ============================================
    renderizarPendientes: function(pendientes) {
        try {
            const container = document.getElementById('lista-pendientes');
            const badge = document.getElementById('count-pendientes-badge');
            
            if (!container) {
                console.warn('⚠️ No se encontró #lista-pendientes');
                return;
            }
            
            if (badge) badge.textContent = pendientes.length;
            
            if (pendientes.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full bg-yellow-50 rounded-lg p-6 text-center">
                        <i class="fas fa-check-circle text-4xl text-yellow-400 mb-2"></i>
                        <p class="text-yellow-700 font-semibold">¡Todos registrados!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = pendientes.map(p => this.crearTarjetaPersonal(p, null)).join('');
            
        } catch (e) {
            console.error('❌ Error en renderizarPendientes:', e);
        }
    },

    // ============================================
    // RENDERIZAR REGISTRADOS
    // ============================================
    renderizarRegistrados: function(registrados, registrosMap) {
        try {
            const container = document.getElementById('lista-registrados');
            const badge = document.getElementById('count-registrados-badge');
            
            if (!container) {
                console.warn('⚠️ No se encontró #lista-registrados');
                return;
            }
            
            if (badge) badge.textContent = registrados.length;
            
            if (registrados.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full bg-green-50 rounded-lg p-6 text-center">
                        <i class="fas fa-inbox text-4xl text-green-400 mb-2"></i>
                        <p class="text-green-700 font-semibold">Sin registros aún</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = registrados.map(p => {
                const registro = registrosMap[p.id];
                return this.crearTarjetaPersonal(p, registro);
            }).join('');
            
        } catch (e) {
            console.error('❌ Error en renderizarRegistrados:', e);
        }
    },

    // ============================================
    // CREAR TARJETA DE PERSONAL (CARD)
    // ============================================
    crearTarjetaPersonal: function(personal, registro) {
        const tieneRegistro = registro !== null;
        const estado = tieneRegistro ? registro.tipo_asistencia : null;
        
        // Determinar color del badge según estado
        let badgeColor = 'bg-gray-200 text-gray-600';
        let badgeIcon = 'fa-question-circle';
        let badgeText = 'Sin registro';
        
        if (estado) {
            const colores = {
                'ASISTENCIA': 'bg-green-100 text-green-800',
                'AUS_INJUSTIFICADA': 'bg-red-100 text-red-800',
                'RETARDO': 'bg-yellow-100 text-yellow-800',
                'PERMISO_OBLIGATORIO': 'bg-orange-100 text-orange-800',
                'PERMISO_POTESTATIVO': 'bg-orange-100 text-orange-800',
                'REPOSO': 'bg-purple-100 text-purple-800',
                'VACACIONES': 'bg-blue-100 text-blue-800',
                'DIA_LIBRE': 'bg-gray-100 text-gray-800',
                'EGRESO': 'bg-pink-100 text-pink-800',
                'INGRESO': 'bg-teal-100 text-teal-800'
            };
            badgeColor = colores[estado.codigo] || 'bg-gray-200 text-gray-600';
            badgeIcon = `fa-${estado.icono || 'circle'}`;
            badgeText = estado.nombre;
        }

        // Iniciales para avatar
        const iniciales = personal.nombre_completo
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

        // Información adicional (edad si hay fecha_nacimiento, género)
        let infoExtra = '';
        if (personal.fecha_nacimiento) {
            const edad = this.calcularEdad(personal.fecha_nacimiento);
            infoExtra += `<span class="text-xs text-gray-500">${edad} años</span>`;
        }
        if (personal.genero) {
            const generoIcon = personal.genero === 'M' ? '♂️' : '♀️';
            infoExtra += ` <span class="text-xs">${generoIcon}</span>`;
        }

        // Info adicional del registro (para permisos prolongados)
        let infoRegistro = '';
        if (tieneRegistro && registro.fecha_inicio && registro.fecha_fin) {
            infoRegistro = `
                <div class="text-xs text-gray-500 mt-1">
                    <i class="fas fa-calendar-alt mr-1"></i>
                    ${this.formatearFechaCorta(registro.fecha_inicio)} al ${this.formatearFechaCorta(registro.fecha_fin)}
                    ${registro.dias ? `(${registro.dias} días)` : ''}
                </div>
            `;
        }

        return `
            <div class="badge-card bg-white rounded-lg shadow-md p-4 border-2 ${tieneRegistro ? 'border-green-200' : 'border-gray-200'}">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center space-x-3 flex-1 min-w-0">
                        <div class="bg-indigo-100 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                            <span class="text-indigo-600 font-bold text-sm">${iniciales}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-gray-800 text-sm truncate">${personal.nombre_completo}</p>
                            <p class="text-xs text-gray-500">C.I: ${personal.cedula} ${infoExtra}</p>
                        </div>
                    </div>
                    ${tieneRegistro ? `
                        <button onclick="window.modules.asistenciaPersonal.editarRegistro('${personal.id}')" 
                                class="text-indigo-600 hover:text-indigo-800 transition ml-2" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                </div>

                <div class="mb-3">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${badgeColor}">
                        <i class="fas ${badgeIcon} mr-1"></i>
                        ${badgeText}
                    </span>
                    ${infoRegistro}
                </div>

                ${!tieneRegistro ? `
                    <div class="space-y-2">
                        <div class="grid grid-cols-3 gap-2">
                            <button onclick="window.modules.asistenciaPersonal.registroRapido('${personal.id}', 'ASISTENCIA')" 
                                    class="quick-btn bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded text-xs" title="Presente">
                                P
                            </button>
                            <button onclick="window.modules.asistenciaPersonal.registroRapido('${personal.id}', 'RETARDO')" 
                                    class="quick-btn bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded text-xs" title="Retardo">
                                R
                            </button>
                            <button onclick="window.modules.asistenciaPersonal.registroRapido('${personal.id}', 'AUS_INJUSTIFICADA')" 
                                    class="quick-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded text-xs" title="Ausente">
                                A
                            </button>
                        </div>
                        <button onclick="window.modules.asistenciaPersonal.abrirModalRegistro('${personal.id}')" 
                                class="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold py-2 rounded text-xs transition">
                            <i class="fas fa-ellipsis-h mr-1"></i>Más opciones
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // ============================================
    // CALCULAR EDAD
    // ============================================
    calcularEdad: function(fechaNacimiento) {
        if (!fechaNacimiento) return null;
        const hoy = new Date();
        const nacimiento = new Date(fechaNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mes = hoy.getMonth() - nacimiento.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        return edad;
    },

    // ============================================
    // FORMATEAR FECHA CORTA
    // ============================================
    formatearFechaCorta: function(fecha) {
        if (!fecha) return '';
        const partes = fecha.split('-');
        if (partes.length === 3) return `${partes[2]}/${partes[1]}`;
        return fecha;
    },

    // ============================================
    // REGISTRO RÁPIDO (P/R/A) - SIN MODAL
    // ============================================
    registroRapido: async function(personalId, tipoCodigo) {
        try {
            const fecha = this.datosCache.fechaActual;
            const hora = new Date().toTimeString().slice(0, 5);

            const tipoAsistencia = this.datosCache.tiposAsistencia.find(t => t.codigo === tipoCodigo);
            if (!tipoAsistencia) {
                Swal.fire('Error', 'Tipo de asistencia no encontrado', 'error');
                return;
            }

            const registro = {
                personal_id: personalId,
                fecha: fecha,
                tipo_asistencia_id: tipoAsistencia.id,
                hora_registro: hora,
                registrado_por: window.appState.usuarioActualId
            };

            // UPSERT: Insertar o actualizar
            const { data: existente, error: errorExiste } = await window.supabaseClient
                .from('registro_asistencia')
                .select('id')
                .eq('personal_id', personalId)
                .eq('fecha', fecha)
                .maybeSingle();

            let result;
            if (existente) {
                result = await window.supabaseClient
                    .from('registro_asistencia')
                    .update(registro)
                    .eq('id', existente.id);
            } else {
                result = await window.supabaseClient
                    .from('registro_asistencia')
                    .insert([registro]);
            }

            if (result.error) throw result.error;

            // Notificación toast
            const personal = this.datosCache.personal.find(p => p.id === personalId);
            const nombres = {
                'ASISTENCIA': '✅ Presente',
                'RETARDO': '⏰ Retardo',
                'AUS_INJUSTIFICADA': '❌ Ausente'
            };

            Swal.fire({
                icon: 'success',
                title: nombres[tipoCodigo],
                text: personal.nombre_completo,
                timer: 1500,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });

            // Recargar
            await this.cargarRegistroAsistencia();

        } catch (e) {
            console.error('❌ Error en registro rápido:', e);
            Swal.fire('Error', 'No se pudo registrar: ' + e.message, 'error');
        }
    },

    // ============================================
    // ABRIR MODAL DE REGISTRO
    // ============================================
    abrirModalRegistro: function(personalId) {
        const personal = this.datosCache.personal.find(p => p.id === personalId);
        if (!personal) {
            Swal.fire('Error', 'Personal no encontrado', 'error');
            return;
        }

        this.personalSeleccionado = personalId;
        this.accionRapidaSeleccionada = null;

        // Llenar información del modal
        document.getElementById('modal-personal-info').textContent = personal.nombre_completo;
        document.getElementById('modal-personal-cedula').textContent = `C.I: ${personal.cedula}`;
        document.getElementById('reg-fecha').value = this.datosCache.fechaActual;
        document.getElementById('reg-tipo').value = '';
        document.getElementById('reg-hora').value = new Date().toTimeString().slice(0, 5);
        document.getElementById('reg-fecha-inicio').value = this.datosCache.fechaActual;
        document.getElementById('reg-fecha-fin').value = this.datosCache.fechaActual;
        document.getElementById('reg-dias').value = 1;
        document.getElementById('reg-observaciones').value = '';
        document.getElementById('reg-documento').value = '';

        // Ocultar campos condicionales
        document.getElementById('campos-hora').classList.add('hidden');
        document.getElementById('campos-periodo').classList.add('hidden');
        document.getElementById('campos-observaciones').classList.add('hidden');

        // Mostrar modal
        document.getElementById('modal-registro').classList.remove('hidden');
    },

    // ============================================
    // CAMBIAR TIPO DE REGISTRO (campos condicionales)
    // ============================================
    cambiarTipoRegistro: function() {
        const tipoId = document.getElementById('reg-tipo').value;
        const tipo = this.datosCache.tiposAsistencia.find(t => t.id === tipoId);

        // Ocultar todos los campos condicionales
        document.getElementById('campos-hora').classList.add('hidden');
        document.getElementById('campos-periodo').classList.add('hidden');
        document.getElementById('campos-observaciones').classList.add('hidden');

        if (!tipo) return;

        // Mostrar campos según tipo
        if (['EGRESO', 'INGRESO', 'RETARDO'].includes(tipo.codigo)) {
            document.getElementById('campos-hora').classList.remove('hidden');
            document.getElementById('campos-observaciones').classList.remove('hidden');
        } else if (['PERMISO_OBLIGATORIO', 'PERMISO_POTESTATIVO', 'REPOSO', 'VACACIONES', 'DIA_LIBRE'].includes(tipo.codigo)) {
            document.getElementById('campos-periodo').classList.remove('hidden');
            document.getElementById('campos-observaciones').classList.remove('hidden');
            this.calcularDias();
        } else if (tipo.codigo === 'AUS_INJUSTIFICADA') {
            document.getElementById('campos-observaciones').classList.remove('hidden');
        }
    },

    // ============================================
    // CALCULAR DÍAS AUTOMÁTICAMENTE
    // ============================================
    calcularDias: function() {
        const fechaInicio = document.getElementById('reg-fecha-inicio').value;
        const fechaFin = document.getElementById('reg-fecha-fin').value;

        if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            
            if (fin < inicio) {
                document.getElementById('reg-dias').value = 0;
                return;
            }
            
            const diffTime = Math.abs(fin - inicio);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            document.getElementById('reg-dias').value = diffDays;
        }
    },

    // ============================================
    // GUARDAR REGISTRO (desde modal)
    // ============================================
    guardarRegistroAsistencia: async function() {
        try {
            const personalId = this.personalSeleccionado;
            const fecha = document.getElementById('reg-fecha').value;
            const tipoId = document.getElementById('reg-tipo').value;
            const hora = document.getElementById('reg-hora').value;
            const fechaInicio = document.getElementById('reg-fecha-inicio').value;
            const fechaFin = document.getElementById('reg-fecha-fin').value;
            const dias = document.getElementById('reg-dias').value;
            const observaciones = document.getElementById('reg-observaciones').value;
            const documento = document.getElementById('reg-documento').value;

            // Determinar tipo_asistencia_id
            let tipoAsistenciaId = tipoId;
            if (this.accionRapidaSeleccionada) {
                const tipo = this.datosCache.tiposAsistencia.find(t => t.codigo === this.accionRapidaSeleccionada);
                tipoAsistenciaId = tipo ? tipo.id : null;
            }

            if (!personalId || !fecha || !tipoAsistenciaId) {
                Swal.fire('Atención', 'Complete los campos obligatorios', 'warning');
                return;
            }

            // Validar fechas
            if (fechaInicio && fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
                Swal.fire('Error', 'La fecha fin no puede ser menor que la fecha inicio', 'error');
                return;
            }

            const registro = {
                personal_id: personalId,
                fecha: fecha,
                tipo_asistencia_id: tipoAsistenciaId,
                hora_registro: hora || new Date().toTimeString().slice(0, 5),
                fecha_inicio: fechaInicio || null,
                fecha_fin: fechaFin || null,
                dias: dias ? parseInt(dias) : null,
                observaciones: observaciones || null,
                documento_soporte: documento || null,
                registrado_por: window.appState.usuarioActualId
            };

            // UPSERT
            const { data: existente } = await window.supabaseClient
                .from('registro_asistencia')
                .select('id')
                .eq('personal_id', personalId)
                .eq('fecha', fecha)
                .maybeSingle();

            let result;
            if (existente) {
                result = await window.supabaseClient
                    .from('registro_asistencia')
                    .update(registro)
                    .eq('id', existente.id);
            } else {
                result = await window.supabaseClient
                    .from('registro_asistencia')
                    .insert([registro]);
            }

            if (result.error) throw result.error;

            // Cerrar modal
            document.getElementById('modal-registro').classList.add('hidden');

            // Notificación
            const personal = this.datosCache.personal.find(p => p.id === personalId);
            const tipo = this.datosCache.tiposAsistencia.find(t => t.id === tipoAsistenciaId);

            Swal.fire({
                icon: 'success',
                title: '✅ Registrado',
                text: `${personal.nombre_completo} - ${tipo.nombre}`,
                timer: 2000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });

            // Recargar
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
            
            const { data: registro, error } = await window.supabaseClient
                .from('registro_asistencia')
                .select('*')
                .eq('personal_id', personalId)
                .eq('fecha', fecha)
                .maybeSingle();

            if (error) throw error;
            if (!registro) {
                Swal.fire('Error', 'Registro no encontrado', 'error');
                return;
            }

            this.personalSeleccionado = personalId;
            this.accionRapidaSeleccionada = null;

            const personal = this.datosCache.personal.find(p => p.id === personalId);
            document.getElementById('modal-personal-info').textContent = personal.nombre_completo;
            document.getElementById('modal-personal-cedula').textContent = `C.I: ${personal.cedula}`;
            document.getElementById('reg-fecha').value = registro.fecha;
            document.getElementById('reg-tipo').value = registro.tipo_asistencia_id;
            document.getElementById('reg-hora').value = registro.hora_registro || '';
            document.getElementById('reg-fecha-inicio').value = registro.fecha_inicio || '';
            document.getElementById('reg-fecha-fin').value = registro.fecha_fin || '';
            document.getElementById('reg-dias').value = registro.dias || 1;
            document.getElementById('reg-observaciones').value = registro.observaciones || '';
            document.getElementById('reg-documento').value = registro.documento_soporte || '';

            // Mostrar campos condicionales según tipo
            this.cambiarTipoRegistro();

            // Mostrar modal
            document.getElementById('modal-registro').classList.remove('hidden');

        } catch (e) {
            console.error('❌ Error editando registro:', e);
            Swal.fire('Error', 'No se pudo editar: ' + e.message, 'error');
        }
    },

    // ============================================
    // ACTUALIZAR ESTADÍSTICAS
    // ============================================
    actualizarEstadisticas: function(personal, registros) {
        try {
            const total = personal.length;
            const presentes = registros.filter(r => r.tipo_asistencia?.codigo === 'ASISTENCIA').length;
            const ausentes = registros.filter(r => r.tipo_asistencia?.codigo === 'AUS_INJUSTIFICADA').length;
            const pendientes = total - registros.length;

            const elTotal = document.getElementById('count-total');
            const elPresentes = document.getElementById('count-presentes');
            const elPendientes = document.getElementById('count-pendientes');
            const elAusentes = document.getElementById('count-ausentes');

            if (elTotal) elTotal.textContent = total;
            if (elPresentes) elPresentes.textContent = presentes;
            if (elPendientes) elPendientes.textContent = pendientes;
            if (elAusentes) elAusentes.textContent = ausentes;
            
        } catch (e) {
            console.error('❌ Error en actualizarEstadisticas:', e);
        }
    },

    // ============================================
    // CERRAR MODAL
    // ============================================
    cerrarModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
    },

    // ============================================
    // SELECCIONAR ACCIÓN RÁPIDA (desde modal)
    // ============================================
    seleccionarAccionRapida: function(tipoCodigo) {
        document.getElementById('reg-tipo').value = '';
        this.accionRapidaSeleccionada = tipoCodigo;
        this.guardarRegistroAsistencia();
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

            const personal = await this.cargarPersonal();
            const registros = await this.cargarRegistrosAsistencia(fecha);

            // Agrupar por tipo de personal
            const agrupado = {};
            personal.forEach(p => {
                const tipo = p.tipo_personal?.nombre || 'Sin tipo';
                if (!agrupado[tipo]) agrupado[tipo] = [];
                agrupado[tipo].push(p);
            });

            let contenido = `REPORTE DE ASISTENCIA - ${fecha}\n\n`;
            let totalGeneral = 0, presentesGeneral = 0, ausentesGeneral = 0;

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
    // REPORTE DE INASISTENCIAS
    // ============================================
    generarReporteInasistencias: async function() {
        try {
            const { value: fechas } = await Swal.fire({
                title: 'Período del Reporte',
                html: `
                    <div class="text-left space-y-3">
                        <label class="font-bold">Fecha inicio:</label>
                        <input type="date" id="swal-fecha-inicio" class="swal2-input" value="2026-01-01">
                        <label class="font-bold">Fecha fin:</label>
                        <input type="date" id="swal-fecha-fin" class="swal2-input" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Generar',
                cancelButtonText: 'Cancelar',
                preConfirm: () => ({
                    inicio: document.getElementById('swal-fecha-inicio').value,
                    fin: document.getElementById('swal-fecha-fin').value
                })
            });

            if (!fechas) return;

            const { data, error } = await window.supabaseClient
                .from('registro_asistencia')
                .select('personal_id, personal(nombre_completo, cedula), tipo_asistencia(codigo)')
                .gte('fecha', fechas.inicio)
                .lte('fecha', fechas.fin)
                .in('tipo_asistencia.codigo', ['AUS_INJUSTIFICADA', 'REPOSO', 'VACACIONES']);

            if (error) throw error;

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

            const top10 = Object.values(agrupado).sort((a, b) => b.total - a.total).slice(0, 10);

            let contenido = `TOP 10 - PERSONAL CON MÁS INASISTENCIAS\n`;
            contenido += `Período: ${fechas.inicio} al ${fechas.fin}\n\n`;
            
            if (top10.length === 0) {
                contenido += 'No hay inasistencias en este período\n';
            } else {
                top10.forEach((p, idx) => {
                    contenido += `${idx + 1}. ${p.nombre} - C.I: ${p.cedula}\n`;
                    contenido += `   Total inasistencias: ${p.total}\n\n`;
                });
            }

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

    // ============================================
    // REPORTE DE PERMISOS
    // ============================================
    generarReportePermisos: async function() {
        try {
            const { value: fechas } = await Swal.fire({
                title: 'Período del Reporte',
                html: `
                    <div class="text-left space-y-3">
                        <label class="font-bold">Fecha inicio:</label>
                        <input type="date" id="swal-fecha-inicio" class="swal2-input" value="2026-01-01">
                        <label class="font-bold">Fecha fin:</label>
                        <input type="date" id="swal-fecha-fin" class="swal2-input" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Generar',
                cancelButtonText: 'Cancelar',
                preConfirm: () => ({
                    inicio: document.getElementById('swal-fecha-inicio').value,
                    fin: document.getElementById('swal-fecha-fin').value
                })
            });

            if (!fechas) return;

            const { data, error } = await window.supabaseClient
                .from('registro_asistencia')
                .select('personal_id, personal(nombre_completo, cedula), tipo_asistencia(codigo)')
                .gte('fecha', fechas.inicio)
                .lte('fecha', fechas.fin)
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
            contenido += `Período: ${fechas.inicio} al ${fechas.fin}\n\n`;
            
            if (lista.length === 0) {
                contenido += 'No hay permisos en este período\n';
            } else {
                lista.forEach((p, idx) => {
                    contenido += `${idx + 1}. ${p.nombre} - C.I: ${p.cedula}\n`;
                    contenido += `   Obligatorios: ${p.obligatorios} | Potestativos: ${p.potestativos}\n\n`;
                });
            }

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

    // ============================================
    // REPORTE DE RETARDOS
    // ============================================
    generarReporteRetardos: async function() {
        try {
            const { value: fechas } = await Swal.fire({
                title: 'Período del Reporte',
                html: `
                    <div class="text-left space-y-3">
                        <label class="font-bold">Fecha inicio:</label>
                        <input type="date" id="swal-fecha-inicio" class="swal2-input" value="2026-01-01">
                        <label class="font-bold">Fecha fin:</label>
                        <input type="date" id="swal-fecha-fin" class="swal2-input" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Generar',
                cancelButtonText: 'Cancelar',
                preConfirm: () => ({
                    inicio: document.getElementById('swal-fecha-inicio').value,
                    fin: document.getElementById('swal-fecha-fin').value
                })
            });

            if (!fechas) return;

            const { data, error } = await window.supabaseClient
                .from('registro_asistencia')
                .select('personal_id, personal(nombre_completo, cedula), hora_registro, fecha')
                .gte('fecha', fechas.inicio)
                .lte('fecha', fechas.fin)
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
                agrupado[id].fechas.push(`${r.fecha} (${r.hora_registro || 's/h'})`);
            });

            const lista = Object.values(agrupado).sort((a, b) => b.total - a.total);

            let contenido = `PERSONAL CON RETARDOS\n`;
            contenido += `Período: ${fechas.inicio} al ${fechas.fin}\n\n`;
            
            if (lista.length === 0) {
                contenido += 'No hay retardos en este período\n';
            } else {
                lista.forEach((p, idx) => {
                    contenido += `${idx + 1}. ${p.nombre} - C.I: ${p.cedula}\n`;
                    contenido += `   Total retardos: ${p.total}\n`;
                    contenido += `   Fechas: ${p.fechas.join(', ')}\n\n`;
                });
            }

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

    // ============================================
    // REPORTE DE VACACIONES
    // ============================================
    generarReporteVacaciones: async function() {
        try {
            const { value: fechas } = await Swal.fire({
                title: 'Período del Reporte',
                html: `
                    <div class="text-left space-y-3">
                        <label class="font-bold">Fecha inicio:</label>
                        <input type="date" id="swal-fecha-inicio" class="swal2-input" value="2026-01-01">
                        <label class="font-bold">Fecha fin:</label>
                        <input type="date" id="swal-fecha-fin" class="swal2-input" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                `,
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Generar',
                cancelButtonText: 'Cancelar',
                preConfirm: () => ({
                    inicio: document.getElementById('swal-fecha-inicio').value,
                    fin: document.getElementById('swal-fecha-fin').value
                })
            });

            if (!fechas) return;

            const { data, error } = await window.supabaseClient
                .from('registro_asistencia')
                .select('personal_id, personal(nombre_completo, cedula, tipo_personal(nombre)), fecha, fecha_inicio, fecha_fin, dias, observaciones')
                .gte('fecha', fechas.inicio)
                .lte('fecha', fechas.fin)
                .eq('tipo_asistencia.codigo', 'VACACIONES');

            if (error) throw error;

            let contenido = `PERSONAL DE VACACIONES\n`;
            contenido += `Período: ${fechas.inicio} al ${fechas.fin}\n\n`;
            
            if (data.length === 0) {
                contenido += 'No hay personal de vacaciones en este período\n';
            } else {
                data.forEach((r, idx) => {
                    contenido += `${idx + 1}. ${r.personal.nombre_completo}\n`;
                    contenido += `   C.I: ${r.personal.cedula}\n`;
                    contenido += `   Tipo: ${r.personal.tipo_personal?.nombre}\n`;
                    if (r.fecha_inicio && r.fecha_fin) {
                        contenido += `   Período: ${r.fecha_inicio} al ${r.fecha_fin}`;
                        if (r.dias) contenido += ` (${r.dias} días)`;
                        contenido += '\n';
                    } else {
                        contenido += `   Fecha: ${r.fecha}\n`;
                    }
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
    // GESTIONAR PERSONAL (AGREGAR NUEVO)
    // ============================================
    cargarDatosPersonales: async function() {
        const { value: formValues } = await Swal.fire({
            title: 'Agregar Personal',
            html: `
                <div class="text-left space-y-3">
                    <input id="swal-cedula" class="swal2-input" placeholder="Cédula (V-12345678)">
                    <input id="swal-nombre" class="swal2-input" placeholder="Nombre completo">
                    <select id="swal-tipo" class="swal2-select" style="width: 100%; padding: 10px;">
                        <option value="">Seleccione tipo...</option>
                        ${this.datosCache.tiposPersonal.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
                    </select>
                    <select id="swal-genero" class="swal2-select" style="width: 100%; padding: 10px;">
                        <option value="">Género...</option>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                    </select>
                    <label class="text-sm font-bold">Fecha de nacimiento:</label>
                    <input type="date" id="swal-fecha-nac" class="swal2-input">
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
                    genero: document.getElementById('swal-genero').value,
                    fechaNac: document.getElementById('swal-fecha-nac').value,
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
                        genero: formValues.genero || null,
                        fecha_nacimiento: formValues.fechaNac || null,
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
    // MOSTRAR MODAL REPORTES AVANZADOS
    // ============================================
    mostrarModalReportesAvanzados: function() {
        const modal = document.getElementById('modal-reportes');
        if (modal) modal.classList.remove('hidden');
    }
};

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================
window.cargarTiposPersonal = () => window.modules.asistenciaPersonal.cargarTiposPersonal();
window.cargarTiposAsistencia = () => window.modules.asistenciaPersonal.cargarTiposAsistencia();
window.cargarRegistroAsistencia = () => window.modules.asistenciaPersonal.cargarRegistroAsistencia();
window.abrirModalRegistro = (id) => window.modules.asistenciaPersonal.abrirModalRegistro(id);
window.guardarRegistroAsistencia = () => window.modules.asistenciaPersonal.guardarRegistroAsistencia();
window.cambiarTipoRegistro = () => window.modules.asistenciaPersonal.cambiarTipoRegistro();
window.calcularDias = () => window.modules.asistenciaPersonal.calcularDias();
window.cerrarModal = (id) => window.modules.asistenciaPersonal.cerrarModal(id);
window.generarReporteDiario = () => window.modules.asistenciaPersonal.generarReporteDiario();
window.mostrarModalReportesAvanzados = () => window.modules.asistenciaPersonal.mostrarModalReportesAvanzados();
window.generarReporteInasistencias = () => window.modules.asistenciaPersonal.generarReporteInasistencias();
window.generarReportePermisos = () => window.modules.asistenciaPersonal.generarReportePermisos();
window.generarReporteRetardos = () => window.modules.asistenciaPersonal.generarReporteRetardos();
window.generarReporteVacaciones = () => window.modules.asistenciaPersonal.generarReporteVacaciones();
window.cargarDatosPersonales = () => window.modules.asistenciaPersonal.cargarDatosPersonales();
window.seleccionarAccionRapida = (codigo) => window.modules.asistenciaPersonal.seleccionarAccionRapida(codigo);

console.log('✅ Módulo de Asistencia de Personal v2.0 cargado');
