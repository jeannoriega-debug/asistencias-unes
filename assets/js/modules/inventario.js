/**
 * MÓDULO DE INVENTARIO UNES
 * Versión: 6.0 - Completa con ExcelJS, PDF por ubicación, numeración local
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
    normalizarStatus: function(status) {
        if (!status) return '';
        return status.toString().trim().toUpperCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, '');
    },

    esOperativo: function(status) {
        return this.normalizarStatus(status) === 'OPERATIVO';
    },

    esDanado: function(status) {
        const norm = this.normalizarStatus(status);
        return norm === 'DANADO' || norm.includes('DAN');
    },

    debugStatus: function() {
        const valores = [...new Set(this.datosCache.map(i => i.status))];
        console.log('🔍 Valores únicos de status:', valores);
        console.log('📊 Total registros:', this.datosCache.length);
        console.log('✅ Operativos:', this.datosCache.filter(i => this.esOperativo(i.status)).length);
        console.log('❌ Dañados:', this.datosCache.filter(i => this.esDanado(i.status)).length);
        return valores;
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
            this.debugStatus();
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

        const elTotal = document.getElementById('total-articulos');
        const elOp = document.getElementById('total-operativos');
        const elDan = document.getElementById('total-danados');
        const elUb = document.getElementById('total-ubicaciones');

        if (elTotal) elTotal.textContent = total;
        if (elOp) elOp.textContent = operativos;
        if (elDan) elDan.textContent = danados;
        if (elUb) elUb.textContent = ubicaciones;

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
            
            const matchEstado = !estado || this.normalizarStatus(item.status) === this.normalizarStatus(estado);
            const matchUbicacion = !ubicacion || item.ubicacion === ubicacion;

            return matchTexto && matchEstado && matchUbicacion;
        });

        this.datosFiltradosActuales = filtrados;
        this.filtroActual = { texto, estado, ubicacion };

        this.renderizarTabla(filtrados);
        this.actualizarContadorResultados(filtrados, this.datosCache.length);

        console.log(` ${filtrados.length} de ${this.datosCache.length} artículos mostrados`);
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
                    <p class="text-sm text-red-600 mt-2">️ Esta acción no se puede deshacer</p>
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
    // ORDENAR DATOS POR UBICACIÓN Y TIPO
    // ============================================
    ordenarDatos: function(datos) {
        return [...datos].sort((a, b) => {
            const ubA = (a.ubicacion || '').toUpperCase();
            const ubB = (b.ubicacion || '').toUpperCase();
            if (ubA < ubB) return -1;
            if (ubA > ubB) return 1;
            
            const tipoA = (a.tipo || '').toUpperCase();
            const tipoB = (b.tipo || '').toUpperCase();
            if (tipoA < tipoB) return -1;
            if (tipoA > tipoB) return 1;
            
            const codA = (a.inventario_id || '').toUpperCase();
            const codB = (b.inventario_id || '').toUpperCase();
            if (codA < codB) return -1;
            if (codA > codB) return 1;
            
            return 0;
        });
    },

    // ============================================
    // 📄 GENERAR REPORTE PDF (NUMERACIÓN POR UBICACIÓN)
    // ============================================
    generarReportePDF: function() {
        const datosSinOrdenar = this.datosFiltradosActuales && this.datosFiltradosActuales.length > 0 
            ? this.datosFiltradosActuales 
            : this.datosCache;

        if (datosSinOrdenar.length === 0) {
            Swal.fire('Atención', 'No hay datos para generar el reporte', 'warning');
            return;
        }

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

            // AGRUPAR POR UBICACIÓN
            const agrupadoPorUbicacion = {};
            datos.forEach(item => {
                const ubic = item.ubicacion || 'SIN UBICACIÓN';
                if (!agrupadoPorUbicacion[ubic]) {
                    agrupadoPorUbicacion[ubic] = [];
                }
                agrupadoPorUbicacion[ubic].push(item);
            });

            const ubicaciones = Object.keys(agrupadoPorUbicacion).sort();

            // ENCABEZADO
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

            // CUADRO RESUMEN POR TIPO
            doc.setFontSize(10); 
            doc.setFont('helvetica', 'bold'); 
            doc.text('TABLA DINÁMICA: BIENES POR TIPO', 20, 52);

            const tipoStats = {};
            datos.forEach(item => {
                const tipo = item.tipo || 'SIN TIPO';
                if (!tipoStats[tipo]) {
                    tipoStats[tipo] = { total: 0, operativos: 0, danados: 0 };
                }
                tipoStats[tipo].total++;
                if (this.esOperativo(item.status)) tipoStats[tipo].operativos++;
                else if (this.esDanado(item.status)) tipoStats[tipo].danados++;
            });

            const tiposColumn = ['Tipo de Artículo', 'Total', 'Operativos', 'Dañados'];
            const tiposRows = Object.entries(tipoStats)
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

            // RESUMEN POR UBICACIÓN
            let startYUbicacion = doc.lastAutoTable.finalY + 5;
            if (startYUbicacion > 200) { doc.addPage(); startYUbicacion = 20; }

            doc.setFontSize(10); 
            doc.setFont('helvetica', 'bold'); 
            doc.text('TABLA DINÁMICA: BIENES POR UBICACIÓN', 20, startYUbicacion);

            const ubicStats = {};
            datos.forEach(item => {
                const ubic = item.ubicacion || 'SIN UBICACIÓN';
                if (!ubicStats[ubic]) {
                    ubicStats[ubic] = { total: 0, operativos: 0, danados: 0 };
                }
                ubicStats[ubic].total++;
                if (this.esOperativo(item.status)) ubicStats[ubic].operativos++;
                else if (this.esDanado(item.status)) ubicStats[ubic].danados++;
            });

            const ubicacionColumn = ['Ubicación', 'Total', 'Operativos', 'Dañados'];
            const ubicacionRows = Object.entries(ubicStats)
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

            // ============================================
            // LISTADO DETALLADO POR UBICACIÓN (NUMERACIÓN REINICIADA)
            // ============================================
            let startYListado = doc.lastAutoTable.finalY + 8;
            if (startYListado > 240) { doc.addPage(); startYListado = 20; }

            doc.setFontSize(10); 
            doc.setFont('helvetica', 'bold'); 
            doc.text(`LISTADO DETALLADO DE BIENES POR UBICACIÓN (${totalArticulos} registros)`, 20, startYListado);

            const detalleColumn = ["#", "Código", "Tipo/Descripción", "Serial", "Marca", "Modelo", "Ubicación", "Responsable", "Estado"];

            ubicaciones.forEach((ubicacion, ubicIdx) => {
                const itemsEnUbicacion = agrupadoPorUbicacion[ubicacion];
                const totalEnUbicacion = itemsEnUbicacion.length;
                const operativosEnUbicacion = itemsEnUbicacion.filter(i => this.esOperativo(i.status)).length;
                const danadosEnUbicacion = itemsEnUbicacion.filter(i => this.esDanado(i.status)).length;

                if (startYListado > 250) {
                    doc.addPage();
                    startYListado = 20;
                }

                // Encabezado de ubicación con fondo azul
                doc.setFillColor(37, 99, 235);
                doc.rect(20, startYListado - 5, 175, 7, 'F');
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text(`📍 ${ubicacion} (${totalEnUbicacion} items - ${operativosEnUbicacion} operativos - ${danadosEnUbicacion} dañados)`, 22, startYListado);

                startYListado += 3;

                // Filas de items con numeración reiniciada
                const detalleRows = itemsEnUbicacion.map((item, index) => [
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
                    startY: startYListado, 
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
                        0: { cellWidth: 8, halign: 'center', fontStyle: 'bold', fillColor: [240, 240, 240] },
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
                        if (data.section === 'body' && data.column.index === 8) {
                            const estado = data.cell.raw;
                            const estadoNorm = estado ? estado.toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '') : '';
                            if (estadoNorm === 'OPERATIVO') {
                                data.cell.styles.textColor = [0, 100, 0];
                                data.cell.styles.fillColor = [210, 245, 210];
                            } else if (estadoNorm === 'DANADO' || estadoNorm.includes('DAN')) {
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

                startYListado = doc.lastAutoTable.finalY + 5;
            });

            // TOTAL GENERAL AL FINAL
            if (startYListado > 250) {
                doc.addPage();
                startYListado = 30;
            }

            doc.setFillColor(16, 185, 129);
            doc.rect(20, startYListado - 5, 175, 10, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`📊 TOTAL GENERAL: ${totalArticulos} BIENES REGISTRADOS`, 105, startYListado + 2, { align: 'center' });

            startYListado += 8;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(`Operativos: ${operativos} (${((operativos/totalArticulos)*100).toFixed(1)}%) | Dañados: ${danados} (${((danados/totalArticulos)*100).toFixed(1)}%)`, 105, startYListado, { align: 'center' });

            // GUARDAR PDF
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
                        <p><strong>Ubicaciones:</strong> ${ubicaciones.length}</p>
                        <p><strong>Ordenado por:</strong> Ubicación → Tipo → Código</p>
                        <p><strong>Numeración:</strong> Reiniciada por ubicación</p>
                        <p><strong>Operativos:</strong> <span class="text-green-600">${operativos}</span></p>
                        <p><strong>Dañados:</strong> <span class="text-red-600">${danados}</span></p>
                        <p><strong>Páginas:</strong> ${doc.internal.getNumberOfPages()}</p>
                    </div>
                `,
                timer: 4000,
                showConfirmButton: false
            });

        } catch (e) {
            console.error('❌ Error generando PDF:', e);
            Swal.fire('Error', 'No se pudo generar el PDF: ' + e.message, 'error');
        }
    },

    // ============================================
    // 📊 EXPORTAR EXCEL CON EXCELJS (NUMERACIÓN POR UBICACIÓN)
    // ============================================
    exportarExcel: async function() {
        const datosSinOrdenar = this.datosFiltradosActuales && this.datosFiltradosActuales.length > 0 
            ? this.datosFiltradosActuales 
            : this.datosCache;

        if (datosSinOrdenar.length === 0) {
            Swal.fire('Atención', 'No hay datos para exportar', 'warning');
            return;
        }

        const datos = this.ordenarDatos(datosSinOrdenar);

        try {
            if (typeof ExcelJS === 'undefined') {
                Swal.fire('Error', 'La librería ExcelJS no está cargada. Verifica el HTML.', 'error');
                return;
            }

            const totalArticulos = datos.length;
            const operativos = datos.filter(i => this.esOperativo(i.status)).length;
            const danados = datos.filter(i => this.esDanado(i.status)).length;
            const ubicaciones = [...new Set(datos.map(i => i.ubicacion).filter(Boolean))].length;

            // AGRUPAR POR UBICACIÓN
            const agrupadoPorUbicacion = {};
            datos.forEach(item => {
                const ubic = item.ubicacion || 'SIN UBICACIÓN';
                if (!agrupadoPorUbicacion[ubic]) {
                    agrupadoPorUbicacion[ubic] = [];
                }
                agrupadoPorUbicacion[ubic].push(item);
            });

            const ubicacionesOrdenadas = Object.keys(agrupadoPorUbicacion).sort();

            const workbook = new ExcelJS.Workbook();
            workbook.creator = window.appState?.nombreProfesorGlobal || 'Sistema UNES';
            workbook.created = new Date();

            const colores = {
                azulOscuro: 'FF1E3A5F',
                azulClaro: 'FFB4D4F4',
                azulMedio: 'FF2563EB',
                azulMuyClaro: 'FFF5F9FF',
                verdeClaro: 'FFD4EDDA',
                verdeTexto: 'FF155724',
                rojoClaro: 'FFF8D7DA',
                rojoTexto: 'FF721C24',
                grisBorde: 'FFCCCCCC',
                blanco: 'FFFFFFFF',
                amarillo: 'FFFFF4CC',
                headerUbicacion: 'FF2563EB'
            };

            const bordeGenerico = {
                top: { style: 'thin', color: { argb: colores.grisBorde } },
                left: { style: 'thin', color: { argb: colores.grisBorde } },
                bottom: { style: 'thin', color: { argb: colores.grisBorde } },
                right: { style: 'thin', color: { argb: colores.grisBorde } }
            };

            const bordeHeader = {
                top: { style: 'medium', color: { argb: colores.azulOscuro } },
                left: { style: 'thin', color: { argb: colores.azulOscuro } },
                bottom: { style: 'medium', color: { argb: colores.azulOscuro } },
                right: { style: 'thin', color: { argb: colores.azulOscuro } }
            };

            // ============ HOJA 1: RESUMEN EJECUTIVO ============
            const wsResumen = workbook.addWorksheet('📊 Resumen', {
                properties: { tabColor: { argb: colores.azulMedio } }
            });

            wsResumen.mergeCells('A1:B1');
            const titleCell = wsResumen.getCell('A1');
            titleCell.value = 'REPORTE DE INVENTARIO - UNES';
            titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: colores.azulOscuro } };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            titleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colores.azulClaro }
            };
            wsResumen.getRow(1).height = 30;

            wsResumen.mergeCells('A3:B3');
            wsResumen.getCell('A3').value = `Generado: ${new Date().toLocaleDateString('es-VE', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })}`;
            wsResumen.getCell('A3').font = { name: 'Calibri', size: 10, italic: true };

            wsResumen.getCell('A4').value = 'Generado por:';
            wsResumen.getCell('A4').font = { name: 'Calibri', size: 10, bold: true };
            wsResumen.getCell('B4').value = window.appState?.nombreProfesorGlobal || 'Sistema UNES';

            wsResumen.mergeCells('A6:B6');
            wsResumen.getCell('A6').value = '📊 RESUMEN EJECUTIVO';
            wsResumen.getCell('A6').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
            wsResumen.getCell('A6').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: colores.azulMedio }
            };
            wsResumen.getCell('A6').alignment = { horizontal: 'center' };
            wsResumen.getRow(6).height = 25;

            const resumenStats = [
                ['Total de Bienes:', totalArticulos],
                ['Bienes Operativos:', operativos],
                ['Bienes Dañados:', danados],
                ['Total Ubicaciones:', ubicaciones],
                ['% Operativo:', `${((operativos/totalArticulos)*100).toFixed(1)}%`]
            ];

            resumenStats.forEach((fila, idx) => {
                const rowNum = 7 + idx;
                wsResumen.getCell(`A${rowNum}`).value = fila[0];
                wsResumen.getCell(`A${rowNum}`).font = { name: 'Calibri', size: 11, bold: true };
                wsResumen.getCell(`B${rowNum}`).value = fila[1];
                wsResumen.getCell(`B${rowNum}`).font = { name: 'Calibri', size: 12, bold: true };
                wsResumen.getCell(`B${rowNum}`).alignment = { horizontal: 'center' };
                
                if (idx === 1) {
                    wsResumen.getCell(`B${rowNum}`).fill = {
                        type: 'pattern', pattern: 'solid', fgColor: { argb: colores.verdeClaro }
                    };
                    wsResumen.getCell(`B${rowNum}`).font = { 
                        name: 'Calibri', size: 12, bold: true, color: { argb: colores.verdeTexto } 
                    };
                } else if (idx === 2) {
                    wsResumen.getCell(`B${rowNum}`).fill = {
                        type: 'pattern', pattern: 'solid', fgColor: { argb: colores.rojoClaro }
                    };
                    wsResumen.getCell(`B${rowNum}`).font = { 
                        name: 'Calibri', size: 12, bold: true, color: { argb: colores.rojoTexto } 
                    };
                }
                
                [wsResumen.getCell(`A${rowNum}`), wsResumen.getCell(`B${rowNum}`)].forEach(c => {
                    c.border = bordeGenerico;
                });
            });

            const rowFiltros = 13;
            wsResumen.mergeCells(`A${rowFiltros}:B${rowFiltros}`);
            wsResumen.getCell(`A${rowFiltros}`).value = '🔍 FILTROS APLICADOS';
            wsResumen.getCell(`A${rowFiltros}`).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
            wsResumen.getCell(`A${rowFiltros}`).fill = {
                type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' }
            };
            wsResumen.getCell(`A${rowFiltros}`).alignment = { horizontal: 'center' };
            wsResumen.getRow(rowFiltros).height = 25;

            const filtrosInfo = [
                ['Búsqueda:', this.filtroActual?.texto || '(ninguno)'],
                ['Estado:', this.filtroActual?.estado || '(todos)'],
                ['Ubicación:', this.filtroActual?.ubicacion || '(todas)']
            ];

            filtrosInfo.forEach((fila, idx) => {
                const rowNum = rowFiltros + 1 + idx;
                wsResumen.getCell(`A${rowNum}`).value = fila[0];
                wsResumen.getCell(`A${rowNum}`).font = { name: 'Calibri', size: 11, bold: true };
                wsResumen.getCell(`B${rowNum}`).value = fila[1];
                [wsResumen.getCell(`A${rowNum}`), wsResumen.getCell(`B${rowNum}`)].forEach(c => {
                    c.border = bordeGenerico;
                });
            });

            wsResumen.columns = [
                { width: 30 },
                { width: 50 }
            ];

            // ============ HOJA 2: INVENTARIO DETALLADO (NUMERACIÓN POR UBICACIÓN) ============
            const wsDetalle = workbook.addWorksheet('📦 Inventario Detallado', {
                properties: { tabColor: { argb: 'FF2563EB' } },
                views: [{ state: 'frozen', ySplit: 1 }]
            });

            wsDetalle.columns = [
                { header: '#', key: 'num', width: 6 },
                { header: 'Código', key: 'codigo', width: 18 },
                { header: 'N° Depósito', key: 'deposito', width: 14 },
                { header: 'Tipo / Descripción', key: 'tipo', width: 40 },
                { header: 'Serial', key: 'serial', width: 20 },
                { header: 'Marca', key: 'marca', width: 18 },
                { header: 'Modelo', key: 'modelo', width: 18 },
                { header: 'Ubicación', key: 'ubicacion', width: 28 },
                { header: 'Responsable', key: 'responsable', width: 28 },
                { header: 'Estado', key: 'estado', width: 14 },
                { header: 'Observaciones', key: 'observaciones', width: 35 },
                { header: 'Evaluador', key: 'evaluador', width: 20 },
                { header: 'Última Actualización', key: 'fecha', width: 18 }
            ];

            let currentRow = 1;

            const headerRow = wsDetalle.getRow(currentRow);
            headerRow.height = 25;
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: colores.azulClaro }
                };
                cell.font = {
                    name: 'Calibri',
                    size: 11,
                    bold: true,
                    color: { argb: colores.azulOscuro }
                };
                cell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle',
                    wrapText: true
                };
                cell.border = bordeHeader;
            });

            currentRow++;

            // Procesar cada ubicación
            ubicacionesOrdenadas.forEach((ubicacion, ubicIdx) => {
                const itemsEnUbicacion = agrupadoPorUbicacion[ubicacion];
                const totalEnUbicacion = itemsEnUbicacion.length;
                const operativosEnUbicacion = itemsEnUbicacion.filter(i => this.esOperativo(i.status)).length;
                const danadosEnUbicacion = itemsEnUbicacion.filter(i => this.esDanado(i.status)).length;

                // Encabezado de ubicación
                const ubicHeaderRow = wsDetalle.getRow(currentRow);
                wsDetalle.mergeCells(`A${currentRow}:M${currentRow}`);
                
                const ubicCell = wsDetalle.getCell(`A${currentRow}`);
                ubicCell.value = `📍 ${ubicacion} (${totalEnUbicacion} items - ${operativosEnUbicacion} operativos - ${danadosEnUbicacion} dañados)`;
                ubicCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: colores.headerUbicacion }
                };
                ubicCell.font = {
                    name: 'Calibri',
                    size: 11,
                    bold: true,
                    color: { argb: 'FFFFFFFF' }
                };
                ubicCell.alignment = { horizontal: 'left', vertical: 'middle' };
                ubicCell.border = {
                    top: { style: 'medium', color: { argb: colores.azulMedio } },
                    left: { style: 'thin', color: { argb: colores.azulMedio } },
                    bottom: { style: 'medium', color: { argb: colores.azulMedio } },
                    right: { style: 'thin', color: { argb: colores.azulMedio } }
                };
                ubicHeaderRow.height = 22;

                currentRow++;

                // Items con numeración reiniciada
                itemsEnUbicacion.forEach((item, index) => {
                    const numeroLocal = index + 1;
                    
                    const row = wsDetalle.addRow({
                        num: numeroLocal,
                        codigo: item.inventario_id || '',
                        deposito: item.nro_deposito || '',
                        tipo: item.tipo || '',
                        serial: item.serial !== '-----------' ? item.serial : '',
                        marca: item.marca || '',
                        modelo: item.modelo !== '-----------' ? item.modelo : '',
                        ubicacion: item.ubicacion || '',
                        responsable: item.responsable || '',
                        estado: item.status || '',
                        observaciones: item.observaciones || '',
                        evaluador: item.evaluador || '',
                        fecha: item.ultima_actualizacion 
                            ? new Date(item.ultima_actualizacion).toLocaleDateString('es-VE') 
                            : ''
                    });

                    row.height = 18;
                    const esFilaAlterna = index % 2 === 1;

                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                        cell.border = { ...bordeGenerico };
                        cell.font = { name: 'Calibri', size: 10 };
                        cell.alignment = { vertical: 'middle', wrapText: true };

                        if (esFilaAlterna) {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: colores.azulMuyClaro }
                            };
                        }

                        switch(colNumber) {
                            case 1:
                                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                                cell.font = { name: 'Calibri', size: 10, bold: true };
                                cell.fill = {
                                    type: 'pattern', pattern: 'solid',
                                    fgColor: { argb: 'FFE8F0FE' }
                                };
                                break;
                            case 2:
                                cell.font = { 
                                    name: 'Consolas', size: 10, bold: true, 
                                    color: { argb: colores.azulMedio } 
                                };
                                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                                break;
                            case 3:
                            case 5:
                            case 6:
                            case 7:
                            case 13:
                                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                                break;
                            case 10:
                                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                                cell.font = { name: 'Calibri', size: 10, bold: true };
                                
                                if (this.esOperativo(item.status)) {
                                    cell.fill = {
                                        type: 'pattern', pattern: 'solid',
                                        fgColor: { argb: colores.verdeClaro }
                                    };
                                    cell.font = { 
                                        name: 'Calibri', size: 10, bold: true, 
                                        color: { argb: colores.verdeTexto } 
                                    };
                                } else if (this.esDanado(item.status)) {
                                    cell.fill = {
                                        type: 'pattern', pattern: 'solid',
                                        fgColor: { argb: colores.rojoClaro }
                                    };
                                    cell.font = { 
                                        name: 'Calibri', size: 10, bold: true, 
                                        color: { argb: colores.rojoTexto } 
                                    };
                                }
                                break;
                        }
                    });

                    currentRow++;
                });

                // Subtotal por ubicación
                const subtotalRow = wsDetalle.getRow(currentRow);
                wsDetalle.mergeCells(`A${currentRow}:D${currentRow}`);
                
                const subtotalCell = wsDetalle.getCell(`A${currentRow}`);
                subtotalCell.value = `SUBTOTAL ${ubicacion}:`;
                subtotalCell.font = { name: 'Calibri', size: 10, bold: true, italic: true };
                subtotalCell.alignment = { horizontal: 'right', vertical: 'middle' };
                subtotalCell.fill = {
                    type: 'pattern', pattern: 'solid',
                    fgColor: { argb: colores.amarillo }
                };
                subtotalCell.border = {
                    top: { style: 'medium', color: { argb: colores.azulMedio } },
                    bottom: { style: 'thin', color: { argb: colores.grisBorde } }
                };

                wsDetalle.getCell(`E${currentRow}`).value = totalEnUbicacion;
                wsDetalle.getCell(`E${currentRow}`).font = { name: 'Calibri', size: 10, bold: true };
                wsDetalle.getCell(`E${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                wsDetalle.getCell(`E${currentRow}`).fill = {
                    type: 'pattern', pattern: 'solid',
                    fgColor: { argb: colores.amarillo }
                };
                wsDetalle.getCell(`E${currentRow}`).border = {
                    top: { style: 'medium', color: { argb: colores.azulMedio } },
                    bottom: { style: 'thin', color: { argb: colores.grisBorde } }
                };

                wsDetalle.getCell(`F${currentRow}`).value = `${operativosEnUbicacion} operativos`;
                wsDetalle.getCell(`F${currentRow}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colores.verdeTexto } };
                wsDetalle.getCell(`F${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                wsDetalle.getCell(`F${currentRow}`).fill = {
                    type: 'pattern', pattern: 'solid',
                    fgColor: { argb: colores.amarillo }
                };

                wsDetalle.getCell(`G${currentRow}`).value = `${danadosEnUbicacion} dañados`;
                wsDetalle.getCell(`G${currentRow}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colores.rojoTexto } };
                wsDetalle.getCell(`G${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
                wsDetalle.getCell(`G${currentRow}`).fill = {
                    type: 'pattern', pattern: 'solid',
                    fgColor: { argb: colores.amarillo }
                };

                subtotalRow.height = 20;
                currentRow++;

                // Fila en blanco entre ubicaciones
                currentRow++;
            });

            // TOTAL GENERAL
            const totalRow = wsDetalle.getRow(currentRow);
            wsDetalle.mergeCells(`A${currentRow}:M${currentRow}`);
            
            const totalCell = wsDetalle.getCell(`A${currentRow}`);
            totalCell.value = `📊 TOTAL GENERAL: ${totalArticulos} BIENES REGISTRADOS (${operativos} operativos - ${danados} dañados)`;
            totalCell.font = { 
                name: 'Calibri', size: 12, bold: true, 
                color: { argb: 'FFFFFFFF' } 
            };
            totalCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF10B981' }
            };
            totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
            totalCell.border = {
                top: { style: 'thick', color: { argb: 'FF10B981' } },
                left: { style: 'thick', color: { argb: 'FF10B981' } },
                bottom: { style: 'thick', color: { argb: 'FF10B981' } },
                right: { style: 'thick', color: { argb: 'FF10B981' } }
            };
            totalRow.height = 25;

            wsDetalle.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: currentRow, column: 13 }
            };

            // ============ HOJA 3: RESUMEN POR UBICACIÓN ============
            const wsUbicacion = workbook.addWorksheet('📍 Por Ubicación', {
                properties: { tabColor: { argb: 'FF10B981' } }
            });

            wsUbicacion.mergeCells('A1:E1');
            wsUbicacion.getCell('A1').value = '📍 RESUMEN POR UBICACIÓN';
            wsUbicacion.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
            wsUbicacion.getCell('A1').fill = {
                type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' }
            };
            wsUbicacion.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
            wsUbicacion.getRow(1).height = 28;

            const ubicHeaders = ['Ubicación', 'Total', 'Operativos', 'Dañados', '% Operativo'];
            const ubicHeaderRow = wsUbicacion.getRow(3);
            ubicHeaders.forEach((h, idx) => {
                const cell = ubicHeaderRow.getCell(idx + 1);
                cell.value = h;
                cell.fill = {
                    type: 'pattern', pattern: 'solid', fgColor: { argb: colores.azulClaro }
                };
                cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: colores.azulOscuro } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = bordeHeader;
            });
            ubicHeaderRow.height = 22;

            let rowNum = 4;
            Object.entries(agrupadoPorUbicacion)
                .sort((a, b) => b[1].total - a[1].total)
                .forEach(([ubic, items], idx) => {
                    const total = items.length;
                    const op = items.filter(i => this.esOperativo(i.status)).length;
                    const dan = items.filter(i => this.esDanado(i.status)).length;
                    const pctOp = total > 0 ? (op/total)*100 : 0;

                    const row = wsUbicacion.getRow(rowNum);
                    row.getCell(1).value = ubic;
                    row.getCell(2).value = total;
                    row.getCell(3).value = op;
                    row.getCell(4).value = dan;
                    row.getCell(5).value = pctOp.toFixed(1) + '%';

                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                        cell.border = bordeGenerico;
                        cell.font = { name: 'Calibri', size: 10 };
                        cell.alignment = { vertical: 'middle' };
                        
                        if (colNumber === 1) {
                            cell.font = { name: 'Calibri', size: 10, bold: true };
                        } else {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        }

                        if (colNumber === 3) {
                            cell.fill = {
                                type: 'pattern', pattern: 'solid',
                                fgColor: { argb: colores.verdeClaro }
                            };
                            cell.font = { 
                                name: 'Calibri', size: 10, bold: true, 
                                color: { argb: colores.verdeTexto } 
                            };
                        } else if (colNumber === 4) {
                            cell.fill = {
                                type: 'pattern', pattern: 'solid',
                                fgColor: { argb: colores.rojoClaro }
                            };
                            cell.font = { 
                                name: 'Calibri', size: 10, bold: true, 
                                color: { argb: colores.rojoTexto } 
                            };
                        }

                        if (idx % 2 === 1 && colNumber !== 3 && colNumber !== 4) {
                            cell.fill = {
                                type: 'pattern', pattern: 'solid',
                                fgColor: { argb: colores.azulMuyClaro }
                            };
                        }
                    });
                    
                    rowNum++;
                });

            const totalRowUbic = wsUbicacion.getRow(rowNum);
            totalRowUbic.getCell(1).value = 'TOTAL GENERAL';
            totalRowUbic.getCell(2).value = totalArticulos;
            totalRowUbic.getCell(3).value = operativos;
            totalRowUbic.getCell(4).value = danados;
            totalRowUbic.getCell(5).value = ((operativos/totalArticulos)*100).toFixed(1) + '%';

            totalRowUbic.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.fill = {
                    type: 'pattern', pattern: 'solid',
                    fgColor: { argb: colores.azulClaro }
                };
                cell.font = { 
                    name: 'Calibri', size: 11, bold: true, 
                    color: { argb: colores.azulOscuro } 
                };
                cell.border = bordeHeader;
                cell.alignment = colNumber === 1 
                    ? { horizontal: 'left', vertical: 'middle' }
                    : { horizontal: 'center', vertical: 'middle' };
            });
            totalRowUbic.height = 22;

            wsUbicacion.columns = [
                { width: 40 },
                { width: 12 },
                { width: 14 },
                { width: 12 },
                { width: 14 }
            ];

            // ============================================
            // GENERAR Y DESCARGAR
            // ============================================
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });

            let nombreArchivo = 'Inventario_UNES';
            if (this.filtroActual?.estado) nombreArchivo += `_${this.filtroActual.estado}`;
            if (this.filtroActual?.ubicacion) nombreArchivo += `_${this.filtroActual.ubicacion.replace(/\s+/g, '_')}`;
            nombreArchivo += `_${new Date().toISOString().split('T')[0]}.xlsx`;

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
                html: `
                    <div class="text-left text-sm">
                        <p><strong>📊 Hoja 1:</strong> Resumen Ejecutivo</p>
                        <p><strong>📦 Hoja 2:</strong> Inventario Detallado (${totalArticulos} registros)</p>
                        <p><strong>📍 Hoja 3:</strong> Resumen por Ubicación (${ubicaciones.length} ubicaciones)</p>
                        <p class="mt-2 text-xs text-gray-600">✨ Numeración reiniciada por ubicación</p>
                        <p class="text-xs text-gray-600">🔢 Subtotales por área</p>
                        <p class="text-xs text-gray-600"> Ordenado por Ubicación → Tipo → Código</p>
                    </div>
                `,
                timer: 4500,
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

console.log('✅ Módulo de Inventario v6.0 cargado (ExcelJS + PDF por ubicación)');
