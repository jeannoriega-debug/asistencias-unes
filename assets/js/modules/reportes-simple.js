/**
 * MÓDULO DE REPORTES - VERSIÓN SIMPLIFICADA
 * Para profesores con interfaz simplificada
 */

window.modules = window.modules || {};
window.modules.reportesSimple = {};

/**
 * Generar Reporte Matriz desde la vista simplificada
 * Usa los datos ya cargados en appState
 */
window.modules.reportesSimple.generarReporteMatriz = async function() {
    try {
        // Verificar que existan datos
        if (!window.appState.estudiantesActuales || window.appState.estudiantesActuales.length === 0) {
            Swal.fire('Atención', 'No hay estudiantes cargados para generar el reporte', 'warning');
            return;
        }

        const asignacion = window.appState.asignacionActual;
        const estudiantes = window.appState.estudiantesActuales;

        if (!asignacion) {
            Swal.fire('Error', 'No hay información de la asignación', 'error');
            return;
        }

        // Detectar si es dispositivo móvil
        const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const esChromeAndroid = esMovil && /Chrome/i.test(navigator.userAgent) && !/Edge/i.test(navigator.userAgent);

        // Confirmar generación
        const { isConfirmed } = await Swal.fire({
            title: '¿Generar Reporte?',
            html: `
                <div class="text-left text-sm">
                    <p><strong>Unidad:</strong> ${asignacion.unidad?.nombre || 'N/A'}</p>
                    <p><strong>Proceso:</strong> ${asignacion.proceso || 'N/A'}</p>
                    <p><strong>Ambiente:</strong> ${asignacion.ambiente || 'N/A'}</p>
                    <p><strong>Total estudiantes:</strong> ${estudiantes.length}</p>
                    ${esChromeAndroid ? '<p class="text-yellow-600 mt-2"><i class="fas fa-info-circle"></i> Se descargará directamente</p>' : ''}
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '✅ Sí, generar PDF',
            cancelButtonText: '❌ Cancelar'
        });

        if (!isConfirmed) return;

        console.log('📊 Generando reporte matriz simplificado:', {
            pnf: asignacion.pnf?.nombre,
            unidad: asignacion.unidad?.nombre,
            proceso: asignacion.proceso,
            trayecto: asignacion.trayecto?.nombre,
            ambiente: asignacion.ambiente,
            totalEstudiantes: estudiantes.length,
            esMovil,
            esChromeAndroid
        });

        // Crear documento PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter',
            margins: {
                top: 15,
                bottom: 15,
                left: 15,
                right: 15
            }
        });

        // Encabezado
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE ASISTENCIA - MATRIZ', 105, 20, { align: 'center' });

        // Información de la asignación
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`PNF: ${asignacion.pnf?.nombre || 'N/A'}`, 15, 30);
        doc.text(`Unidad Curricular: ${asignacion.unidad?.nombre || 'N/A'}`, 15, 35);
        doc.text(`Proceso: ${asignacion.proceso || 'N/A'}`, 15, 40);
        doc.text(`Trayecto: ${asignacion.trayecto?.nombre || 'N/A'}`, 15, 45);
        doc.text(`Ambiente: ${asignacion.ambiente || 'N/A'}`, 15, 50);
        doc.text(`Categoría: ${asignacion.categoria || 'N/A'}`, 15, 55);

        // Fecha de generación
        const fechaGeneracion = new Date().toLocaleDateString('es-VE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(`Generado: ${fechaGeneracion}`, 15, 62);

        // Línea separadora
        doc.setLineWidth(0.5);
        doc.line(15, 65, 200, 65);

        // Tabla de estudiantes
        const headers = [['N°', 'Cédula', 'Nombre', 'Lista', 'Estado']];
        
        const rows = estudiantes.map((est, index) => [
            (index + 1).toString(),
            est.cedula || 'N/A',
            `${est.nombres || ''} ${est.apellidos || ''}`.trim() || 'N/A',
            est.numero_lista?.toString() || '-',
            est.status === 'Activo' ? '✅ Activo' : '❌ Inactivo'
        ]);

        doc.autoTable({
            head: headers,
            body: rows,
            startY: 70,
            theme: 'grid',
            fontSize: 8,
            margin: { left: 15, right: 15 },
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: {
                cellPadding: 2,
                fontSize: 8,
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 90 },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 25, halign: 'center' }
            }
        });

        // Resumen al final
        const finalY = doc.lastAutoTable.finalY + 10;
        const activos = estudiantes.filter(e => e.status === 'Activo').length;
        const bajas = estudiantes.filter(e => e.status === 'Inactivo' || e.status === 'Baja').length;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Estudiantes: ${estudiantes.length}`, 15, finalY);
        doc.text(`Activos: ${activos}`, 15, finalY + 5);
        doc.text(`Bajas: ${bajas}`, 15, finalY + 10);

        // Pie de página
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`Página ${i} de ${pageCount}`, 105, 280, { align: 'center' });
        }

        // Nombre del archivo
        const nombreArchivo = `Matriz_${(asignacion.unidad?.nombre || 'Asistencia').replace(/[^a-zA-Z0-9]/g, '_')}_${asignacion.proceso || ''}_${new Date().toISOString().split('T')[0]}.pdf`;

        // ✅ MÉTODO DE DESCARGA SEGÚN EL NAVEGADOR
        if (esChromeAndroid) {
            // Chrome en Android: Usar blob y descarga directa
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            
            // Crear enlace temporal y hacer clic
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Limpiar URL después de un tiempo
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            Swal.fire({
                icon: 'success',
                title: '✅ Reporte Descargado',
                text: `Se descargó el reporte con ${estudiantes.length} estudiantes`,
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            // Otros navegadores: Usar save() normal
            doc.save(nombreArchivo);
            
            Swal.fire({
                icon: 'success',
                title: '✅ Reporte Generado',
                text: `Se generó el reporte con ${estudiantes.length} estudiantes`,
                timer: 2500,
                showConfirmButton: false
            });
        }

    } catch (error) {
        console.error('❌ Error generando reporte:', error);
        Swal.fire('Error', 'No se pudo generar el reporte: ' + error.message, 'error');
    }
};
console.log('✅ Reportes Simple JS cargado');
