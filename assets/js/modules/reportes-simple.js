/**
 * MÓDULO DE REPORTES - VERSIÓN SIMPLIFICADA
 * Para profesores con interfaz simplificada
 * Basado en el reporte original con todas las características
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
            title: '¿Generar Reporte Matriz?',
            html: `
                <div class="text-left text-sm">
                    <p><strong>PNF:</strong> ${asignacion.pnf?.nombre || 'N/A'}</p>
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
            ambiente: asignacion.ambiente,
            totalEstudiantes: estudiantes.length
        });

        // Cargar datos adicionales de la BD
        const { data: dataPnf } = await window.supabaseClient
            .from('pnf')
            .select('nombre')
            .eq('id', asignacion.pnf?.id)
            .single();

        const { data: dataMateria } = await window.supabaseClient
            .from('unidades_curriculares')
            .select('nombre')
            .eq('id', asignacion.unidad_id)
            .single();

        // Consultar asistencias
        const { data: asistencias, error: errorAsist } = await window.supabaseClient
            .from('asistencias')
            .select('*')
            .eq('unidad_curricular_id', asignacion.unidad_id)
            .eq('ambiente_registro', asignacion.ambiente)
            .eq('proceso', asignacion.proceso)
            .eq('profesor_id', window.appState.usuarioActualId)
            .order('fecha');

        if (errorAsist) {
            console.error('❌ Error cargando asistencias:', errorAsist);
        }

        // Procesar datos
        const fechasUnicas = [...new Set((asistencias || []).map(a => a.fecha))].sort();
        const mapaAsistencias = {};
        
        (asistencias || []).forEach(a => {
            mapaAsistencias[`${a.estudiante_id}_${a.fecha}`] = a.estado;
        });

        const totalesPresentes = new Array(fechasUnicas.length).fill(0);
        const totalesAusentes = new Array(fechasUnicas.length).fill(0);

        const bodyTabla = estudiantes.map(est => {
            const filaBase = [
                est.numero_lista,
                est.cedula,
                `${est.nombres} ${est.apellidos}`.toUpperCase()
            ];
            
            const datosAsistencia = fechasUnicas.map((fecha, idx) => {
                const estado = mapaAsistencias[`${est.id}_${fecha}`] || '-';
                if (estado === 'P') totalesPresentes[idx]++;
                if (estado === 'A') totalesAusentes[idx]++;
                return estado;
            });
            
            const p = datosAsistencia.filter(e => e === 'P').length;
            const a = datosAsistencia.filter(e => e === 'A').length;
            const porcentaje = (p + a > 0 ? ((p / (p + a)) * 100).toFixed(0) + '%' : '0%');

            const filaCompleta = [...filaBase, ...datosAsistencia, p, a, porcentaje];
            filaCompleta.isInactive = (est.status === 'Inactivo' || est.status === 'Baja');
            return filaCompleta;
        });

        // ================= GENERAR PDF =================
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });

        // --- ENCABEZADO (IDÉNTICO AL ORIGINAL) ---
        // Línea 1: Universidad (centrado)
        doc.setFontSize(11).setFont(undefined, 'bold').text(
            `UNIVERSIDAD NACIONAL EXPERIMENTAL DE LA SEGURIDAD`, 
            140, 10, { align: 'center' }
        );
        
        // Línea 2: PNF - PROCESO - TRAYECTO - AMBIENTE
        const pnfNombre = (dataPnf?.nombre || asignacion.pnf?.nombre || 'PNF').toUpperCase();
        const procesoNombre = asignacion.proceso || 'PROCESO';
        const trayectoNombre = asignacion.trayecto?.nombre || 'Trayecto';
        const ambienteTexto = `AMB${asignacion.ambiente}`;
        
        doc.setFontSize(8).setFont(undefined, 'normal').text(
            `PNF: ${pnfNombre} - PROCESO: ${procesoNombre} - ${trayectoNombre} - AMBIENTE: ${asignacion.ambiente}`, 
            140, 15, { align: 'center' }
        );
        
        // Línea 3: Unidad Curricular - Profesor
        const nombreProfesor = window.appState.nombreProfesorGlobal || 'PROFESOR';
        doc.setFont(undefined, 'bold').text(
            `UNIDAD: ${dataMateria?.nombre || asignacion.unidad?.nombre || ''} - PROFESOR: ${nombreProfesor.toUpperCase()}`, 
            140, 20, { align: 'center' }
        );
        
        // Línea 4: Fecha y hora de generación
        const ahora = new Date();
        const fechaFormateada = ahora.toLocaleDateString('es-VE', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        }).replace(',', ' -');
        
        doc.setFontSize(7).setFont(undefined, 'italic').text(
            `Generado: ${fechaFormateada}`, 
            140, 25, { align: 'center' }
        );

        // Cabeceras de la tabla
        const cabeceras = [
            "N°", 
            "CÉDULA", 
            "NOMBRES Y APELLIDOS", 
            ...fechasUnicas.map(f => f.split('-').reverse().slice(0, 2).join('/')), 
            "P", 
            "A", 
            "%"
        ];

        // ================= MATRIZ DE ASISTENCIA =================
        doc.autoTable({
            startY: 30,
            margin: { left: 10, right: 10 },
            head: [cabeceras],
            body: bodyTabla,
            foot: [
                [
                    { 
                        content: 'TOTAL PRESENTES', 
                        colSpan: 3, 
                        styles: { halign: 'right', fontStyle: 'bold', fillColor: [210, 245, 210], textColor: [0, 0, 0] } 
                    }, 
                    ...totalesPresentes.map(t => ({ 
                        content: t, 
                        styles: { fillColor: [210, 245, 210], textColor: [0, 0, 0] } 
                    })), 
                    '', 
                    '', 
                    ''
                ],
                [
                    { 
                        content: 'TOTAL AUSENTES', 
                        colSpan: 3, 
                        styles: { halign: 'right', fontStyle: 'bold', fillColor: [250, 230, 230], textColor: [0, 0, 0] } 
                    }, 
                    ...totalesAusentes.map(t => ({ 
                        content: t, 
                        styles: { fillColor: [250, 230, 230], textColor: [0, 0, 0] } 
                    })), 
                    '', 
                    '', 
                    ''
                ]
            ],
            theme: 'grid',
            styles: { 
                fontSize: 6.5, 
                cellPadding: 0.5, 
                valign: 'middle', 
                halign: 'center', 
                lineWidth: 0.1 
            },
            headStyles: {
                fillColor: [220, 235, 245],
                textColor: [0, 0, 0],
                fontStyle: 'bold',
                minCellHeight: 8,
                valign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 7 },
                1: { cellWidth: 18 },
                2: { cellWidth: 65, halign: 'left', fontStyle: 'bold' },
                ...Object.fromEntries(fechasUnicas.map((_, i) => [i + 3, { cellWidth: 4.1 }])),
                [cabeceras.length - 3]: { cellWidth: 7, fontStyle: 'bold' },
                [cabeceras.length - 2]: { cellWidth: 7, fontStyle: 'bold' },
                [cabeceras.length - 1]: { cellWidth: 10, fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    const rowData = data.row.raw;
                    if (rowData.isInactive) {
                        data.cell.styles.fillColor = [240, 240, 240];
                        data.cell.styles.textColor = [100, 100, 100];
                    }
                }
                if (data.section === 'head' && data.column.index >= 3 && data.column.index < (cabeceras.length - 3)) {
                    data.cell.text = [""];
                }
                if (data.section === 'foot' && data.column.index >= (cabeceras.length - 3)) {
                    data.cell.styles.fillColor = [255, 255, 255];
                }
            },
            didDrawCell: (data) => {
                if (data.section === 'head' && data.column.index >= 3 && data.column.index < (cabeceras.length - 3)) {
                    const texto = cabeceras[data.column.index];
                    doc.saveGraphicsState();
                    const x = data.cell.x + (data.cell.width / 2) + 3.0;
                    const y = data.cell.y + data.cell.height - 2;
                    doc.setFontSize(6).setFont(undefined, 'bold');
                    doc.text(texto, x, y, { angle: 90, align: 'center', baseline: 'middle' });
                    doc.restoreGraphicsState();
                }
            }
        });

        // ================= NOMBRE DEL PDF =================
        const pnfPdf = (dataPnf?.nombre || asignacion.pnf?.nombre || "PNF").toUpperCase().trim();
        const unidadPdf = (dataMateria?.nombre || asignacion.unidad?.nombre || "UNIDAD").split(' ')[0].toUpperCase();
        const procesoPdf = asignacion.proceso || "PROCESO";
        const ambientePdf = `AMB${asignacion.ambiente}`;
        const profesorPdf = nombreProfesor.toUpperCase().trim().replace(/\s+/g, '_');
        
        const filename = `Asistencia ${pnfPdf} ${unidadPdf} ${procesoPdf} ${ambientePdf} ${profesorPdf}.pdf`;

        // ================= MÉTODO DE DESCARGA =================
        if (esChromeAndroid) {
            // Chrome en Android: Usar blob y descarga directa
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
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
            doc.save(filename);
            
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

// Exportar función al scope global
window.generarReporteMatrizSimple = window.modules.reportesSimple.generarReporteMatriz;

console.log('✅ Reportes Simple JS cargado - Versión completa con matriz de asistencia');
