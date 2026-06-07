/**
 * MÓDULO DE INVENTARIO UNES
 * Versión: 1.0 - CRUD completo con reporte PDF
 */

window.modules = window.modules || {};
window.modules.inventario = {
    datosCache: [],
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
            this.actualizarEstadisticas();
            this.renderizarTabla(this.datosCache);
            this.cargarFiltroUbicaciones();

            console.log('✅ Inventario cargado:', this.datosCache.length, 'artículos');

        } catch (e) {
            console.error(' Error cargando inventario:', e);
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
                    <td class="p-3 text-xs text-gray-600">${item.serial !== '-----------' ? item.serial : '-'}</td>
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
                (item.responsable && item.responsable.toLowerCase().includes(texto));
            
            const matchEstado = !estado || item.status === estado;
            const matchUbicacion = !ubicacion || item.ubicacion === ubicacion;

            return matchTexto && matchEstado && matchUbicacion;
        });

        this.renderizarTabla(filtrados);
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
                // UPDATE
                result = await window.supabaseClient
                    .from('inventario_unes')
                    .update(datos)
                    .eq('id', id);
            } else {
                // INSERT
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
            // Soft delete (marcar como inactivo)
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
    // GENERAR REPORTE PDF
    // ============================================
    generarReportePDF: function() {
        if (this.datosCache.length === 0) {
            Swal.fire('Atención', 'No hay datos para generar el reporte', 'warning');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });

        // Encabezado
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('UNIVERSIDAD NACIONAL EXPERIMENTAL DE LA SEGURIDAD', 140, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text('REPORTE DE INVENTARIO', 140, 22, { align: 'center' });
        
        const fechaGeneracion = new Date().toLocaleDateString('es-VE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`Generado: ${fechaGeneracion}`, 140, 28, { align: 'center' });

        // Tabla
        const headers = [['Código', 'Tipo/Descripción', 'Serial', 'Marca', 'Modelo', 'Ubicación', 'Responsable', 'Estado']];
        
        const rows = this.datosCache.map(item => [
            item.inventario_id || '-',
            item.tipo || '-',
            item.serial !== '-----------' ? item.serial : '-',
            item.marca || '-',
            item.modelo !== '-----------' ? item.modelo : '-',
            item.ubicacion || '-',
            item.responsable || '-',
            item.status
        ]);

        doc.autoTable({
            startY: 35,
            margin: { left: 10, right: 10 },
            head: headers,
            body: rows,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1, valign: 'middle' },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 60 },
                2: { cellWidth: 25 },
                3: { cellWidth: 20 },
                4: { cellWidth: 20 },
                5: { cellWidth: 30 },
                6: { cellWidth: 30 },
                7: { cellWidth: 15 }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 7) {
                    const estado = data.cell.raw;
                    if (estado === 'OPERATIVO') {
                        data.cell.styles.fillColor = [210, 245, 210];
                        data.cell.styles.textColor = [0, 100, 0];
                    } else {
                        data.cell.styles.fillColor = [250, 230, 230];
                        data.cell.styles.textColor = [150, 0, 0];
                    }
                }
            }
        });

        // Resumen al final
        const finalY = doc.lastAutoTable.finalY + 10;
        const operativos = this.datosCache.filter(i => i.status === 'OPERATIVO').length;
        const danados = this.datosCache.filter(i => i.status === 'Dañado').length;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total: ${this.datosCache.length} artículos`, 15, finalY);
        doc.text(`Operativos: ${operativos}`, 15, finalY + 5);
        doc.text(`Dañados: ${danados}`, 15, finalY + 10);

        const filename = `Inventario_UNES_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);

        Swal.fire({
            icon: 'success',
            title: '✅ Reporte Generado',
            text: `Se generó el reporte con ${this.datosCache.length} artículos`,
            timer: 2500,
            showConfirmButton: false
        });
    },

    // ============================================
    // EXPORTAR EXCEL
    // ============================================
    exportarExcel: function() {
        if (this.datosCache.length === 0) {
            Swal.fire('Atención', 'No hay datos para exportar', 'warning');
            return;
        }

        const datos = this.datosCache.map(item => ({
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

        const ws = XLSX.utils.json_to_sheet(datos);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

        const filename = `Inventario_UNES_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);

        Swal.fire({
            icon: 'success',
            title: '✅ Excel Exportado',
            text: `Se exportaron ${this.datosCache.length} registros`,
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

console.log('✅ Módulo de Inventario cargado');
