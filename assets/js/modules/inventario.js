/**
 * MÓDULO DE INVENTARIO UNES
 * Versión: 4.0 - PDF ordenado + Excel profesional moderno
 * Solo accesible para roles: inventario_admin y super_usuario
 */

window.modules = window.modules || {};
window.modules.inventario = {
    datosCache: [],
    datosFiltradosActuales: [],
    filtroActual: { texto: '', estado: '', ubicacion: '' },

    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================
    esOperativo: function(status) {
        return status && status.toUpperCase() === 'OPERATIVO';
    },

    esDanado: function(status) {
        return status && status.toUpperCase() === 'DAÑADO';
    },

    // ============================================
    // CARGAR INVENTARIO (SIN LÍMITE DE 1000)
    // ============================================
    cargarInventario: async function() {
        try {
            let todosLosDatos = [];
            let desde = 0;
            const limite = 1000;
            let tieneMas = true;

            while (tieneMas) {
                const { data, error } = await window.supabaseClient
                    .from('inventario_unes')
                    .select('*')
                    .eq('activo', true)
                    .order('tipo')
                    .range(desde, desde + limite - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                    todosLosDatos = todosLosDatos.concat(data);
                    desde += limite;
                    if (data.length < limite) tieneMas = false;
                } else {
                    tieneMas = false;
                }
            }

            this.datosCache = todosLosDatos;
            this.datosFiltradosActuales = this.datosCache;
            this.actualizarEstadisticas();
            this.renderizarTabla(this.datosCache);
            this.actualizarContadorResultados(this.datosCache, this.datosCache.length);
            this.cargarFiltroUbicaciones();

            console.log('✅ Inventario cargado:', this.datosCache.length, 'artículos');

            if (this.datosCache.length > 1000) {
                Swal.fire({
                    icon: 'success',
                    title: '✅ Inventario Completo',
                    text: `Se cargaron ${this.datosCache.length} artículos correctamente`,
                    timer: 2500,
                    showConfirmButton: false
                });
            }

        } catch (e) {
            console.error('❌ Error cargando inventario:', e);
            Swal.fire('Error', 'No se pudo cargar el inventario: ' + e.message, 'error');
        }
    },

    // ============================================
    // ACTUALIZAR ESTADÍSTICAS
    // ============================================
    actualizarEstadisticas: function() {
        const total = this.datosCache.length;
        const operativos = this.datosCache.filter(i => this.esOperativo(i.status)).length;
        const danados = this.datosCache.filter(i => this.esDanado(i.status)).length;
        const ubicaciones = [...new Set(this.datosCache.map(i => i.ubicacion).filter(Boolean))].length;

        document.getElementById('total-articulos').textContent = total;
        document.getElementById('total-operativos').textContent = operativos;
        document.getElementById('total-danados').textContent = danados;
        document.getElementById('total-ubicaciones').textContent = ubicaciones;

        console.log('📊 Estadísticas:', { total, operativos, danados, ubicaciones });
    },

    // ============================================
    // ACTUALIZAR CONTADOR DE RESULTADOS
    // ============================================
    actualizarContadorResultados: function(datosMostrados, totalGeneral) {
        let contador = document.getElementById('contador-resultados');
        
        if (!contador) {
            const tabla = document.querySelector('.bg-white.rounded-lg.shadow.overflow-hidden');
            if (tabla) {
                contador = document.createElement('div');
                contador.id = 'contador-resultados';
                contador.className = 'bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 rounded-t-lg flex justify-between items-center shadow-md';
                tabla.parentNode.insertBefore(contador, tabla);
            } else {
                return;
            }
        }

        const operativosMostrados = datosMostrados.filter(i => this.esOperativo(i.status)).length;
        const danadosMostrados = datosMostrados.filter(i => this.esDanado(i.status)).length;
        
        const porcentaje = totalGeneral > 0 ? ((datosMostrados.length / totalGeneral) * 100).toFixed(1) : 0;
        const filtroActivo = datosMostrados.length < totalGeneral;

        contador.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fas fa-list-ol text-xl"></i>
                <div>
                    <span class="text-2xl font-bold">${datosMostrados.length}</span>
                    <span class="text-sm ml-1">de ${totalGeneral} registros</span>
                    ${filtroActivo ? `<span class="ml-2 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">⚡ FILTRADO (${porcentaje}%)</span>` : ''}
                </div>
            </div>
            <div class="text-right text-xs">
                <div>✅ Operativos: <strong class="text-green-300">${operativosMostrados}</strong></div>
                <div>❌ Dañados: <strong class="text-red-300">${danadosMostrados}</strong></div>
            </div>
        `;
    },

    // ============================================
    // RENDERIZAR TABLA
    // ============================================
    renderizarTabla: function(datos) {
        const tbody = document.getElementById('tabla-inventario');
        
        if (datos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center p-8 text-gray-500"><i class="fas fa-inbox text-4xl mb-2"></i><br>No hay artículos que mostrar</td></tr>';
            return;
        }

        tbody.innerHTML = datos.map(item => {
            const esOperativo = this.esOperativo(item.status);
            const statusClass = esOperativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            const statusIcon = esOperativo ? '✅' : '❌';

            return `
                <tr class="hover:bg-blue-50 transition">
                    <td class="p-3 font-mono text-xs font-bold text-blue-700">${item.inventario_id || '-'}</td>
                    <td class="p-3 text-sm font-semibold text-gray-800">${item.tipo || '-'}</td>
                    <td class="p-3 text-xs text-gray-600">${item.serial !== '-----------' && item.serial ? item.serial : '-'}</td>
                    <td class="p-3 text-xs text-gray-600">
                        ${item.marca ? `<div class="font-semibold">${item.marca}</div>` : ''}
                        ${item.modelo && item.modelo !== '-----------' ? `<div class="text-gray-500">${item.modelo}</div>` : ''}
                    </td>
                    <td class="p-3 text-xs text-gray-700">
                        <i class="fas fa-map-marker-alt text-blue-500 mr-1"></i>${item.ubicacion || '-'}
                    </td>
                    <td class="p-3 text-xs text-gray-700">
                        <i class="fas fa-user text-gray-400 mr-1"></i>${item.responsable || '-'}
                    </td>
                    <td class="p-3 text-center">
                        <span class="px-2 py-1 rounded-full text-xs font-bold ${statusClass}">
                            ${statusIcon} ${item.status}
                        </span>
                    </td>
                    <td class="p-3 text-center">
                        <div class="flex justify-center gap-1">
                            <button onclick="window.modules.inventario.editarArticulo('${item.id}')" 
                                    class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="window.modules.inventario.eliminarArticulo('${item.id}')" 
                                    class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // ============================================
    // CARGAR FILTRO DE UBICACIONES
    // ============================================
    cargarFiltroUbicaciones: function() {
        const select = document.getElementById('filtro-ubicacion');
        const ubicaciones = [...new Set(this.datosCache.map(i => i.ubicacion).filter(Boolean))].sort();
        
        select.innerHTML = '<option value="">Todas las ubicaciones</option>' +
            ubicaciones.map(u => `<option value="${u}">${u}</option>`).join('');
    },

    // ============================================
    // FILTRAR TABLA
    // ============================================
    filtrarTabla: function() {
        const texto = document.getElementById('buscar-inventario').value.toLowerCase();
        const estado = document.getElementById('filtro-estado').value;
        const ubicacion = document.getElementById('filtro-ubicacion').value;

        const filtrados = this.datosCache.filter(item => {
            const matchTexto = !texto || 
                (item.tipo && item.tipo.toLowerCase().includes(texto)) ||
                (item.serial && item.serial.toLowerCase().includes(texto)) ||
                (item.inventario_id && item.inventario_id.toLowerCase().includes(texto)) ||
                (item.responsable && item.responsable.toLowerCase().includes(texto)) ||
                (item.marca && item.marca.toLowerCase().includes(texto)) ||
                (item.modelo && item.modelo.toLowerCase().includes(texto));
            
            const matchEstado = !estado || (item.status && item.status.toUpperCase() === estado.toUpperCase());
            const matchUbicacion = !ubicacion || item.ubicacion === ubicacion;

            return matchTexto && matchEstado && matchUbicacion;
        });

        this.datosFiltradosActuales = filtrados;
        this.filtroActual = { texto, estado, ubicacion };

        this.renderizarTabla(filtrados);
        this.actualizarContadorResultados(filtrados, this.datosCache.length);

        console.log(`📊 ${filtrados.length} de ${this.datosCache.length} artículos mostrados`);
    },

    // ============================================
    // MODALES
    // ============================================
    abrirModalNuevo: function() {
        document.getElementById('modal-titulo').textContent = 'Nuevo Artículo';
        document.getElementById('modal-icono').className = 'fas fa-plus-circle';
        document.getElementById('form-articulo').reset();
        document.getElementById('inv-id').value = '';
        document.getElementById('modal-articulo').classList.remove('hidden');
        document.getElementById('modal-articulo').classList.add('flex');
    },

    editarArticulo: function(id) {
        const item = this.datosCache.find(i => i.id === id);
        if (!item) return;

        document.getElementById('modal-titulo').textContent = 'Editar Artículo';
        document.getElementById('modal-icono').className = 'fas fa-edit';
        
        document.getElementById('inv-id').value = item.id;
        document.getElementById('inv-nro-deposito').value = item.nro_deposito || '';
        document.getElementById('inv-inventario-id').value = item.inventario_id || '';
        document.getElementById('inv-tipo').value = item.tipo || '';
        document.getElementById('inv-serial').value = item.serial !== '-----------' ? item.serial : '';
        document.getElementById('inv-modelo').value = item.modelo !== '-----------' ? item.modelo : '';
        document.getElementById('inv-marca').value = item.marca || '';
        document.getElementById('inv-ubicacion').value = item.ubicacion || '';
        document.getElementById('inv-responsable').value = item.responsable || '';
        document.getElementById('inv-status').value = item.status || 'OPERATIVO';
        document.getElementById('inv-observaciones').value = item.observaciones || '';
        document.getElementById('inv-evaluador').value = item.evaluador || '';

        document.getElementById('modal-articulo').classList.remove('hidden');
        document.getElementById('modal-articulo').classList.add('flex');
    },

    cerrarModal: function() {
        document.getElementById('modal-articulo').classList.add('hidden');
        document.getElementById('modal-articulo').classList.remove('flex');
    },

    // ============================================
    // GUARDAR ARTÍCULO
    // ============================================
    guardarArticulo: async function(event) {
        event.preventDefault();

        const id = document.getElementById('inv-id').value;
        const datos = {
            nro_deposito: document.getElementById('inv-nro-deposito').value.trim() || null,
            inventario_id: document.getElementById('inv-inventario-id').value.trim().toUpperCase(),
            tipo: document.getElementById('inv-tipo').value.trim().toUpperCase(),
            serial: document.getElementById('inv-serial').value.trim() || '-----------',
            modelo: document.getElementById('inv-modelo').value.trim() || '-----------',
            marca: document.getElementById('inv-marca').value.trim() || null,
            ubicacion: document.getElementById('inv-ubicacion').value.trim().toUpperCase(),
            responsable: document.getElementById('inv-responsable').value.trim().toUpperCase() || null,
            status: document.getElementById('inv-status').value,
            observaciones: document.getElementById('inv-observaciones').value.trim() || null,
            evaluador: document.getElementById('inv-evaluador').value.trim().toUpperCase() || null,
            ultima_actualizacion: new Date().toISOString(),
            actualizado_por: window.appState.usuarioActualId
        };

        try {
            let result;
            if (id) {
                result = await window.supabaseClient
                    .from('inventario_unes')
                    .update(datos)
                    .eq('id', id);
            } else {
                datos.creado_por = window.appState.usuarioActualId;
                result = await window.supabaseClient
                    .from('inventario_unes')
                    .insert([datos]);
            }

            if (result.error) throw result.error;

            this.cerrarModal();
            await this.cargarInventario();

            Swal.fire({
                icon: 'success',
                title: id ? '✅ Artículo Actualizado' : '✅ Artículo Guardado',
                text: 'La información se guardó correctamente',
                timer: 2500,
                showConfirmButton: false
            });

        } catch (e) {
            console.error('❌ Error guardando:', e);
            Swal.fire('Error', 'No se pudo guardar: ' + e.message, 'error');
        }
    },

    // ============================================
    // ELIMINAR ARTÍCULO
    // ============================================
    eliminarArticulo: async function(id) {
        const item = this.datosCache.find(i => i.id === id);
        if (!item) return;

        const confirm = await Swal.fire({
            icon: 'warning',
            title: '¿Eliminar Artículo?',
            html: `
                <div class="text-left">
                    <p class="mb-2">Se eliminará el artículo:</p>
                    <p class="font-bold">${item.tipo}</p>
                    <p class="text-sm text-gray-600">Código: ${item.inventario_id}</p>
                    <p class="text-sm text-red-600 mt-2">⚠️ Esta acción no se puede deshacer</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirm.isConfirmed) return;

        try {
            const { error } = await window.supabaseClient
                .from('inventario_unes')
                .update({ activo: false, actualizado_por: window.appState.usuarioActualId })
                .eq('id', id);

            if (error) throw error;

            await this.cargarInventario();

            Swal.fire({
                icon: 'success',
                title: '✅ Eliminado',
                text: 'El artículo se eliminó correctamente',
                timer: 2000,
                showConfirmButton: false
            });

        } catch (e) {
            console.error('❌ Error eliminando:', e);
            Swal.fire('Error', 'No se pudo eliminar: ' + e.message, 'error');
        }
    },

    // ============================================
    // 🆕 FUNCIÓN AUXILIAR: ORDENAR DATOS POR UBICACIÓN Y TIPO
    // ============================================
    ordenarDatos: function(datos) {
        return [...datos].sort((a, b) => {
            // 1. Primero por ubicación (alfabético)
            const ubA = (a.ubicacion || '').toUpperCase();
            const ubB = (b.ubicacion || '').toUpperCase();
            if (ubA < ubB) return -1;
            if (ubA > ubB) return 1;
            
            // 2. Luego por tipo (alfabético)
            const tipoA = (a.tipo || '').toUpperCase();
            const tipoB = (b.tipo || '').toUpperCase();
            if (tipoA < tipoB) return -1;
            if (tipoA > tipoB) return 1;
            
            // 3. Finalmente por código
            const codA = (a.inventario_id || '').toUpperCase();
            const codB = (b.inventario_id || '').toUpperCase();
            if (codA < codB) return -1;
            if (codA > codB) return 1;
            
            return 0;
        });
    },

    // ============================================
    // 🆕 FUNCIÓN AUXILIAR: CALCULAR ANCHO ÓPTIMO DE COLUMNA EXCEL
    // ============================================
    calcularAnchoColumna: function(datos, campo, maxChars = 60, minChars = 8) {
        let maxLen = campo.length; // Considerar el encabezado
        
        datos.forEach(item => {
            const valor = item[campo] || '';
            const len = String(valor).length;
            if (len > maxLen) maxLen = len;
        });
        
        // Limitar entre min y max, y agregar padding
        const ancho = Math.min(Math.max(maxLen + 2, minChars), maxChars);
        return { wch: ancho };
    },

    // ============================================
    // 📄 GENERAR REPORTE PDF (ORDENADO POR UBICACIÓN Y TIPO)
    // ============================================
    generarReportePDF: function() {
        const datosSinOrdenar = this.datosFiltradosActuales && this.datosFiltradosActuales.length > 0 
            ? this.datosFiltradosActuales 
            : this.datosCache;

        if (datosSinOrdenar.length === 0) {
            Swal.fire('Atención', 'No hay datos para generar el reporte', 'warning');
            return;
        }

        // ⭐ ORDENAR datos por ubicación y tipo
        const datos = this.ordenarDatos(datosSinOrdenar);

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ 
                orientation: 'portrait', 
                unit: 'mm', 
                format: 'letter',
                margins: { top: 20, bottom: 20, left: 20, right: 20 }
            });

            const filtros = this.filtroActual || { texto: '', estado: '', ubicacion: '' };
            const filtrosTexto = [];
            if (filtros.texto) filtrosTexto.push(`Búsqueda: "${filtros.texto}"`);
            if (filtros.estado) filtrosTexto.push(`Estado: ${filtros.estado}`);
            if (filtros.ubicacion) filtrosTexto.push(`Ubicación: ${filtros.ubicacion}`);
            const filtrosAplicados = filtrosTexto.length > 0 
                ? filtrosTexto.join(' | ') 
                : 'Ninguno (todos los registros)';

            const fechaGeneracion = new Date().toLocaleDateString('es-VE', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });

            const totalArticulos = datos.length;
            const operativos = datos.filter(i => this.esOperativo(i.status)).length;
            const danados = datos.filter(i => this.esDanado(i.status)).length;

            // ============ ENCABEZADO ============
            doc.setFontSize(14); 
            doc.setFont('helvetica', 'bold'); 
            doc.text('UNIVERSIDAD NACIONAL EXPERIMENTAL DE LA SEGURIDAD', 105, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.text('REPORTE DE INVENTARIO', 105, 27, { align: 'center' });
            
            doc.setFontSize(9); 
            doc.setFont('helvetica', 'normal'); 
            doc.text(`Generado: ${fechaGeneracion}`, 105, 33, { align: 'center' });
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`Filtros: ${filtrosAplicados}`, 105, 38, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(`Total Bienes: ${totalArticulos} | Operativos: ${operativos} | Dañados: ${danados}`, 105, 44, { align: 'center' });

            // ============ CUADRO RESUMEN POR TIPO ============
            doc.setFontSize(10); 
            doc.setFont('helvetica', 'bold'); 
            doc.text('TABLA DINÁMICA: BIENES POR TIPO', 20, 52);

            const agrupadoPorTipo = {};
            datos.forEach(item => {
                const tipo = item.tipo || 'SIN TIPO';
                if (!agrupadoPorTipo[tipo]) {
                    agrupadoPorTipo[tipo] = { total: 0, operativos: 0, danados: 0 };
                }
                agrupadoPorTipo[tipo].total++;
                if (this.esOperativo(item.status)) agrupadoPorTipo[tipo].operativos++;
                else if (this.esDanado(item.status)) agrupadoPorTipo[tipo].danados++;
            });

            const tiposColumn = ['Tipo de Artículo', 'Total', 'Operativos', 'Dañados'];
            const tiposRows = Object.entries(agrupadoPorTipo)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([tipo, stats]) => [
                    tipo.length > 45 ? tipo.substring(0, 45) + '...' : tipo,
                    stats.total.toString(),
                    stats.operativos.toString(),
                    stats.danados.toString()
                ]);

            tiposRows.push(['TOTAL GENERAL', totalArticulos.toString(), operativos.toString(), danados.toString()]);

            doc.autoTable({ 
                head: [tiposColumn], body: tiposRows, startY: 55, theme: 'grid', fontSize: 7, 
                margin: { left: 20, right: 20 }, 
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center' }, 
                styles: { cellPadding: 1.5, halign: 'center', fontSize: 7 }, 
                columnStyles: { 
                    0: { cellWidth: 90, halign: 'left', fontStyle: 'bold', fillColor: [240, 240, 240] },
                    1: { cellWidth: 25, fontStyle: 'bold', fillColor: [220, 230, 250] },
                    2: { cellWidth: 25, fillColor: [210, 245, 210], textColor: [0, 100, 0] },
                    3: { cellWidth: 25, fillColor: [250, 230, 230], textColor: [150, 0, 0] }
                }
            });

            // ============ RESUMEN POR UBICACIÓN ============
            let startYUbicacion = doc.lastAutoTable.finalY + 5;
            if (startYUbicacion > 200) { doc.addPage(); startYUbicacion = 20; }

            doc.setFontSize(10); 
            doc.setFont('helvetica', 'bold'); 
            doc.text('TABLA DINÁMICA: BIENES POR UBICACIÓN', 20, startYUbicacion);

            const agrupadoPorUbicacion = {};
            datos.forEach(item => {
                const ubic = item.ubicacion || 'SIN UBICACIÓN';
                if (!agrupadoPorUbicacion[ubic]) {
                    agrupadoPorUbicacion[ubic] = { total: 0, operativos: 0, danados: 0 };
                }
                agrupadoPorUbicacion[ubic].total++;
                if (this.esOperativo(item.status)) agrupadoPorUbicacion[ubic].operativos++;
                else if (this.esDanado(item.status)) agrupadoPorUbicacion[ubic].danados++;
            });

            const ubicacionColumn = ['Ubicación', 'Total', 'Operativos', 'Dañados'];
            const ubicacionRows = Object.entries(agrupadoPorUbicacion)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([ubic, stats]) => [
                    ubic.length > 50 ? ubic.substring(0, 50) + '...' : ubic,
                    stats.total.toString(),
                    stats.operativos.toString(),
                    stats.danados.toString()
                ]);

            ubicacionRows.push(['TOTAL GENERAL', totalArticulos.toString(), operativos.toString(), danados.toString()]);

            doc.autoTable({ 
                head: [ubicacionColumn], body: ubicacionRows, startY: startYUbicacion + 3, theme: 'grid', fontSize: 7, 
                margin: { left: 20, right: 20 }, 
                headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', halign: 'center' }, 
                styles: { cellPadding: 1.5, halign: 'center', fontSize: 7 }, 
                columnStyles: { 
                    0: { cellWidth: 90, halign: 'left', fontStyle: 'bold', fillColor: [240, 240, 240] },
                    1: { cellWidth: 25, fontStyle: 'bold', fillColor: [220, 230, 250] },
                    2: { cellWidth: 25, fillColor: [210, 245, 210], textColor: [0, 100, 0] },
                    3: { cellWidth: 25, fillColor: [250, 230, 230], textColor: [150, 0, 0] }
                }
            });

            // ============ LISTADO DETALLADO (ORDENADO) ============
            let startYListado = doc.lastAutoTable.finalY + 8;
            if (startYListado > 240) { doc.addPage(); startYListado = 20; }

            doc.setFontSize(10); 
            doc.setFont('helvetica', 'bold'); 
            doc.text(`LISTADO DETALLADO DE BIENES - ORDENADO POR UBICACIÓN (${totalArticulos} registros)`, 20, startYListado);

            const detalleColumn = ["#", "Código", "Tipo/Descripción", "Serial", "Marca", "Modelo", "Ubicación", "Responsable", "Estado"];
            
            const detalleRows = datos.map((item, index) => [
                (index + 1).toString(),
                item.inventario_id || '-',
                (item.tipo || '-').length > 35 ? (item.tipo || '-').substring(0, 35) + '...' : (item.tipo || '-'),
                item.serial && item.serial !== '-----------' ? item.serial : '-',
                item.marca || '-',
                item.modelo && item.modelo !== '-----------' ? item.modelo : '-',
                item.ubicacion || '-',
                item.responsable || '-',
                item.status || '-'
            ]);

            // ⭐ Variable para rastrear cambios de ubicación (para separadores visuales)
            let ubicacionAnterior = '';

            doc.autoTable({ 
                head: [detalleColumn], 
                body: detalleRows, 
                startY: startYListado + 3, 
                theme: 'striped', 
                fontSize: 6, 
                margin: { left: 20, right: 20, top: 20, bottom: 20 }, 
                headStyles: { 
                    fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center' 
                }, 
                styles: { 
                    cellPadding: 0.8, overflow: 'linebreak', fontSize: 6, valign: 'middle', minCellHeight: 4 
                }, 
                columnStyles: { 
                    0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
                    1: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235] },
                    2: { cellWidth: 42, halign: 'left' },
                    3: { cellWidth: 22, halign: 'center', fontSize: 5.5 },
                    4: { cellWidth: 18, halign: 'center' },
                    5: { cellWidth: 18, halign: 'center' },
                    6: { cellWidth: 22, halign: 'left', fontStyle: 'bold' },
                    7: { cellWidth: 22, halign: 'left' },
                    8: { cellWidth: 17, halign: 'center', fontStyle: 'bold' }
                },
                didParseCell: function(data) {
                    if (data.section === 'head') {
                        data.cell.styles.fontStyle = 'bold';
                    }
                    // Colorear columna de estado
                    if (data.section === 'body' && data.column.index === 8) {
                        const estado = data.cell.raw;
                        if (estado && estado.toUpperCase() === 'OPERATIVO') {
                            data.cell.styles.textColor = [0, 100, 0];
                            data.cell.styles.fillColor = [210, 245, 210];
                        } else if (estado && estado.toUpperCase() === 'DAÑADO') {
                            data.cell.styles.textColor = [150, 0, 0];
                            data.cell.styles.fillColor = [250, 230, 230];
                        }
                    }
                    // Resaltar cambios de ubicación con borde superior
                    if (data.section === 'body' && data.column.index === 0) {
                        const filaIndex = data.row.index;
                        const ubicacionActual = datos[filaIndex]?.ubicacion || '';
                        if (filaIndex > 0 && ubicacionActual !== ubicacionAnterior && ubicacionAnterior !== '') {
                            // Agregar borde superior más grueso para separar ubicaciones
                            data.cell.styles.lineWidth = { top: 0.8, bottom: 0.1, left: 0.1, right: 0.1 };
                            data.cell.styles.lineColor = { top: [37, 99, 235], bottom: [200, 200, 200], left: [200, 200, 200], right: [200, 200, 200] };
                        }
                        ubicacionAnterior = ubicacionActual;
                    }
                },
                didDrawPage: function(data) {
                    if (data.pageNumber > 1) {
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'italic');
                        doc.text(`REPORTE DE INVENTARIO UNES - Página ${data.pageNumber}`, 105, 10, { align: 'center' });
                    }
                    const pageCount = doc.internal.getNumberOfPages();
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'italic');
                    doc.text(`Página ${data.pageNumber} de ${pageCount}`, 105, 280, { align: 'center' });
                }
            });

            // ============ GUARDAR PDF ============
            let nombreArchivo = 'Inventario_UNES';
            if (filtros.estado) nombreArchivo += `_${filtros.estado}`;
            if (filtros.ubicacion) nombreArchivo += `_${filtros.ubicacion.replace(/\s+/g, '_')}`;
            nombreArchivo += `_${new Date().toISOString().split('T')[0]}.pdf`;
            
            doc.save(nombreArchivo);

            Swal.fire({
                icon: 'success',
                title: '✅ PDF Descargado',
                html: `
                    <div class="text-left text-sm">
                        <p><strong>Total de bienes:</strong> ${totalArticulos}</p>
                        <p><strong>Ordenado por:</strong> Ubicación → Tipo → Código</p>
                        <p><strong>Operativos:</strong> <span class="text-green-600">${operativos}</span></p>
                        <p><strong>Dañados:</strong> <span class="text-red-600">${danados}</span></p>
                        <p><strong>Páginas:</strong> ${doc.internal.getNumberOfPages()}</p>
                    </div>
                `,
                timer: 3500,
                showConfirmButton: false
            });

        } catch (e) {
            console.error('❌ Error generando PDF:', e);
            Swal.fire('Error', 'No se pudo generar el PDF: ' + e.message, 'error');
        }
    },

    // ============================================
    // 📊 EXPORTAR EXCEL (MODERNO Y PROFESIONAL)
    // ============================================
    exportarExcel: function() {
        const datosSinOrdenar = this.datosFiltradosActuales && this.datosFiltradosActuales.length > 0 
            ? this.datosFiltradosActuales 
            : this.datosCache;

        if (datosSinOrdenar.length === 0) {
            Swal.fire('Atención', 'No hay datos para exportar', 'warning');
            return;
        }

        // ⭐ ORDENAR datos por ubicación y tipo
        const datos = this.ordenarDatos(datosSinOrdenar);

        try {
            // Calcular estadísticas
            const totalArticulos = datos.length;
            const operativos = datos.filter(i => this.esOperativo(i.status)).length;
            const danados = datos.filter(i => this.esDanado(i.status)).length;
            const ubicaciones = [...new Set(datos.map(i => i.ubicacion).filter(Boolean))].length;

            // ============ HOJA 1: RESUMEN EJECUTIVO ============
            const resumenData = [
                ['REPORTE DE INVENTARIO - UNIVERSIDAD NACIONAL EXPERIMENTAL DE LA SEGURIDAD'],
                [],
                ['Fecha de Generación:', new Date().toLocaleDateString('es-VE', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                })],
                ['Generado por:', window.appState?.nombreProfesorGlobal || 'Sistema UNES'],
                [],
                ['RESUMEN EJECUTIVO'],
                ['Total de Bienes Registrados:', totalArticulos],
                ['Bienes Operativos:', operativos],
                ['Bienes Dañados:', danados],
                ['Total de Ubicaciones:', ubicaciones],
                ['Porcentaje Operativo:', `${((operativos/totalArticulos)*100).toFixed(1)}%`],
                [],
                ['FILTROS APLICADOS'],
                ['Búsqueda:', this.filtroActual?.texto || '(ninguno)'],
                ['Estado:', this.filtroActual?.estado || '(todos)'],
                ['Ubicación:', this.filtroActual?.ubicacion || '(todas)'],
            ];

            const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
            
            // Estilos para el resumen
            wsResumen['!cols'] = [
                { wch: 35 },
                { wch: 50 }
            ];

            // ============ HOJA 2: DETALLE DE BIENES ============
            const datosExcel = datos.map((item, index) => ({
                '#': index + 1,
                'Código Inventario': item.inventario_id || '',
                'N° Depósito': item.nro_deposito || '',
                'Tipo / Descripción': item.tipo || '',
                'Serial': item.serial !== '-----------' ? item.serial : '',
                'Marca': item.marca || '',
                'Modelo': item.modelo !== '-----------' ? item.modelo : '',
                'Ubicación': item.ubicacion || '',
                'Responsable': item.responsable || '',
                'Estado': item.status || '',
                'Observaciones': item.observaciones || '',
                'Evaluador': item.evaluador || '',
                'Última Actualización': item.ultima_actualizacion 
                    ? new Date(item.ultima_actualizacion).toLocaleDateString('es-VE') 
                    : ''
            }));

            const wsDetalle = XLSX.utils.json_to_sheet(datosExcel);

            // ⭐ CALCULAR ANCHOS DE COLUMNA DINÁMICOS
            wsDetalle['!cols'] = [
                this.calcularAnchoColumna(datos, 'inventario_id', 20, 5),   // #
                this.calcularAnchoColumna(datos, 'inventario_id', 20, 10),  // Código
                this.calcularAnchoColumna(datos, 'nro_deposito', 20, 10),   // N° Depósito
                this.calcularAnchoColumna(datos, 'tipo', 50, 15),           // Tipo
                this.calcularAnchoColumna(datos, 'serial', 25, 10),         // Serial
                this.calcularAnchoColumna(datos, 'marca', 25, 10),          // Marca
                this.calcularAnchoColumna(datos, 'modelo', 25, 10),         // Modelo
                this.calcularAnchoColumna(datos, 'ubicacion', 40, 12),      // Ubicación
                this.calcularAnchoColumna(datos, 'responsable', 35, 12),    // Responsable
                { wch: 14 },                                                // Estado
                this.calcularAnchoColumna(datos, 'observaciones', 60, 15),  // Observaciones
                this.calcularAnchoColumna(datos, 'evaluador', 25, 10),      // Evaluador
                { wch: 18 }                                                 // Fecha
            ];

            // ⭐ APLICAR ESTILOS A CELDAS (usando formato XLSX)
            // Encabezados con fondo azul claro y texto en negrita
            const range = XLSX.utils.decode_range(wsDetalle['!ref']);
            
            // Estilo para encabezados (fila 0)
            const estiloHeader = {
                fill: { fgColor: { rgb: "B4D4F4" } }, // Azul claro
                font: { bold: true, color: { rgb: "1E3A5F" }, sz: 11, name: "Calibri" },
                alignment: { horizontal: "center", vertical: "center", wrapText: true },
                border: {
                    top: { style: "medium", color: { rgb: "1E3A5F" } },
                    bottom: { style: "medium", color: { rgb: "1E3A5F" } },
                    left: { style: "thin", color: { rgb: "1E3A5F" } },
                    right: { style: "thin", color: { rgb: "1E3A5F" } }
                }
            };

            // Aplicar estilo a cada encabezado
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
                if (!wsDetalle[cellAddress]) continue;
                wsDetalle[cellAddress].s = estiloHeader;
            }

            // Estilos para celdas de datos
            const estiloCeldaNormal = {
                font: { sz: 10, name: "Calibri" },
                alignment: { vertical: "center", wrapText: true },
                border: {
                    top: { style: "thin", color: { rgb: "CCCCCC" } },
                    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                    left: { style: "thin", color: { rgb: "CCCCCC" } },
                    right: { style: "thin", color: { rgb: "CCCCCC" } }
                }
            };

            const estiloCeldaAlterna = {
                ...estiloCeldaNormal,
                fill: { fgColor: { rgb: "F5F9FF" } } // Azul muy claro para filas alternas
            };

            const estiloOperativo = {
                ...estiloCeldaNormal,
                fill: { fgColor: { rgb: "D4EDDA" } }, // Verde claro
                font: { sz: 10, name: "Calibri", bold: true, color: { rgb: "155724" } },
                alignment: { horizontal: "center", vertical: "center" }
            };

            const estiloDanado = {
                ...estiloCeldaNormal,
                fill: { fgColor: { rgb: "F8D7DA" } }, // Rojo claro
                font: { sz: 10, name: "Calibri", bold: true, color: { rgb: "721C24" } },
                alignment: { horizontal: "center", vertical: "center" }
            };

            const estiloCodigo = {
                ...estiloCeldaNormal,
                font: { sz: 10, name: "Consolas", bold: true, color: { rgb: "2563EB" } },
                alignment: { horizontal: "center", vertical: "center" }
            };

            const estiloCentro = {
                ...estiloCeldaNormal,
                alignment: { horizontal: "center", vertical: "center" }
            };

            // Aplicar estilos a cada fila de datos
            let ubicacionAnterior = '';
            for (let R = 1; R <= range.e.r; ++R) {
                const item = datos[R - 1];
                const esFilaAlterna = R % 2 === 0;
                const ubicacionActual = item.ubicacion || '';
                const cambioUbicacion = R > 1 && ubicacionActual !== ubicacionAnterior;
                ubicacionAnterior = ubicacionActual;

                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!wsDetalle[cellAddress]) continue;

                    let estilo;
                    
                    // Columna de estado (índice 9)
                    if (C === 9) {
                        const estado = item.status || '';
                        if (this.esOperativo(estado)) {
                            estilo = estiloOperativo;
                        } else if (this.esDanado(estado)) {
                            estilo = estiloDanado;
                        } else {
                            estilo = esFilaAlterna ? estiloCeldaAlterna : estiloCeldaNormal;
                            estilo = { ...estilo, alignment: { horizontal: "center", vertical: "center" } };
                        }
                    }
                    // Columna de código (índice 1)
                    else if (C === 1) {
                        estilo = estiloCodigo;
                    }
                    // Columna # (índice 0)
                    else if (C === 0) {
                        estilo = { ...estiloCeldaNormal, alignment: { horizontal: "center", vertical: "center" }, font: { sz: 10, name: "Calibri", bold: true } };
                    }
                    // Columnas numéricas/centradas (Serial, Marca, Modelo, Fecha)
                    else if ([4, 5, 6, 12].includes(C)) {
                        estilo = { ...(esFilaAlterna ? estiloCeldaAlterna : estiloCeldaNormal), alignment: { horizontal: "center", vertical: "center" } };
                    }
                    // Resto de columnas
                    else {
                        estilo = esFilaAlterna ? estiloCeldaAlterna : estiloCeldaNormal;
                    }

                    // Borde superior más grueso al cambiar de ubicación
                    if (cambioUbicacion) {
                        estilo.border = {
                            ...estilo.border,
                            top: { style: "medium", color: { rgb: "2563EB" } }
                        };
                    }

                    wsDetalle[cellAddress].s = estilo;
                }
            }

            // ⭐ CONGELAR PANELES (header fijo)
            wsDetalle['!freeze'] = { xSplit: 0, ySplit: 1 };

            // ⭐ AGREGAR AUTO-FILTROS
            wsDetalle['!autofilter'] = { 
                ref: `A1:${XLSX.utils.encode_col(range.e.c)}${range.e.r + 1}` 
            };

            // ⭐ ALTURA DE FILA PARA ENCABEZADOS
            wsDetalle['!rows'] = [{ hpt: 25 }];

            // ============ HOJA 3: RESUMEN POR UBICACIÓN ============
            const agrupadoPorUbicacion = {};
            datos.forEach(item => {
                const ubic = item.ubicacion || 'SIN UBICACIÓN';
                if (!agrupadoPorUbicacion[ubic]) {
                    agrupadoPorUbicacion[ubic] = { total: 0, operativos: 0, danados: 0 };
                }
                agrupadoPorUbicacion[ubic].total++;
                if (this.esOperativo(item.status)) agrupadoPorUbicacion[ubic].operativos++;
                else if (this.esDanado(item.status)) agrupadoPorUbicacion[ubic].danados++;
            });

            const resumenUbicData = [
                ['RESUMEN POR UBICACIÓN'],
                [],
                ['Ubicación', 'Total', 'Operativos', 'Dañados', '% Operativo']
            ];

            Object.entries(agrupadoPorUbicacion)
                .sort((a, b) => b[1].total - a[1].total)
                .forEach(([ubic, stats]) => {
                    const pctOp = stats.total > 0 ? ((stats.operativos/stats.total)*100).toFixed(1) + '%' : '0%';
                    resumenUbicData.push([ubic, stats.total, stats.operativos, stats.danados, pctOp]);
                });

            resumenUbicData.push([]);
            resumenUbicData.push(['TOTAL GENERAL', totalArticulos, operativos, danados, `${((operativos/totalArticulos)*100).toFixed(1)}%`]);

            const wsUbicacion = XLSX.utils.aoa_to_sheet(resumenUbicData);
            wsUbicacion['!cols'] = [
                { wch: 45 },
                { wch: 12 },
                { wch: 14 },
                { wch: 12 },
                { wch: 14 }
            ];

            // ============ CREAR LIBRO DE EXCEL ============
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, wsResumen, '📊 Resumen');
            XLSX.utils.book_append_sheet(wb, wsDetalle, '📦 Inventario Detallado');
            XLSX.utils.book_append_sheet(wb, wsUbicacion, '📍 Por Ubicación');

            // ============ GUARDAR ARCHIVO ============
            let nombreArchivo = 'Inventario_UNES';
            if (this.filtroActual?.estado) nombreArchivo += `_${this.filtroActual.estado}`;
            if (this.filtroActual?.ubicacion) nombreArchivo += `_${this.filtroActual.ubicacion.replace(/\s+/g, '_')}`;
            nombreArchivo += `_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            XLSX.writeFile(wb, nombreArchivo);

            Swal.fire({
                icon: 'success',
                title: '✅ Excel Exportado',
                html: `
                    <div class="text-left text-sm">
                        <p><strong>📊 Hoja 1:</strong> Resumen Ejecutivo</p>
                        <p><strong>📦 Hoja 2:</strong> Inventario Detallado (${totalArticulos} registros)</p>
                        <p><strong>📍 Hoja 3:</strong> Resumen por Ubicación</p>
                        <p class="mt-2 text-xs text-gray-600">✨ Ordenado por Ubicación → Tipo → Código</p>
                    </div>
                `,
                timer: 3500,
                showConfirmButton: false
            });

        } catch (e) {
            console.error('❌ Error generando Excel:', e);
            Swal.fire('Error', 'No se pudo generar el Excel: ' + e.message, 'error');
        }
    }
};

// Event listener para el formulario
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-articulo');
    if (form) {
        form.addEventListener('submit', (e) => window.modules.inventario.guardarArticulo(e));
    }
});

console.log('✅ Módulo de Inventario v4.0 cargado');
