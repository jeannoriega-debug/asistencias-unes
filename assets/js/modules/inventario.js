/**
 * MÓDULO DE INVENTARIO UNES
 * Versión: 2.0 - CRUD completo con reporte PDF estilo Bajas y filtros
 * Solo accesible para roles: inventario_admin y super_usuario
 */

window.modules = window.modules || {};
window.modules.inventario = {
    datosCache: [],
    datosFiltradosActuales: [],
    filtroActual: { texto: '', estado: '', ubicacion: '' },

    // ============================================
    // CARGAR INVENTARIO
    // ============================================
    cargarInventario: async function() {
        try {
            const { data, error } = await window.supabaseClient
                .from('inventario_unes')
                .select('*')
                .eq('activo', true)
                .order('tipo');

            if (error) throw error;

            this.datosCache = data || [];
            this.datosFiltradosActuales = this.datosCache;
            this.actualizarEstadisticas();
            this.renderizarTabla(this.datosCache);
            this.actualizarContadorResultados(this.datosCache.length, this.datosCache.length);
            this.cargarFiltroUbicaciones();

            console.log('✅ Inventario cargado:', this.datosCache.length, 'artículos');

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
        const operativos = this.datosCache.filter(i => i.status === 'OPERATIVO').length;
        const danados = this.datosCache.filter(i => i.status === 'Dañado').length;
        const ubicaciones = [...new Set(this.datosCache.map(i => i.ubicacion).filter(Boolean))].length;

        document.getElementById('total-articulos').textContent = total;
        document.getElementById('total-operativos').textContent = operativos;
        document.getElementById('total-danados').textContent = danados;
        document.getElementById('total-ubicaciones').textContent = ubicaciones;
    },

    // ============================================
    // ACTUALIZAR CONTADOR DE RESULTADOS (sobre la tabla)
    // ============================================
    actualizarContadorResultados: function(mostrados, total) {
        let contador = document.getElementById('contador-resultados');
        
        // Crear el elemento si no existe
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

        const porcentaje = total > 0 ? ((mostrados / total) * 100).toFixed(1) : 0;
        const filtroActivo = mostrados < total;

        contador.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fas fa-list-ol text-xl"></i>
                <div>
                    <span class="text-2xl font-bold">${mostrados}</span>
                    <span class="text-sm ml-1">de ${total} registros</span>
                    ${filtroActivo ? `<span class="ml-2 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">⚡ FILTRADO (${porcentaje}%)</span>` : ''}
                </div>
            </div>
            <div class="text-right text-xs">
                <div>✅ Operativos: <strong>${this.datosCache.filter(i => i.status === 'OPERATIVO').length}</strong></div>
                <div>❌ Dañados: <strong>${this.datosCache.filter(i => i.status === 'Dañado').length}</strong></div>
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
            const statusClass = item.status === 'OPERATIVO' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800';
            const statusIcon = item.status === 'OPERATIVO' ? '✅' : '❌';

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
            
            const matchEstado = !estado || item.status === estado;
            const matchUbicacion = !ubicacion || item.ubicacion === ubicacion;

            return matchTexto && matchEstado && matchUbicacion;
        });

        // Guardar los datos filtrados para usarlos en el PDF y Excel
        this.datosFiltradosActuales = filtrados;
        this.filtroActual = { texto, estado, ubicacion };

        this.renderizarTabla(filtrados);
        this.actualizarContadorResultados(filtrados.length, this.datosCache.length);

        console.log(`📊 ${filtrados.length} de ${this.datosCache.length} artículos mostrados`);
    },

    // ============================================
    // ABRIR MODAL NUEVO
    // ============================================
    abrirModalNuevo: function() {
        document.getElementById('modal-titulo').textContent = 'Nuevo Artículo';
        document.getElementById('modal-icono').className = 'fas fa-plus-circle';
        document.getElementById('form-articulo').reset();
        document.getElementById('inv-id').value = '';
        document.getElementById('modal-articulo').classList.remove('hidden');
        document.getElementById('modal-articulo').classList.add('flex');
    },

    // ============================================
    // EDITAR ARTÍCULO
    // ============================================
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

    // ============================================
    // CERRAR MODAL
    // ============================================
    cerrarModal: function() {
        document.getElementById('modal-articulo').classList.add('hidden');
        document.getElementById('modal-articulo').classList.remove('flex');
    },

    // ============================================
    // GUARDAR ARTÍCULO (CREATE/UPDATE)
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
    // GENERAR REPORTE PDF (ESTILO BAJAS DISCIPLINA)
    // ============================================
    generarReportePDF: function() {
        // USAR los datos filtrados, no todos los datos
        const datos = this.datosFiltradosActuales && this.datosFiltradosActuales.length > 0 
            ? this.datosFiltradosActuales 
            : this.datosCache;

        if (datos.length === 0) {
            Swal.fire('Atención', 'No hay datos para generar el reporte', 'warning');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ 
                orientation: 'portrait', 
                unit: 'mm', 
                format: 'letter',
                margins: { top: 20, bottom: 20, left: 20, right: 20 }
            });

            // Obtener filtros aplicados
            const filtros = this.filtroActual || { texto: '', estado: '', ubicacion: '' };
            const filtrosTexto = [];
            if (filtros.texto) filtrosTexto.push(`Búsqueda: "${filtros.texto}"`);
            if (filtros.estado) filtrosTexto.push(`Estado: ${filtros.estado}`);
            if (filtros.ubicacion) filtrosTexto.push(`Ubicación: ${filtros.ubicacion}`);
            const filtrosAplicados = filtrosTexto.length > 0 
                ? filtrosTexto.join(' | ') 
                : 'Ninguno (todos los registros)';

            // Fecha de generación
            const fechaGeneracion = new Date().toLocaleDateString('es-VE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            // Calcular estadísticas
            const totalArticulos = datos.length;
            const operativos = datos.filter(i => i.status === 'OPERATIVO').length;
            const danados = datos.filter(i => i.status === 'Dañado').length;

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
                if (item.status === 'OPERATIVO') agrupadoPorTipo[tipo].operativos++;
                else if (item.status === 'Dañado') agrupadoPorTipo[tipo].danados++;
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

            const totalesFila = ['TOTAL GENERAL', totalArticulos.toString(), operativos.toString(), danados.toString()];
            tiposRows.push(totalesFila);

            doc.autoTable({ 
                head: [tiposColumn], 
                body: tiposRows, 
                startY: 55, 
                theme: 'grid', 
                fontSize: 7, 
                margin: { left: 20, right: 20 }, 
                headStyles: { 
                    fillColor: [37, 99, 235], 
                    textColor: 255, 
                    fontStyle: 'bold', 
                    halign: 'center' 
                }, 
                styles: { 
                    cellPadding: 1.5, 
                    halign: 'center', 
                    fontSize: 7 
                }, 
                columnStyles: { 
                    0: { cellWidth: 90, halign: 'left', fontStyle: 'bold', fillColor: [240, 240, 240] },
                    1: { cellWidth: 25, fontStyle: 'bold', fillColor: [220, 230, 250] },
                    2: { cellWidth: 25, fillColor: [210, 245, 210], textColor: [0, 100, 0] },
                    3: { cellWidth: 25, fillColor: [250, 230, 230], textColor: [150, 0, 0] }
                }
            });

            // ============ RESUMEN POR UBICACIÓN ============
            let startYUbicacion = doc.lastAutoTable.finalY + 5;
            
            if (startYUbicacion > 200) {
                doc.addPage();
                startYUbicacion = 20;
            }

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
                if (item.status === 'OPERATIVO') agrupadoPorUbicacion[ubic].operativos++;
                else if (item.status === 'Dañado') agrupadoPorUbicacion[ubic].danados++;
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

            const totalesUbicacion = ['TOTAL GENERAL', totalArticulos.toString(), operativos.toString(), danados.toString()];
            ubicacionRows.push(totalesUbicacion);

            doc.autoTable({ 
                head: [ubicacionColumn], 
                body: ubicacionRows, 
                startY: startYUbicacion + 3, 
                theme: 'grid', 
                fontSize: 7, 
                margin: { left: 20, right: 20 }, 
                headStyles: { 
                    fillColor: [16, 185, 129], 
                    textColor: 255, 
                    fontStyle: 'bold', 
                    halign: 'center' 
                }, 
                styles: { 
                    cellPadding: 1.5, 
                    halign: 'center', 
                    fontSize: 7 
                }, 
                columnStyles: { 
                    0: { cellWidth: 90, halign: 'left', fontStyle: 'bold', fillColor: [240, 240, 240] },
                    1: { cellWidth: 25, fontStyle: 'bold', fillColor: [220, 230, 250] },
                    2: { cellWidth: 25, fillColor: [210, 245, 210], textColor: [0, 100, 0] },
                    3: { cellWidth: 25, fillColor: [250, 230, 230], textColor: [150, 0, 0] }
                }
            });

            // ============ LISTADO DETALLADO ============
            let startYListado = doc.lastAutoTable.finalY + 8;
            
            if (startYListado > 240) {
                doc.addPage();
                startYListado = 20;
            }

            doc.setFontSize(10); 
            doc.setFont('helvetica', 'bold'); 
            doc.text(`LISTADO DETALLADO DE BIENES (${totalArticulos} registros)`, 20, startYListado);

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

            doc.autoTable({ 
                head: [detalleColumn], 
                body: detalleRows, 
                startY: startYListado + 3, 
                theme: 'striped', 
                fontSize: 6, 
                margin: { left: 20, right: 20, top: 20, bottom: 20 }, 
                headStyles: { 
                    fillColor: [37, 99, 235], 
                    textColor: 255, 
                    fontStyle: 'bold', 
                    halign: 'center' 
                }, 
                styles: { 
                    cellPadding: 0.8, 
                    overflow: 'linebreak', 
                    fontSize: 6, 
                    valign: 'middle', 
                    minCellHeight: 4 
                }, 
                columnStyles: { 
                    0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
                    1: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235] },
                    2: { cellWidth: 42, halign: 'left' },
                    3: { cellWidth: 22, halign: 'center', fontSize: 5.5 },
                    4: { cellWidth: 18, halign: 'center' },
                    5: { cellWidth: 18, halign: 'center' },
                    6: { cellWidth: 22, halign: 'left' },
                    7: { cellWidth: 22, halign: 'left' },
                    8: { cellWidth: 17, halign: 'center', fontStyle: 'bold' }
                },
                didParseCell: function(data) {
                    if (data.section === 'head') {
                        data.cell.styles.fontStyle = 'bold';
                    }
                    if (data.section === 'body' && data.column.index === 8) {
                        const estado = data.cell.raw;
                        if (estado === 'OPERATIVO') {
                            data.cell.styles.textColor = [0, 100, 0];
                            data.cell.styles.fillColor = [210, 245, 210];
                        } else if (estado === 'Dañado') {
                            data.cell.styles.textColor = [150, 0, 0];
                            data.cell.styles.fillColor = [250, 230, 230];
                        }
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
    // EXPORTAR EXCEL (CON FILTROS)
    // ============================================
    exportarExcel: function() {
        const datos = this.datosFiltradosActuales && this.datosFiltradosActuales.length > 0 
            ? this.datosFiltradosActuales 
            : this.datosCache;

        if (datos.length === 0) {
            Swal.fire('Atención', 'No hay datos para exportar', 'warning');
            return;
        }

        const datosExcel = datos.map(item => ({
            'Código Inventario': item.inventario_id,
            'N° Depósito': item.nro_deposito,
            'Tipo/Descripción': item.tipo,
            'Serial': item.serial !== '-----------' ? item.serial : '',
            'Marca': item.marca,
            'Modelo': item.modelo !== '-----------' ? item.modelo : '',
            'Ubicación': item.ubicacion,
            'Responsable': item.responsable,
            'Estado': item.status,
            'Observaciones': item.observaciones,
            'Evaluador': item.evaluador,
            'Última Actualización': item.ultima_actualizacion
        }));

        const ws = XLSX.utils.json_to_sheet(datosExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

        const filename = `Inventario_UNES_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);

        Swal.fire({
            icon: 'success',
            title: '✅ Excel Exportado',
            text: `Se exportaron ${datos.length} registros`,
            timer: 2500,
            showConfirmButton: false
        });
    }
};

// Event listener para el formulario
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-articulo');
    if (form) {
        form.addEventListener('submit', (e) => window.modules.inventario.guardarArticulo(e));
    }
});

console.log('✅ Módulo de Inventario v2.0 cargado');
