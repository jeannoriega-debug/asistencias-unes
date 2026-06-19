/**
 * MÓDULO DE ASISTENCIA DE PERSONAL - VERSIÓN 2.1
 * Sistema dinámico con zona horaria Caracas (UTC-4)
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
    debounceTimer: null,

    // ============================================
    // 🕐 FUNCIONES DE FECHA/HORA CARACAS (UTC-4)
    // ============================================
    getFechaCaracas: function() {
        const ahora = new Date();
        const opciones = { 
            timeZone: 'America/Caracas',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        };
        return ahora.toLocaleDateString('en-CA', opciones);
    },

    getHoraCaracas: function() {
        const ahora = new Date();
        const opciones = {
            timeZone: 'America/Caracas',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        return ahora.toLocaleTimeString('en-GB', opciones);
    },

    getFechaFormateadaCaracas: function() {
        const fecha = this.getFechaCaracas();
        return this.formatearFechaLarga(fecha);
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
            const selectTipo = document.getElementById('filtro-tipo-personal');
            const tipoPersonalId = selectTipo ? selectTipo.value : '';
            const busqueda = document.getElementById('buscar-personal')?.value?.toLowerCase() || '';

            console.log('🔍 Filtro tipo personal:', tipoPersonalId || '(vacío - todos)');
            console.log('🔍 Búsqueda:', busqueda || '(sin filtro)');

            if (!fecha) {
                Swal.fire('Atención', 'Seleccione una fecha', 'warning');
                return;
            }

            this.datosCache.fechaActual = fecha;

            const [personal, registros] = await Promise.all([
                this.cargarPersonal(tipoPersonalId || null),
                this.cargarRegistrosAsistencia(fecha)
            ]);

            console.log('✅ Personal cargado:', personal.length, 'empleados');

            const registrosMap = {};
            registros.forEach(r => {
                registrosMap[r.personal_id] = r;
            });

            let personalFiltrado = personal;
            if (busqueda) {
                personalFiltrado = personal.filter(p => 
                    p.nombre_completo.toLowerCase().includes(busqueda) ||
                    p.cedula.toLowerCase().includes(busqueda)
                );
                console.log('🔍 Resultados filtrados:', personalFiltrado.length);
            }

            const pendientes = personalFiltrado.filter(p => !registrosMap[p.id]);
            const registrados = personalFiltrado.filter(p => registrosMap[p.id]);

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
    // BÚSQUEDA EN TIEMPO REAL (CON DEBOUNCE)
    // ============================================
    buscarEnTiempoReal: function() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            this.cargarRegistroAsistencia();
        }, 300);
    },

// ============================================
// MOSTRAR LISTADO POR ESTADO (PERMISOS, REPOSOS, RETARDOS)
// ============================================
mostrarListadoPorEstado: async function(tipo) {
    try {
        const fecha = this.datosCache.fechaActual;
        if (!fecha) {
            Swal.fire('Atención', 'Seleccione una fecha primero', 'warning');
            return;
        }

        const personal = await this.cargarPersonal();
        const registros = await this.cargarRegistrosAsistencia(fecha);

        const registrosMap = {};
        registros.forEach(r => {
            registrosMap[r.personal_id] = r;
        });

        // Filtrar según el tipo
        let listaFiltrada = [];
        let titulo = '';
        let icono = '';
        let color = '';

        if (tipo === 'PERMISO') {
            titulo = ' PERSONAL CON PERMISOS';
            icono = 'fa-file-alt';
            color = '#F97316';
            listaFiltrada = personal.filter(p => {
                const reg = registrosMap[p.id];
                return reg && ['PERMISO_OBLIGATORIO', 'PERMISO_POTESTATIVO'].includes(reg.tipo_asistencia?.codigo);
            });
        } else if (tipo === 'REPOSO') {
            titulo = '🏥 PERSONAL EN REPOSO';
            icono = 'fa-bed';
            color = '#A855F7';
            listaFiltrada = personal.filter(p => {
                const reg = registrosMap[p.id];
                return reg && reg.tipo_asistencia?.codigo === 'REPOSO';
            });
        } else if (tipo === 'RETARDO') {
            titulo = '⏰ PERSONAL CON RETARDOS';
            icono = 'fa-clock';
            color = '#EAB308';
            listaFiltrada = personal.filter(p => {
                const reg = registrosMap[p.id];
                return reg && reg.tipo_asistencia?.codigo === 'RETARDO';
            });
        } else if (tipo === 'AUSENTE') {
            titulo = '❌ PERSONAL AUSENTE';
            icono = 'fa-user-times';
            color = '#EF4444';
            listaFiltrada = personal.filter(p => {
                const reg = registrosMap[p.id];
                return reg && reg.tipo_asistencia?.codigo === 'AUS_INJUSTIFICADA';
            });
        } else if (tipo === 'VACACIONES') {
            titulo = '🏖️ PERSONAL DE VACACIONES';
            icono = 'fa-plane';
            color = '#3B82F6';
            listaFiltrada = personal.filter(p => {
                const reg = registrosMap[p.id];
                return reg && reg.tipo_asistencia?.codigo === 'VACACIONES';
            });
        } else if (tipo === 'SIN_REGISTRO') {
            titulo = '⚠️ PERSONAL SIN REGISTRO';
            icono = 'fa-question-circle';
            color = '#6B7280';
            listaFiltrada = personal.filter(p => !registrosMap[p.id]);
        }

        if (listaFiltrada.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Sin registros',
                text: `No hay personal con ${titulo.toLowerCase()} para esta fecha`,
                confirmButtonText: 'OK'
            });
            return;
        }

        // Construir HTML del listado
        let contenidoHTML = `
            <div style="text-align: left; max-height: 60vh; overflow-y: auto;">
                <div style="background: ${color}; color: white; padding: 12px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                    <h3 style="margin: 0; font-size: 16px;">${titulo}</h3>
                    <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Fecha: ${this.formatearFechaLarga(fecha)} | Total: ${listaFiltrada.length}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `;

        listaFiltrada.forEach((p, idx) => {
            const reg = registrosMap[p.id];
            const tipoAsistencia = reg?.tipo_asistencia?.nombre || '';
            const hora = reg?.hora_registro || '';
            const observaciones = reg?.observaciones || '';
            const fechaInicio = reg?.fecha_inicio ? this.formatearFechaLarga(reg.fecha_inicio) : '';
            const fechaFin = reg?.fecha_fin ? this.formatearFechaLarga(reg.fecha_fin) : '';
            const dias = reg?.dias || '';

            contenidoHTML += `
                <div style="background: #F9FAFB; padding: 12px; border-radius: 6px; border-left: 4px solid ${color};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <strong style="font-size: 14px; color: #1F2937;">${idx + 1}. ${p.nombre_completo}</strong>
                        <span style="background: ${color}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px;">${tipoAsistencia}</span>
                    </div>
                    <div style="font-size: 12px; color: #6B7280;">
                        C.I: ${p.cedula}
                        ${p.tipo_personal?.nombre ? ` | ${p.tipo_personal.nombre}` : ''}
                    </div>
                    ${hora ? `<div style="font-size: 11px; color: #9CA3AF; margin-top: 3px;"> Hora: ${hora}</div>` : ''}
                    ${fechaInicio && fechaFin ? `<div style="font-size: 11px; color: #9CA3AF; margin-top: 3px;">📅 ${fechaInicio} al ${fechaFin}${dias ? ` (${dias} días)` : ''}</div>` : ''}
                    ${observaciones ? `<div style="font-size: 11px; color: #9CA3AF; margin-top: 3px;">📝 ${observaciones}</div>` : ''}
                </div>
            `;
        });

        contenidoHTML += `</div></div>`;

        Swal.fire({
            title: false,
            html: contenidoHTML,
            width: '600px',
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: color
        });

    } catch (e) {
        console.error('❌ Error:', e);
        Swal.fire('Error', 'No se pudo mostrar el listado: ' + e.message, 'error');
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
// CREAR TARJETA DE PERSONAL (VERSIÓN COMPACTA EXACTA)
// ============================================
crearTarjetaPersonal: function(personal, registro) {
    const tieneRegistro = registro !== null;
    const estado = tieneRegistro ? registro.tipo_asistencia : null;
    
    // Iniciales
    const iniciales = personal.nombre_completo
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    // Edad
    let edadHtml = '';
    if (personal.fecha_nacimiento) {
        const edad = this.calcularEdad(personal.fecha_nacimiento);
        edadHtml = `<span class="separator-text">|</span><span>${edad} años</span>`;
    }
    
    // Icono de género
    let genderHtml = '';
    if (personal.genero) {
        const icono = personal.genero === 'M' ? '♂' : '♀';
        const color = personal.genero === 'M' ? '#3B82F6' : '#EC4899';
        genderHtml = `<span class="gender-icon" style="color:${color}">${icono}</span>`;
    }

    // Estado badge
    let estadoHtml = '';
    if (estado) {
        const colores = {
            'ASISTENCIA': 'background:#E8F5E9;color:#2E7D32;',
            'AUS_INJUSTIFICADA': 'background:#FFEBEE;color:#C62828;',
            'RETARDO': 'background:#FFF8E1;color:#F57F17;',
            'PERMISO_OBLIGATORIO': 'background:#FFF3E0;color:#E65100;',
            'PERMISO_POTESTATIVO': 'background:#FFF3E0;color:#E65100;',
            'REPOSO': 'background:#F3E5F5;color:#6A1B9A;',
            'VACACIONES': 'background:#E3F2FD;color:#1565C0;',
            'DIA_LIBRE': 'background:#F5F5F5;color:#424242;',
            'EGRESO': 'background:#FCE4EC;color:#AD1457;',
            'INGRESO': 'background:#E0F2F1;color:#00695C;'
        };
        const style = colores[estado.codigo] || 'background:#F5F5F5;color:#424242;';
        estadoHtml = `<div class="estado-badge" style="${style}">${estado.nombre}</div>`;
    }

    // Info adicional del registro
    let infoRegistro = '';
    if (tieneRegistro && registro.fecha_inicio && registro.fecha_fin) {
        infoRegistro = `
            <div style="font-size:10px;color:#757575;margin-top:2px;">
                <i class="fas fa-calendar-alt"></i>
                ${this.formatearFechaCorta(registro.fecha_inicio)} al ${this.formatearFechaCorta(registro.fecha_fin)}
                ${registro.dias ? `(${registro.dias} días)` : ''}
            </div>
        `;
    }

    // Botones de acción
    let buttonsHtml = '';
    if (!tieneRegistro) {
        buttonsHtml = `
            <div class="actions">
                <button class="action-btn presente" onclick="window.modules.asistenciaPersonal.registroRapido('${personal.id}', 'ASISTENCIA')" title="Presente">
                    <i class="fas fa-check"></i>
                </button>
                <button class="action-btn retardo" onclick="window.modules.asistenciaPersonal.registroRapido('${personal.id}', 'RETARDO')" title="Retardo">
                    <i class="fas fa-clock"></i>
                </button>
                <button class="action-btn ausente" onclick="window.modules.asistenciaPersonal.registroRapido('${personal.id}', 'AUS_INJUSTIFICADA')" title="Ausente">
                    <i class="fas fa-times"></i>
                </button>
                <button class="more-btn" onclick="window.modules.asistenciaPersonal.abrirModalRegistro('${personal.id}')" title="Más opciones">
                    ⋯
                </button>
            </div>
        `;
    } else {
        buttonsHtml = `
            <div class="actions">
                <button class="more-btn" onclick="window.modules.asistenciaPersonal.editarRegistro('${personal.id}')" title="Editar">
                    <i class="fas fa-edit" style="font-size:13px;"></i>
                </button>
            </div>
        `;
    }

    return `
        <div class="badge-card">
            <div class="card-row">
                <div class="avatar">${iniciales}</div>
                <div class="separator"></div>
                <div class="info">
                    <div class="nombre">${personal.nombre_completo}</div>
                    <div class="cedula-info">
                        <span>C.I. ${personal.cedula}</span>
                        ${edadHtml}
                        ${genderHtml}
                    </div>
                    ${estadoHtml}
                    ${infoRegistro}
                </div>
                ${buttonsHtml}
            </div>
        </div>
    `;
},

    // ============================================
    // CALCULAR EDAD
    // ============================================
    calcularEdad: function(fechaNacimiento) {
        if (!fechaNacimiento) return null;
        const hoy = new Date(this.getFechaCaracas());
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
    // FORMATEAR FECHA LARGA (DD/MM/AAAA)
    // ============================================
    formatearFechaLarga: function(fecha) {
        if (!fecha) return '';
        const partes = fecha.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return fecha;
    },

    // ============================================
    // REGISTRO RÁPIDO (P/R/A) - SIN MODAL
    // ============================================
    registroRapido: async function(personalId, tipoCodigo) {
        try {
            const fecha = this.datosCache.fechaActual;
            const hora = this.getHoraCaracas();

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

        document.getElementById('modal-personal-info').textContent = personal.nombre_completo;
        document.getElementById('modal-personal-cedula').textContent = `C.I: ${personal.cedula}`;
        document.getElementById('reg-fecha').value = this.datosCache.fechaActual;
        document.getElementById('reg-tipo').value = '';
        document.getElementById('reg-hora').value = this.getHoraCaracas();
        document.getElementById('reg-fecha-inicio').value = this.datosCache.fechaActual;
        document.getElementById('reg-fecha-fin').value = this.datosCache.fechaActual;
        document.getElementById('reg-dias').value = 1;
        document.getElementById('reg-observaciones').value = '';
        document.getElementById('reg-documento').value = '';

        document.getElementById('campos-hora').classList.add('hidden');
        document.getElementById('campos-periodo').classList.add('hidden');
        document.getElementById('campos-observaciones').classList.add('hidden');

        document.getElementById('modal-registro').classList.remove('hidden');
    },

    // ============================================
    // CAMBIAR TIPO DE REGISTRO (campos condicionales)
    // ============================================
    cambiarTipoRegistro: function() {
        const tipoId = document.getElementById('reg-tipo').value;
        const tipo = this.datosCache.tiposAsistencia.find(t => t.id === tipoId);

        document.getElementById('campos-hora').classList.add('hidden');
        document.getElementById('campos-periodo').classList.add('hidden');
        document.getElementById('campos-observaciones').classList.add('hidden');

        if (!tipo) return;

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

            let tipoAsistenciaId = tipoId;
            if (this.accionRapidaSeleccionada) {
                const tipo = this.datosCache.tiposAsistencia.find(t => t.codigo === this.accionRapidaSeleccionada);
                tipoAsistenciaId = tipo ? tipo.id : null;
            }

            if (!personalId || !fecha || !tipoAsistenciaId) {
                Swal.fire('Atención', 'Complete los campos obligatorios', 'warning');
                return;
            }

            if (fechaInicio && fechaFin && new Date(fechaFin) < new Date(fechaInicio)) {
                Swal.fire('Error', 'La fecha fin no puede ser menor que la fecha inicio', 'error');
                return;
            }

            const registro = {
                personal_id: personalId,
                fecha: fecha,
                tipo_asistencia_id: tipoAsistenciaId,
                hora_registro: hora || this.getHoraCaracas(),
                fecha_inicio: fechaInicio || null,
                fecha_fin: fechaFin || null,
                dias: dias ? parseInt(dias) : null,
                observaciones: observaciones || null,
                documento_soporte: documento || null,
                registrado_por: window.appState.usuarioActualId
            };

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

            document.getElementById('modal-registro').classList.add('hidden');

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

            this.cambiarTipoRegistro();

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
        const retardos = registros.filter(r => r.tipo_asistencia?.codigo === 'RETARDO').length;
        const permisos = registros.filter(r => 
            ['PERMISO_OBLIGATORIO', 'PERMISO_POTESTATIVO'].includes(r.tipo_asistencia?.codigo)
        ).length;
        const reposos = registros.filter(r => r.tipo_asistencia?.codigo === 'REPOSO').length;
        const pendientes = total - registros.length;

        const elTotal = document.getElementById('count-total');
        const elPresentes = document.getElementById('count-presentes');
        const elPendientes = document.getElementById('count-pendientes');
        const elAusentes = document.getElementById('count-ausentes');
        const elRetardos = document.getElementById('count-retardos');
        const elPermisos = document.getElementById('count-permisos');
        const elReposos = document.getElementById('count-reposos');

        if (elTotal) elTotal.textContent = total;
        if (elPresentes) elPresentes.textContent = presentes;
        if (elPendientes) elPendientes.textContent = pendientes;
        if (elAusentes) elAusentes.textContent = ausentes;
        if (elRetardos) elRetardos.textContent = retardos;
        if (elPermisos) elPermisos.textContent = permisos;
        if (elReposos) elReposos.textContent = reposos;
        
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
// GENERAR REPORTE DIARIO (CON 2 OPCIONES)
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

        const agrupado = {};
        personal.forEach(p => {
            const tipo = p.tipo_personal?.nombre || 'Sin tipo';
            if (!agrupado[tipo]) agrupado[tipo] = [];
            agrupado[tipo].push(p);
        });

        const fechaFormateada = this.formatearFechaLarga(fecha);

        // Variables para totales generales
        let totalGeneral = 0, presentesGeneral = 0;
        let ausenciasInjustificadasGeneral = 0, diasLibresGeneral = 0;
        let permisosGeneral = 0, retardosGeneral = 0;
        let vacacionesGeneral = 0, repososGeneral = 0, otrosGeneral = 0, sinRegistroGeneral = 0;

        let contenidoHTML = `
            <div id="reporte-diario-content" style="font-family: Arial, sans-serif; padding: 15px; background: white;">
        `;

        Object.entries(agrupado).forEach(([tipo, lista]) => {
            const matricula = lista.length;
            
            const presentes = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'ASISTENCIA';
            }).length;

            const ausenciasInjustificadas = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'AUS_INJUSTIFICADA';
            });

            const diasLibres = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'DIA_LIBRE';
            });

            const permisos = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && ['PERMISO_OBLIGATORIO', 'PERMISO_POTESTATIVO'].includes(reg.tipo_asistencia?.codigo);
            });

            const retardos = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'RETARDO';
            });

            const vacaciones = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'VACACIONES';
            });

            const reposos = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'REPOSO';
            });

            const otros = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && !['ASISTENCIA', 'AUS_INJUSTIFICADA', 'DIA_LIBRE', 'PERMISO_OBLIGATORIO', 'PERMISO_POTESTATIVO', 'RETARDO', 'VACACIONES', 'REPOSO'].includes(reg.tipo_asistencia?.codigo);
            });

            const sinRegistro = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return !reg;
            });

            totalGeneral += matricula;
            presentesGeneral += presentes;
            ausenciasInjustificadasGeneral += ausenciasInjustificadas.length;
            diasLibresGeneral += diasLibres.length;
            permisosGeneral += permisos.length;
            retardosGeneral += retardos.length;
            vacacionesGeneral += vacaciones.length;
            repososGeneral += reposos.length;
            otrosGeneral += otros.length;
            sinRegistroGeneral += sinRegistro.length;

            contenidoHTML += `
                <div style="margin: 20px 0; padding: 12px; background: #F9FAFB; border-left: 4px solid #4F46E5; border-radius: 4px;">
                    <h3 style="color: #1F2937; margin: 0 0 12px 0; font-size: 15px; text-transform: uppercase;">${tipo}</h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
                        <div style="background: #DBEAFE; padding: 6px; border-radius: 4px;">
                            <strong style="color: #1E40AF; font-size: 12px;">Matrícula:</strong> <span style="color: #1E40AF; font-size: 12px;">${matricula}</span>
                        </div>
                        <div style="background: #D1FAE5; padding: 6px; border-radius: 4px;">
                            <strong style="color: #065F46; font-size: 12px;">Presentes:</strong> <span style="color: #065F46; font-size: 12px;">${presentes}</span>
                        </div>
                    </div>
            `;

            if (presentes > 0) {
                contenidoHTML += `<div style="margin: 8px 0;"><strong style="color: #059669; font-size: 13px;">✅ PRESENTES: ${presentes}</strong></div>`;
            }

            if (ausenciasInjustificadas.length > 0) {
                contenidoHTML += `
                    <div style="margin: 8px 0; padding: 8px; background: #FEE2E2; border-radius: 4px;">
                        <strong style="color: #DC2626; font-size: 13px;">❌ AUSENCIAS INJUSTIFICADAS: ${ausenciasInjustificadas.length}</strong>
                        <ul style="margin: 5px 0; padding-left: 18px;">
                            ${ausenciasInjustificadas.map(p => `<li style="color: #7F1D1D; margin: 2px 0; font-size: 12px;">${p.nombre_completo} - C.I ${p.cedula}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            if (diasLibres.length > 0) {
                contenidoHTML += `
                    <div style="margin: 8px 0; padding: 8px; background: #FEF3C7; border-radius: 4px;">
                        <strong style="color: #D97706; font-size: 13px;">📅 DÍAS LIBRES: ${diasLibres.length}</strong>
                        <ul style="margin: 5px 0; padding-left: 18px;">
                            ${diasLibres.map(p => `<li style="color: #92400E; margin: 2px 0; font-size: 12px;">${p.nombre_completo} - C.I ${p.cedula}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            if (permisos.length > 0) {
                contenidoHTML += `
                    <div style="margin: 8px 0; padding: 8px; background: #FEF3C7; border-radius: 4px;">
                        <strong style="color: #D97706; font-size: 13px;">📋 PERMISOS: ${permisos.length}</strong>
                        <ul style="margin: 5px 0; padding-left: 18px;">
                            ${permisos.map(p => {
                                const reg = registros.find(r => r.personal_id === p.id);
                                const tipoPermiso = reg.tipo_asistencia?.nombre || 'Permiso';
                                return `<li style="color: #92400E; margin: 2px 0; font-size: 12px;">
                                    <strong>${p.nombre_completo}</strong> - C.I ${p.cedula}<br/>
                                    <em style="font-size: 11px;">(${tipoPermiso})${reg.observaciones ? ' - ' + reg.observaciones : ''}</em>
                                </li>`;
                            }).join('')}
                        </ul>
                    </div>
                `;
            }

            if (retardos.length > 0) {
                contenidoHTML += `
                    <div style="margin: 8px 0; padding: 8px; background: #FEF3C7; border-radius: 4px;">
                        <strong style="color: #D97706; font-size: 13px;">⏰ RETARDOS: ${retardos.length}</strong>
                        <ul style="margin: 5px 0; padding-left: 18px;">
                            ${retardos.map(p => {
                                const reg = registros.find(r => r.personal_id === p.id);
                                return `<li style="color: #92400E; margin: 2px 0; font-size: 12px;">
                                    <strong>${p.nombre_completo}</strong> - C.I ${p.cedula}
                                    ${reg.hora_registro ? `<em style="font-size: 11px;"> (Hora: ${reg.hora_registro})</em>` : ''}
                                </li>`;
                            }).join('')}
                        </ul>
                    </div>
                `;
            }

            if (vacaciones.length > 0) {
                contenidoHTML += `
                    <div style="margin: 8px 0; padding: 8px; background: #DBEAFE; border-radius: 4px;">
                        <strong style="color: #1E40AF; font-size: 13px;">️ VACACIONES: ${vacaciones.length}</strong>
                        <ul style="margin: 5px 0; padding-left: 18px;">
                            ${vacaciones.map(p => {
                                const reg = registros.find(r => r.personal_id === p.id);
                                return `<li style="color: #1E3A8A; margin: 2px 0; font-size: 12px;">
                                    <strong>${p.nombre_completo}</strong> - C.I ${p.cedula}<br/>
                                    <em style="font-size: 11px;">${reg.fecha_inicio && reg.fecha_fin ? 
                                        'Período: ' + this.formatearFechaLarga(reg.fecha_inicio) + ' al ' + this.formatearFechaLarga(reg.fecha_fin) + 
                                        (reg.dias ? ` (${reg.dias} días)` : '') : ''}</em>
                                </li>`;
                            }).join('')}
                        </ul>
                    </div>
                `;
            }

            if (reposos.length > 0) {
                contenidoHTML += `
                    <div style="margin: 8px 0; padding: 8px; background: #E9D5FF; border-radius: 4px;">
                        <strong style="color: #6B21A8; font-size: 13px;">🏥 REPOSOS: ${reposos.length}</strong>
                        <ul style="margin: 5px 0; padding-left: 18px;">
                            ${reposos.map(p => {
                                const reg = registros.find(r => r.personal_id === p.id);
                                return `<li style="color: #581C87; margin: 2px 0; font-size: 12px;">
                                    <strong>${p.nombre_completo}</strong> - C.I ${p.cedula}<br/>
                                    <em style="font-size: 11px;">${reg.observaciones || ''}</em>
                                </li>`;
                            }).join('')}
                        </ul>
                    </div>
                `;
            }

            if (otros.length > 0) {
                contenidoHTML += `
                    <div style="margin: 8px 0; padding: 8px; background: #F3F4F6; border-radius: 4px;">
                        <strong style="color: #374151; font-size: 13px;">📌 OTROS: ${otros.length}</strong>
                        <ul style="margin: 5px 0; padding-left: 18px;">
                            ${otros.map(p => {
                                const reg = registros.find(r => r.personal_id === p.id);
                                return `<li style="color: #4B5563; margin: 2px 0; font-size: 12px;">
                                    <strong>${p.nombre_completo}</strong> - C.I ${p.cedula}
                                    <em style="font-size: 11px;"> (${reg.tipo_asistencia?.nombre || 'Sin clasificar'})</em>
                                </li>`;
                            }).join('')}
                        </ul>
                    </div>
                `;
            }

            if (sinRegistro.length > 0) {
                contenidoHTML += `
                    <div style="margin: 8px 0; padding: 8px; background: #FEE2E2; border-radius: 4px;">
                        <strong style="color: #DC2626; font-size: 13px;">⚠️ SIN REGISTRO: ${sinRegistro.length}</strong>
                        <ul style="margin: 5px 0; padding-left: 18px;">
                            ${sinRegistro.map(p => `<li style="color: #7F1D1D; margin: 2px 0; font-size: 12px;">${p.nombre_completo} - C.I ${p.cedula}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }

            contenidoHTML += `</div><div style="border-bottom: 2px dashed #E5E7EB; margin: 15px 0;"></div>`;
        });

        // RESUMEN GENERAL
        contenidoHTML += `
            <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
                <h3 style="margin: 0 0 15px 0; text-align: center; font-size: 16px; text-transform: uppercase;">📊 RESUMEN GENERAL</h3>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; opacity: 0.9;">Total Personal</div>
                        <div style="font-size: 20px; font-weight: bold;">${totalGeneral}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; opacity: 0.9;">Sin Registro</div>
                        <div style="font-size: 20px; font-weight: bold;">${sinRegistroGeneral}</div>
                    </div>
                    <div style="background: rgba(34, 197, 94, 0.3); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; opacity: 0.9;">✅ Presentes</div>
                        <div style="font-size: 20px; font-weight: bold;">${presentesGeneral}</div>
                    </div>
                    <div style="background: rgba(239, 68, 68, 0.3); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; opacity: 0.9;">❌ Ausencias</div>
                        <div style="font-size: 20px; font-weight: bold;">${ausenciasInjustificadasGeneral}</div>
                    </div>
                    <div style="background: rgba(245, 158, 11, 0.3); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; opacity: 0.9;">📅 Días Libres</div>
                        <div style="font-size: 20px; font-weight: bold;">${diasLibresGeneral}</div>
                    </div>
                    <div style="background: rgba(245, 158, 11, 0.3); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; opacity: 0.9;"> Permisos</div>
                        <div style="font-size: 20px; font-weight: bold;">${permisosGeneral}</div>
                    </div>
                    <div style="background: rgba(245, 158, 11, 0.3); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; opacity: 0.9;"> Retardos</div>
                        <div style="font-size: 20px; font-weight: bold;">${retardosGeneral}</div>
                    </div>
                    <div style="background: rgba(59, 130, 246, 0.3); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; opacity: 0.9;">🏖️ Vacaciones</div>
                        <div style="font-size: 20px; font-weight: bold;">${vacacionesGeneral}</div>
                    </div>
                    <div style="background: rgba(168, 85, 247, 0.3); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; opacity: 0.9;">🏥 Reposos</div>
                        <div style="font-size: 20px; font-weight: bold;">${repososGeneral}</div>
                    </div>
                    <div style="background: rgba(107, 114, 128, 0.3); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; opacity: 0.9;"> Otros</div>
                        <div style="font-size: 20px; font-weight: bold;">${otrosGeneral}</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 15px; text-align: center; color: #6B7280; font-size: 11px;">
                <p>Generado el ${new Date().toLocaleString('es-VE')}</p>
                <p>Sistema de Asistencia PNF - UNES</p>
            </div>
            </div>
        `;

        // Mostrar modal con 2 botones
        Swal.fire({
            title: 'Reporte Diario',
            html: `
                <div style="margin-bottom: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button id="btn-descargar-pdf" onclick="descargarReportePDF()" 
                            style="background: #DC2626; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <button id="btn-descargar-html" onclick="generarReporteHTML()" 
                            style="background: #2563EB; color: white; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-file-code"></i> HTML
                    </button>
                </div>
                <div style="max-height: 65vh; overflow-y: auto; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px;">
                    ${contenidoHTML}
                </div>
            `,
            width: '900px',
            showConfirmButton: false,
            showCloseButton: true
        });

        // Guardar contenido para descarga
        window.reporteDiarioHTML = contenidoHTML;
        window.reporteDiarioFecha = fechaFormateada;

    } catch (e) {
        console.error('❌ Error generando reporte:', e);
        Swal.fire('Error', 'No se pudo generar el reporte: ' + e.message, 'error');
    }
},

// ============================================
// DESCARGAR REPORTE DIARIO COMO PDF (TEXTO REAL - MULTIPÁGINA)
// ============================================
descargarReportePDF: async function() {
    try {
        if (typeof window.jspdf === 'undefined') {
            throw new Error('jsPDF no está cargada');
        }

        const { jsPDF } = window.jspdf;
        const fecha = this.datosCache.fechaActual;
        
        if (!fecha) {
            Swal.fire('Atención', 'Seleccione una fecha primero', 'warning');
            return;
        }

        const personal = await this.cargarPersonal();
        const registros = await this.cargarRegistrosAsistencia(fecha);
        const fechaFormateada = this.formatearFechaLarga(fecha);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const marginL = 12;
        const marginR = 12;
        const contentW = pageW - marginL - marginR;
        let y = 20;
        let pageNum = 1;

        // Función para verificar espacio y crear nueva página
        const checkSpace = (needed) => {
            if (y + needed > pageH - 20) {
                // Pie de página
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text(`Página ${pageNum} | Generado: ${new Date().toLocaleString('es-VE')} | Sistema UNES`, pageW / 2, pageH - 8, { align: 'center' });
                pdf.addPage();
                pageNum++;
                y = 15;
                return true;
            }
            return false;
        };

        // Función para escribir texto con wrap
        const writeText = (text, fontSize, color, bold, indent) => {
            pdf.setFontSize(fontSize);
            pdf.setTextColor(color[0], color[1], color[2]);
            if (bold) pdf.setFont('helvetica', 'bold');
            else pdf.setFont('helvetica', 'normal');
            
            const x = marginL + (indent || 0);
            const maxWidth = contentW - (indent || 0);
            const lines = pdf.splitTextToSize(text, maxWidth);
            
            lines.forEach(line => {
                checkSpace(fontSize * 0.5 + 1);
                pdf.text(line, x, y);
                y += fontSize * 0.45 + 1;
            });
        };

        // Función para línea separadora
        const drawLine = (color) => {
            checkSpace(5);
            pdf.setDrawColor(color[0], color[1], color[2]);
            pdf.setLineWidth(0.3);
            pdf.line(marginL, y, pageW - marginR, y);
            y += 4;
        };

        // Función para rectángulo de color
        const drawBox = (text, bgColor, textColor) => {
            checkSpace(12);
            pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
            pdf.roundedRect(marginL, y - 4, contentW, 9, 2, 2, 'F');
            pdf.setFontSize(10);
            pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
            pdf.setFont('helvetica', 'bold');
            pdf.text(text, marginL + 4, y + 2);
            y += 9;
        };

        // ==========================================
        // ENCABEZADO
        // ==========================================
        pdf.setFillColor(79, 70, 229);
        pdf.roundedRect(marginL, y - 5, contentW, 25, 3, 3, 'F');
        pdf.setFontSize(18);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text('REPORTE DIARIO DE ASISTENCIA', pageW / 2, y + 5, { align: 'center' });
        pdf.setFontSize(13);
        pdf.text(fechaFormateada, pageW / 2, y + 13, { align: 'center' });
        y += 30;

        // ==========================================
        // CONTENIDO POR TIPO DE PERSONAL
        // ==========================================
        const agrupado = {};
        personal.forEach(p => {
            const tipo = p.tipo_personal?.nombre || 'Sin tipo';
            if (!agrupado[tipo]) agrupado[tipo] = [];
            agrupado[tipo].push(p);
        });

        let totalGeneral = 0, presentesGeneral = 0;
        let ausenciasGeneral = 0, diasLibresGeneral = 0;
        let permisosGeneral = 0, retardosGeneral = 0;
        let vacacionesGeneral = 0, repososGeneral = 0;
        let otrosGeneral = 0, sinRegistroGeneral = 0;

        Object.entries(agrupado).forEach(([tipo, lista]) => {
            checkSpace(50);

            const matricula = lista.length;
            
            const presentes = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'ASISTENCIA';
            }).length;

            const ausencias = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'AUS_INJUSTIFICADA';
            });

            const diasLibres = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'DIA_LIBRE';
            });

            const permisos = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && ['PERMISO_OBLIGATORIO', 'PERMISO_POTESTATIVO'].includes(reg.tipo_asistencia?.codigo);
            });

            const retardos = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'RETARDO';
            });

            const vacaciones = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'VACACIONES';
            });

            const reposos = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && reg.tipo_asistencia?.codigo === 'REPOSO';
            });

            const otros = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return reg && !['ASISTENCIA', 'AUS_INJUSTIFICADA', 'DIA_LIBRE', 'PERMISO_OBLIGATORIO', 'PERMISO_POTESTATIVO', 'RETARDO', 'VACACIONES', 'REPOSO'].includes(reg.tipo_asistencia?.codigo);
            });

            const sinRegistro = lista.filter(p => {
                const reg = registros.find(r => r.personal_id === p.id);
                return !reg;
            });

            totalGeneral += matricula;
            presentesGeneral += presentes;
            ausenciasGeneral += ausencias.length;
            diasLibresGeneral += diasLibres.length;
            permisosGeneral += permisos.length;
            retardosGeneral += retardos.length;
            vacacionesGeneral += vacaciones.length;
            repososGeneral += reposos.length;
            otrosGeneral += otros.length;
            sinRegistroGeneral += sinRegistro.length;

            // Título del tipo
            drawBox(`${tipo.toUpperCase()} - Matricula: ${matricula} | Presentes: ${presentes}`, [79, 70, 229], [255, 255, 255]);
            y += 3;

            // Presentes
            writeText(`PRESENTES: ${presentes}`, 10, [5, 150, 105], true, 0);

            // Ausencias
            if (ausencias.length > 0) {
                writeText(`AUSENCIAS INJUSTIFICADAS: ${ausencias.length}`, 10, [220, 38, 38], true, 0);
                ausencias.forEach(p => {
                    writeText(`• ${p.nombre_completo} - C.I ${p.cedula}`, 9, [127, 29, 29], false, 5);
                });
            }

            // Días Libres
            if (diasLibres.length > 0) {
                writeText(`DIAS LIBRES: ${diasLibres.length}`, 10, [217, 119, 6], true, 0);
                diasLibres.forEach(p => {
                    writeText(`• ${p.nombre_completo} - C.I ${p.cedula}`, 9, [146, 64, 14], false, 5);
                });
            }

            // Permisos
            if (permisos.length > 0) {
                writeText(`PERMISOS: ${permisos.length}`, 10, [217, 119, 6], true, 0);
                permisos.forEach(p => {
                    const reg = registros.find(r => r.personal_id === p.id);
                    const tipoPermiso = reg.tipo_asistencia?.nombre || 'Permiso';
                    writeText(`• ${p.nombre_completo} - C.I ${p.cedula} (${tipoPermiso})`, 9, [146, 64, 14], false, 5);
                    if (reg.observaciones) {
                        writeText(`  Motivo: ${reg.observaciones}`, 8, [107, 114, 128], false, 8);
                    }
                });
            }

            // Retardos
            if (retardos.length > 0) {
                writeText(`RETARDOS: ${retardos.length}`, 10, [217, 119, 6], true, 0);
                retardos.forEach(p => {
                    const reg = registros.find(r => r.personal_id === p.id);
                    let texto = `• ${p.nombre_completo} - C.I ${p.cedula}`;
                    if (reg.hora_registro) texto += ` (Hora: ${reg.hora_registro})`;
                    writeText(texto, 9, [146, 64, 14], false, 5);
                });
            }

            // Vacaciones
            if (vacaciones.length > 0) {
                writeText(`VACACIONES: ${vacaciones.length}`, 10, [30, 64, 175], true, 0);
                vacaciones.forEach(p => {
                    const reg = registros.find(r => r.personal_id === p.id);
                    writeText(`• ${p.nombre_completo} - C.I ${p.cedula}`, 9, [30, 58, 138], false, 5);
                    if (reg.fecha_inicio && reg.fecha_fin) {
                        let periodo = `  Periodo: ${this.formatearFechaLarga(reg.fecha_inicio)} al ${this.formatearFechaLarga(reg.fecha_fin)}`;
                        if (reg.dias) periodo += ` (${reg.dias} dias)`;
                        writeText(periodo, 8, [59, 130, 246], false, 8);
                    }
                });
            }

            // Reposos
            if (reposos.length > 0) {
                writeText(`REPOSOS: ${reposos.length}`, 10, [107, 33, 168], true, 0);
                reposos.forEach(p => {
                    const reg = registros.find(r => r.personal_id === p.id);
                    writeText(`• ${p.nombre_completo} - C.I ${p.cedula}`, 9, [88, 28, 135], false, 5);
                    if (reg.observaciones) {
                        writeText(`  Motivo: ${reg.observaciones}`, 8, [107, 114, 128], false, 8);
                    }
                });
            }

            // Otros
            if (otros.length > 0) {
                writeText(`OTROS: ${otros.length}`, 10, [55, 65, 81], true, 0);
                otros.forEach(p => {
                    const reg = registros.find(r => r.personal_id === p.id);
                    writeText(`• ${p.nombre_completo} - C.I ${p.cedula} (${reg.tipo_asistencia?.nombre || 'Sin clasificar'})`, 9, [75, 85, 99], false, 5);
                });
            }

            // Sin Registro
            if (sinRegistro.length > 0) {
                writeText(`SIN REGISTRO: ${sinRegistro.length}`, 10, [220, 38, 38], true, 0);
                sinRegistro.forEach(p => {
                    writeText(`• ${p.nombre_completo} - C.I ${p.cedula}`, 9, [127, 29, 29], false, 5);
                });
            }

            drawLine([200, 200, 200]);
            y += 3;
        });

        // ==========================================
        // RESUMEN GENERAL
        // ==========================================
        checkSpace(80);
        y += 5;

        // Fondo del resumen
        pdf.setFillColor(79, 70, 229);
        const resumenStartY = y - 5;
        
        writeText('RESUMEN GENERAL', 14, [79, 70, 229], true, 0);
        drawLine([79, 70, 229]);

        const resumenItems = [
            [`Total de Personal: ${totalGeneral}`, [31, 41, 55]],
            [`Presentes: ${presentesGeneral}`, [5, 150, 105]],
            [`Ausencias Injustificadas: ${ausenciasGeneral}`, [220, 38, 38]],
            [`Dias Libres: ${diasLibresGeneral}`, [217, 119, 6]],
            [`Permisos: ${permisosGeneral}`, [234, 88, 12]],
            [`Retardos: ${retardosGeneral}`, [245, 158, 11]],
            [`Vacaciones: ${vacacionesGeneral}`, [30, 64, 175]],
            [`Reposos: ${repososGeneral}`, [107, 33, 168]],
            [`Otros: ${otrosGeneral}`, [107, 114, 128]],
            [`Sin Registro: ${sinRegistroGeneral}`, [220, 38, 38]]
        ];

        resumenItems.forEach(([texto, color]) => {
            writeText(texto, 11, color, true, 5);
        });

        // Pie de página final
        checkSpace(15);
        y += 5;
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Generado el ${new Date().toLocaleString('es-VE')} | Sistema de Asistencia PNF - UNES`, pageW / 2, y, { align: 'center' });

        // Numerar todas las páginas
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Pagina ${i} de ${totalPages}`, pageW - marginR, pageH - 8, { align: 'right' });
        }

        // Guardar
        const fechaArchivo = fecha.replace(/-/g, '');
        pdf.save(`Reporte_Diario_${fechaArchivo}.pdf`);

        const pdfOutput = pdf.output('arraybuffer');
        const sizeKB = (pdfOutput.byteLength / 1024).toFixed(0);

        Swal.fire({
            icon: 'success',
            title: 'PDF Descargado',
            text: `${totalPages} pagina(s) - ${sizeKB} KB`,
            timer: 2500,
            showConfirmButton: false
        });

    } catch (e) {
        console.error('Error generando PDF:', e);
        Swal.fire('Error', 'No se pudo generar el PDF: ' + e.message, 'error');
    }
},

// ============================================
// GENERAR REPORTE COMO HTML (CORREGIDO)
// ============================================
generarReporteHTML: function() {
    try {
        const contenido = window.reporteDiarioHTML;
        const fecha = window.reporteDiarioFecha;
        
        if (!contenido) {
            Swal.fire('Atención', 'Primero genere el reporte', 'warning');
            return;
        }

        const htmlContent = '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Reporte Diario - ' + fecha + '</title>\n<style>\n* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #F3F4F6; padding: 15px; }\n.container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }\n.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 20px; }\n.header h1 { font-size: 22px; margin-bottom: 5px; }\n.header p { font-size: 14px; opacity: 0.9; }\n.footer { text-align: center; padding: 15px; color: #6B7280; font-size: 11px; margin-top: 20px; }\nul { padding-left: 18px; }\nli { margin: 3px 0; }\n</style>\n</head>\n<body>\n<div class="container">\n<div class="header">\n<h1>REPORTE DIARIO</h1>\n<p>' + fecha + '</p>\n</div>\n' + contenido + '\n<div class="footer">\n<p>Generado el ' + new Date().toLocaleString('es-VE') + '</p>\n<p>Sistema de Asistencia PNF - UNES</p>\n</div>\n</div>\n</body>\n</html>';

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Reporte_Diario_' + new Date().toISOString().split('T')[0].replace(/-/g, '') + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Swal.fire({
            icon: 'success',
            title: 'HTML Descargado',
            text: 'Abrir en cualquier navegador del movil',
            timer: 2500,
            showConfirmButton: false
        });

    } catch (e) {
        console.error('Error:', e);
        Swal.fire('Error', e.message, 'error');
    }
},

    
// ============================================
// REPORTE DE INASISTENCIAS (CORREGIDO)
// ============================================
generarReporteInasistencias: async function() {
    try {
        const fechaHoy = this.getFechaCaracas();
        const { value: fechas } = await Swal.fire({
            title: 'Período del Reporte',
            html: `
                <div class="text-left space-y-3">
                    <label class="font-bold">Fecha inicio:</label>
                    <input type="date" id="swal-fecha-inicio" class="swal2-input" value="2026-01-01">
                    <label class="font-bold">Fecha fin:</label>
                    <input type="date" id="swal-fecha-fin" class="swal2-input" value="${fechaHoy}">
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

        // Consulta CORREGIDA - Incluir tipo_asistencia
        const { data, error } = await window.supabaseClient
            .from('registro_asistencia')
            .select(`
                personal_id,
                fecha,
                tipo_asistencia_id,
                tipo_asistencia (
                    codigo,
                    nombre
                )
            `)
            .gte('fecha', fechas.inicio)
            .lte('fecha', fechas.fin)
            .in('tipo_asistencia.codigo', ['AUS_INJUSTIFICADA', 'REPOSO', 'VACACIONES']);

        if (error) {
            console.error('Error en consulta:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            Swal.fire({
                title: 'Sin Datos',
                text: 'No hay inasistencias en este período',
                icon: 'info',
                confirmButtonText: 'Cerrar'
            });
            return;
        }

        const agrupado = {};
        data.forEach(r => {
            // Validar que tipo_asistencia exista
            if (!r.tipo_asistencia) {
                console.warn('Registro sin tipo_asistencia:', r);
                return;
            }
            
            const id = r.personal_id;
            if (!agrupado[id]) {
                agrupado[id] = {
                    total: 0
                };
            }
            agrupado[id].total++;
        });

        // Obtener información del personal
        const personalIds = Object.keys(agrupado);
        const { data: personalData } = await window.supabaseClient
            .from('personal')
            .select('id, nombre_completo, cedula')
            .in('id', personalIds);

        if (personalData) {
            personalData.forEach(p => {
                if (agrupado[p.id]) {
                    agrupado[p.id].nombre = p.nombre_completo;
                    agrupado[p.id].cedula = p.cedula;
                }
            });
        }

        const top10 = Object.entries(agrupado)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        let contenido = `TOP 10 - PERSONAL CON MÁS INASISTENCIAS\n`;
        contenido += `Período: ${this.formatearFechaLarga(fechas.inicio)} al ${this.formatearFechaLarga(fechas.fin)}\n\n`;
        
        if (top10.length === 0) {
            contenido += 'No hay inasistencias en este período\n';
        } else {
            top10.forEach((p, idx) => {
                if (p.nombre && p.cedula) {
                    contenido += `${idx + 1}. ${p.nombre} - C.I: ${p.cedula}\n`;
                    contenido += `   Total inasistencias: ${p.total}\n\n`;
                }
            });
        }

        Swal.fire({
            title: 'Reporte de Inasistencias',
            html: `<pre class="text-left text-sm max-h-96 overflow-y-auto">${contenido}</pre>`,
            width: '800px',
            confirmButtonText: 'Cerrar'
        });

    } catch (e) {
        console.error('❌ Error en reporte de inasistencias:', e);
        Swal.fire('Error', 'No se pudo generar el reporte: ' + e.message, 'error');
    }
},

// ============================================
// REPORTE DE PERMISOS (CORREGIDO)
// ============================================
generarReportePermisos: async function() {
    try {
        const fechaHoy = this.getFechaCaracas();
        const { value: fechas } = await Swal.fire({
            title: 'Período del Reporte',
            html: `
                <div class="text-left space-y-3">
                    <label class="font-bold">Fecha inicio:</label>
                    <input type="date" id="swal-fecha-inicio" class="swal2-input" value="2026-01-01">
                    <label class="font-bold">Fecha fin:</label>
                    <input type="date" id="swal-fecha-fin" class="swal2-input" value="${fechaHoy}">
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

        // Consulta CORREGIDA
        const { data, error } = await window.supabaseClient
            .from('registro_asistencia')
            .select(`
                personal_id,
                fecha,
                tipo_asistencia_id,
                tipo_asistencia (
                    codigo,
                    nombre
                )
            `)
            .gte('fecha', fechas.inicio)
            .lte('fecha', fechas.fin)
            .in('tipo_asistencia.codigo', ['PERMISO_OBLIGATORIO', 'PERMISO_POTESTATIVO']);

        if (error) {
            console.error('Error en consulta:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            Swal.fire({
                title: 'Sin Datos',
                text: 'No hay permisos en este período',
                icon: 'info',
                confirmButtonText: 'Cerrar'
            });
            return;
        }

        const agrupado = {};
        data.forEach(r => {
            if (!r.tipo_asistencia) {
                console.warn('Registro sin tipo_asistencia:', r);
                return;
            }
            
            const id = r.personal_id;
            if (!agrupado[id]) {
                agrupado[id] = {
                    obligatorios: 0,
                    potestativos: 0
                };
            }
            if (r.tipo_asistencia.codigo === 'PERMISO_OBLIGATORIO') {
                agrupado[id].obligatorios++;
            } else if (r.tipo_asistencia.codigo === 'PERMISO_POTESTATIVO') {
                agrupado[id].potestativos++;
            }
        });

        // Obtener información del personal
        const personalIds = Object.keys(agrupado);
        const { data: personalData } = await window.supabaseClient
            .from('personal')
            .select('id, nombre_completo, cedula')
            .in('id', personalIds);

        if (personalData) {
            personalData.forEach(p => {
                if (agrupado[p.id]) {
                    agrupado[p.id].nombre = p.nombre_completo;
                    agrupado[p.id].cedula = p.cedula;
                }
            });
        }

        const lista = Object.entries(agrupado)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => (b.obligatorios + b.potestativos) - (a.obligatorios + a.potestativos));

        let contenido = `PERSONAL CON MÁS PERMISOS\n`;
        contenido += `Período: ${this.formatearFechaLarga(fechas.inicio)} al ${this.formatearFechaLarga(fechas.fin)}\n\n`;
        
        if (lista.length === 0) {
            contenido += 'No hay permisos en este período\n';
        } else {
            lista.forEach((p, idx) => {
                if (p.nombre && p.cedula) {
                    contenido += `${idx + 1}. ${p.nombre} - C.I: ${p.cedula}\n`;
                    contenido += `   Obligatorios: ${p.obligatorios} | Potestativos: ${p.potestativos}\n\n`;
                }
            });
        }

        Swal.fire({
            title: 'Reporte de Permisos',
            html: `<pre class="text-left text-sm max-h-96 overflow-y-auto">${contenido}</pre>`,
            width: '800px',
            confirmButtonText: 'Cerrar'
        });

    } catch (e) {
        console.error('❌ Error en reporte de permisos:', e);
        Swal.fire('Error', 'No se pudo generar el reporte: ' + e.message, 'error');
    }
},

// ============================================
// REPORTE DE RETARDOS (CORREGIDO)
// ============================================
generarReporteRetardos: async function() {
    try {
        const fechaHoy = this.getFechaCaracas();
        const { value: fechas } = await Swal.fire({
            title: 'Período del Reporte',
            html: `
                <div class="text-left space-y-3">
                    <label class="font-bold">Fecha inicio:</label>
                    <input type="date" id="swal-fecha-inicio" class="swal2-input" value="2026-01-01">
                    <label class="font-bold">Fecha fin:</label>
                    <input type="date" id="swal-fecha-fin" class="swal2-input" value="${fechaHoy}">
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

        // Consulta CORREGIDA
        const { data, error } = await window.supabaseClient
            .from('registro_asistencia')
            .select(`
                personal_id,
                fecha,
                hora_registro,
                tipo_asistencia_id,
                tipo_asistencia (
                    codigo,
                    nombre
                )
            `)
            .gte('fecha', fechas.inicio)
            .lte('fecha', fechas.fin);

        if (error) {
            console.error('Error en consulta:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            Swal.fire({
                title: 'Sin Datos',
                text: 'No hay retardos en este período',
                icon: 'info',
                confirmButtonText: 'Cerrar'
            });
            return;
        }

        // Filtrar solo retardos
        const retardosData = data.filter(r => r.tipo_asistencia && r.tipo_asistencia.codigo === 'RETARDO');

        if (retardosData.length === 0) {
            Swal.fire({
                title: 'Sin Datos',
                text: 'No hay retardos en este período',
                icon: 'info',
                confirmButtonText: 'Cerrar'
            });
            return;
        }

        const agrupado = {};
        retardosData.forEach(r => {
            const id = r.personal_id;
            if (!agrupado[id]) {
                agrupado[id] = {
                    total: 0,
                    fechas: []
                };
            }
            agrupado[id].total++;
            agrupado[id].fechas.push(`${this.formatearFechaLarga(r.fecha)} (${r.hora_registro || 's/h'})`);
        });

        // Obtener información del personal
        const personalIds = Object.keys(agrupado);
        const { data: personalData } = await window.supabaseClient
            .from('personal')
            .select('id, nombre_completo, cedula')
            .in('id', personalIds);

        if (personalData) {
            personalData.forEach(p => {
                if (agrupado[p.id]) {
                    agrupado[p.id].nombre = p.nombre_completo;
                    agrupado[p.id].cedula = p.cedula;
                }
            });
        }

        const lista = Object.entries(agrupado)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.total - a.total);

        let contenido = `PERSONAL CON RETARDOS\n`;
        contenido += `Período: ${this.formatearFechaLarga(fechas.inicio)} al ${this.formatearFechaLarga(fechas.fin)}\n\n`;
        
        if (lista.length === 0) {
            contenido += 'No hay retardos en este período\n';
        } else {
            lista.forEach((p, idx) => {
                if (p.nombre && p.cedula) {
                    contenido += `${idx + 1}. ${p.nombre} - C.I: ${p.cedula}\n`;
                    contenido += `   Total retardos: ${p.total}\n`;
                    contenido += `   Fechas: ${p.fechas.join(', ')}\n\n`;
                }
            });
        }

        Swal.fire({
            title: 'Reporte de Retardos',
            html: `<pre class="text-left text-sm max-h-96 overflow-y-auto">${contenido}</pre>`,
            width: '800px',
            confirmButtonText: 'Cerrar'
        });

    } catch (e) {
        console.error('❌ Error en reporte de retardos:', e);
        Swal.fire('Error', 'No se pudo generar el reporte: ' + e.message, 'error');
    }
},
    
    
// ============================================
// REPORTE DE VACACIONES (CORREGIDO)
// ============================================
generarReporteVacaciones: async function() {
    try {
        const fechaHoy = this.getFechaCaracas();
        const { value: fechas } = await Swal.fire({
            title: 'Período del Reporte',
            html: `
                <div class="text-left space-y-3">
                    <label class="font-bold">Fecha inicio:</label>
                    <input type="date" id="swal-fecha-inicio" class="swal2-input" value="2026-01-01">
                    <label class="font-bold">Fecha fin:</label>
                    <input type="date" id="swal-fecha-fin" class="swal2-input" value="${fechaHoy}">
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

        // Consulta CORREGIDA
        const { data, error } = await window.supabaseClient
            .from('registro_asistencia')
            .select(`
                personal_id,
                fecha,
                fecha_inicio,
                fecha_fin,
                dias,
                observaciones,
                tipo_asistencia_id,
                tipo_asistencia (
                    codigo,
                    nombre
                ),
                personal (
                    nombre_completo,
                    cedula,
                    tipo_personal (
                        nombre
                    )
                )
            `)
            .gte('fecha', fechas.inicio)
            .lte('fecha', fechas.fin);

        if (error) {
            console.error('Error en consulta:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            Swal.fire({
                title: 'Sin Datos',
                text: 'No hay personal de vacaciones en este período',
                icon: 'info',
                confirmButtonText: 'Cerrar'
            });
            return;
        }

        // Filtrar solo vacaciones
        const vacacionesData = data.filter(r => r.tipo_asistencia && r.tipo_asistencia.codigo === 'VACACIONES');

        if (vacacionesData.length === 0) {
            Swal.fire({
                title: 'Sin Datos',
                text: 'No hay personal de vacaciones en este período',
                icon: 'info',
                confirmButtonText: 'Cerrar'
            });
            return;
        }

        let contenido = `PERSONAL DE VACACIONES\n`;
        contenido += `Período: ${this.formatearFechaLarga(fechas.inicio)} al ${this.formatearFechaLarga(fechas.fin)}\n\n`;
        
        if (vacacionesData.length === 0) {
            contenido += 'No hay personal de vacaciones en este período\n';
        } else {
            vacacionesData.forEach((r, idx) => {
                if (r.personal) {
                    contenido += `${idx + 1}. ${r.personal.nombre_completo}\n`;
                    contenido += `   C.I: ${r.personal.cedula}\n`;
                    if (r.personal.tipo_personal) {
                        contenido += `   Tipo: ${r.personal.tipo_personal.nombre}\n`;
                    }
                    if (r.fecha_inicio && r.fecha_fin) {
                        contenido += `   Período: ${this.formatearFechaLarga(r.fecha_inicio)} al ${this.formatearFechaLarga(r.fecha_fin)}`;
                        if (r.dias) contenido += ` (${r.dias} días)`;
                        contenido += '\n';
                    } else {
                        contenido += `   Fecha: ${this.formatearFechaLarga(r.fecha)}\n`;
                    }
                    if (r.observaciones) contenido += `   Observaciones: ${r.observaciones}\n`;
                    contenido += '\n';
                }
            });
        }

        Swal.fire({
            title: 'Reporte de Vacaciones',
            html: `<pre class="text-left text-sm max-h-96 overflow-y-auto">${contenido}</pre>`,
            width: '800px',
            confirmButtonText: 'Cerrar'
        });

    } catch (e) {
        console.error('❌ Error en reporte de vacaciones:', e);
        Swal.fire('Error', 'No se pudo generar el reporte: ' + e.message, 'error');
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
    },

    // ============================================
    // EXPORTAR A EXCEL
    // ============================================
    exportarExcel: async function() {
        try {
            const fecha = this.datosCache.fechaActual;
            if (!fecha) {
                Swal.fire('Atención', 'Seleccione una fecha primero', 'warning');
                return;
            }

            const personal = await this.cargarPersonal();
            const registros = await this.cargarRegistrosAsistencia(fecha);

            const registrosMap = {};
            registros.forEach(r => {
                registrosMap[r.personal_id] = r;
            });

            const datosExcel = personal.map(p => {
                const registro = registrosMap[p.id];
                const estado = registro?.tipo_asistencia;
                
                return {
                    'Cédula': p.cedula,
                    'Nombre Completo': p.nombre_completo,
                    'Tipo Personal': p.tipo_personal?.nombre || '',
                    'Fecha de Reporte': this.formatearFechaLarga(fecha),
                    'Estado': estado?.nombre || 'Sin registro',
                    'Hora Registro': registro?.hora_registro || '',
                    'Fecha Inicio': registro?.fecha_inicio ? this.formatearFechaLarga(registro.fecha_inicio) : '',
                    'Fecha Fin': registro?.fecha_fin ? this.formatearFechaLarga(registro.fecha_fin) : '',
                    'Días': registro?.dias || '',
                    'Observaciones': registro?.observaciones || ''
                };
            });

            const workbook = new ExcelJS.Workbook();
            workbook.creator = window.appState?.nombreProfesorGlobal || 'Sistema UNES';
            workbook.created = new Date();

            const ws = workbook.addWorksheet('Asistencia');

            ws.columns = [
                { header: 'Cédula', key: 'Cédula', width: 15 },
                { header: 'Nombre Completo', key: 'Nombre Completo', width: 40 },
                { header: 'Tipo Personal', key: 'Tipo Personal', width: 30 },
                { header: 'Fecha de Reporte', key: 'Fecha de Reporte', width: 15 },
                { header: 'Estado', key: 'Estado', width: 25 },
                { header: 'Hora Registro', key: 'Hora Registro', width: 15 },
                { header: 'Fecha Inicio', key: 'Fecha Inicio', width: 15 },
                { header: 'Fecha Fin', key: 'Fecha Fin', width: 15 },
                { header: 'Días', key: 'Días', width: 10 },
                { header: 'Observaciones', key: 'Observaciones', width: 40 }
            ];

            const headerRow = ws.getRow(1);
            headerRow.height = 25;
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFB4D4F4' }
                };
                cell.font = {
                    name: 'Calibri',
                    size: 11,
                    bold: true,
                    color: { argb: 'FF1E3A5F' }
                };
                cell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle',
                    wrapText: true
                };
                cell.border = {
                    top: { style: 'medium', color: { argb: 'FF1E3A5F' } },
                    bottom: { style: 'medium', color: { argb: 'FF1E3A5F' } }
                };
            });

            datosExcel.forEach((item, index) => {
                const row = ws.addRow(item);
                row.height = 18;
                
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.font = { name: 'Calibri', size: 10 };
                    cell.alignment = { vertical: 'middle', wrapText: true };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                    };

                    if (index % 2 === 1) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF5F9FF' }
                        };
                    }

                    if (colNumber === 5) {
                        const estado = item['Estado'];
                        if (estado === 'Asistencia') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
                            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF155724' } };
                        } else if (estado === 'Ausencia Injustificada') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7DA' } };
                            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF721C24' } };
                        } else if (estado === 'Retardo') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4CC' } };
                            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF856404' } };
                        } else if (estado === 'Permiso Obligatorio' || estado === 'Permiso Potestativo') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4B5' } };
                            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF8B4513' } };
                        } else if (estado === 'Vacaciones') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB6D4FE' } };
                            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
                        } else if (estado === 'Reposo') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD8B4FE' } };
                            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF6B21A8' } };
                        } else if (estado === 'Día Libre') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
                            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF374151' } };
                        }
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    }
                });
            });

            ws.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: datosExcel.length + 1, column: 10 }
            };

            ws.views = [{ state: 'frozen', ySplit: 1 }];

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });

            const fechaFormateada = fecha.replace(/-/g, '');
            const nombreArchivo = `Asistencia_Personal_${fechaFormateada}.xlsx`;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            Swal.fire({
                icon: 'success',
                title: '✅ Excel Exportado',
                text: `Se exportaron ${datosExcel.length} registros`,
                timer: 2000,
                showConfirmButton: false
            });

        } catch (e) {
            console.error('❌ Error exportando Excel:', e);
            Swal.fire('Error', 'No se pudo exportar: ' + e.message, 'error');
        }
    },

// ============================================
// 📊 GENERAR TABLA RESUMEN (PIVOT TABLE)
// ============================================
generarTablaResumen: async function() {
    try {
        const fecha = this.datosCache.fechaActual;
        if (!fecha) {
            Swal.fire('Atención', 'Seleccione una fecha primero', 'warning');
            return;
        }

        const personal = await this.cargarPersonal();
        const registros = await this.cargarRegistrosAsistencia(fecha);

        // Crear mapa de registros
        const registrosMap = {};
        registros.forEach(r => {
            registrosMap[r.personal_id] = r;
        });

        // Agrupar por tipo de personal
        const resumen = {};
        
        personal.forEach(p => {
            const tipoPersonal = p.tipo_personal?.nombre || 'Sin tipo';
            const registro = registrosMap[p.id];
            const tipoAsistencia = registro?.tipo_asistencia?.nombre || 'Sin registro';
            
            if (!resumen[tipoPersonal]) {
                resumen[tipoPersonal] = {
                    total: 0,
                    porTipo: {}
                };
            }
            
            resumen[tipoPersonal].total++;
            
            if (!resumen[tipoPersonal].porTipo[tipoAsistencia]) {
                resumen[tipoPersonal].porTipo[tipoAsistencia] = 0;
            }
            resumen[tipoPersonal].porTipo[tipoAsistencia]++;
        });

        // Obtener todos los tipos de asistencia únicos
        const todosLosTipos = new Set();
        Object.values(resumen).forEach(data => {
            Object.keys(data.porTipo).forEach(tipo => todosLosTipos.add(tipo));
        });

        // Construir tabla HTML
        let html = `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-300">
                    <thead class="bg-indigo-100">
                        <tr>
                            <th class="px-4 py-3 border text-left font-bold text-gray-700">Tipo de Personal</th>
                            ${Array.from(todosLosTipos).map(tipo => `
                                <th class="px-4 py-3 border text-center font-bold text-gray-700">${tipo}</th>
                            `).join('')}
                            <th class="px-4 py-3 border text-center font-bold text-gray-700 bg-indigo-200">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(resumen).map(([tipoPersonal, data], index) => `
                            <tr class="${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}">
                                <td class="px-4 py-3 border font-semibold text-gray-800">${tipoPersonal}</td>
                                ${Array.from(todosLosTipos).map(tipo => `
                                    <td class="px-4 py-3 border text-center">${data.porTipo[tipo] || 0}</td>
                                `).join('')}
                                <td class="px-4 py-3 border text-center font-bold bg-indigo-50">${data.total}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot class="bg-indigo-100 font-bold">
                        <tr>
                            <td class="px-4 py-3 border">TOTAL GENERAL</td>
                            ${Array.from(todosLosTipos).map(tipo => {
                                const total = Object.values(resumen).reduce((sum, data) => 
                                    sum + (data.porTipo[tipo] || 0), 0
                                );
                                return `<td class="px-4 py-3 border text-center">${total}</td>`;
                            }).join('')}
                            <td class="px-4 py-3 border text-center bg-indigo-200">${personal.length}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        Swal.fire({
            title: `📊 Tabla Resumen - ${this.formatearFechaLarga(fecha)}`,
            html: html,
            width: '95%',
            confirmButtonText: 'Cerrar',
            showConfirmButton: true
        });

    } catch (e) {
        console.error('❌ Error generando tabla resumen:', e);
        Swal.fire('Error', 'No se pudo generar la tabla: ' + e.message, 'error');
    }
},

// ============================================
// 📥 EXPORTAR TABLA RESUMEN A EXCEL
// ============================================
exportarTablaResumenExcel: async function() {
    try {
        const fecha = this.datosCache.fechaActual;
        if (!fecha) {
            Swal.fire('Atención', 'Seleccione una fecha primero', 'warning');
            return;
        }

        const personal = await this.cargarPersonal();
        const registros = await this.cargarRegistrosAsistencia(fecha);

        const registrosMap = {};
        registros.forEach(r => {
            registrosMap[r.personal_id] = r;
        });

        const resumen = {};
        
        personal.forEach(p => {
            const tipoPersonal = p.tipo_personal?.nombre || 'Sin tipo';
            const registro = registrosMap[p.id];
            const tipoAsistencia = registro?.tipo_asistencia?.nombre || 'Sin registro';
            
            if (!resumen[tipoPersonal]) {
                resumen[tipoPersonal] = {
                    total: 0,
                    porTipo: {}
                };
            }
            
            resumen[tipoPersonal].total++;
            
            if (!resumen[tipoPersonal].porTipo[tipoAsistencia]) {
                resumen[tipoPersonal].porTipo[tipoAsistencia] = 0;
            }
            resumen[tipoPersonal].porTipo[tipoAsistencia]++;
        });

        const todosLosTipos = Array.from(new Set(
            Object.values(resumen).flatMap(data => Object.keys(data.porTipo))
        ));

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Resumen');

        // Encabezados
        const headers = ['Tipo de Personal', ...todosLosTipos, 'TOTAL'];
        const headerRow = ws.addRow(headers);
        headerRow.eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFB4D4F4' }
            };
            cell.font = { bold: true, color: { argb: 'FF1E3A5F' } };
            cell.alignment = { horizontal: 'center' };
            cell.border = {
                top: { style: 'medium' },
                bottom: { style: 'medium' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Datos
        Object.entries(resumen).forEach(([tipoPersonal, data], index) => {
            const row = [
                tipoPersonal,
                ...todosLosTipos.map(tipo => data.porTipo[tipo] || 0),
                data.total
            ];
            const rowObj = ws.addRow(row);
            
            rowObj.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    bottom: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                if (colNumber === 1 || colNumber === headers.length) {
                    cell.font = { bold: true };
                }
                
                if (index % 2 === 0 && colNumber > 1 && colNumber < headers.length) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF5F9FF' }
                    };
                }
            });
        });

        // Totales
        const totalRow = [
            'TOTAL GENERAL',
            ...todosLosTipos.map(tipo => 
                Object.values(resumen).reduce((sum, data) => sum + (data.porTipo[tipo] || 0), 0)
            ),
            personal.length
        ];
        const totalRowObj = ws.addRow(totalRow);
        totalRowObj.eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFB4D4F4' }
            };
            cell.font = { bold: true };
            cell.border = {
                top: { style: 'medium' },
                bottom: { style: 'medium' },
                left: { style: 'medium' },
                right: { style: 'medium' }
            };
        });

        // Auto-width columns
        ws.columns.forEach(column => {
            column.width = 20;
        });

        // Descargar
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Resumen_Asistencia_${fecha.replace(/-/g, '')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        Swal.fire({
            icon: 'success',
            title: '✅ Excel Exportado',
            text: 'Tabla resumen exportada correctamente',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (e) {
        console.error('❌ Error exportando tabla resumen:', e);
        Swal.fire('Error', 'No se pudo exportar: ' + e.message, 'error');
    }
}    

   
}; // ⭐ AQUÍ ESTABA EL ERROR - Faltaba este cierre del objeto

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================
window.cargarTiposPersonal = () => window.modules.asistenciaPersonal.cargarTiposPersonal();
window.cargarTiposAsistencia = () => window.modules.asistenciaPersonal.cargarTiposAsistencia();
window.cargarRegistroAsistencia = () => window.modules.asistenciaPersonal.cargarRegistroAsistencia();
window.buscarEnTiempoReal = () => window.modules.asistenciaPersonal.buscarEnTiempoReal();
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
window.exportarExcel = () => window.modules.asistenciaPersonal.exportarExcel();
window.getFechaCaracas = () => window.modules.asistenciaPersonal.getFechaCaracas();
window.getHoraCaracas = () => window.modules.asistenciaPersonal.getHoraCaracas();
window.getFechaFormateadaCaracas = () => window.modules.asistenciaPersonal.getFechaFormateadaCaracas();
window.generarTablaResumen = () => window.modules.asistenciaPersonal.generarTablaResumen();
window.exportarTablaResumenExcel = () => window.modules.asistenciaPersonal.exportarTablaResumenExcel();

console.log('✅ Módulo de Asistencia de Personal v2.1 cargado (Zona Horaria Caracas)');
