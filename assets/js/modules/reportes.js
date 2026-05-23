/**
 * MÓDULO DE REPORTES
 * Generación de PDFs con jsPDF
 */

window.modules = window.modules || {};
window.modules.reportes = {};

/**
 * Generar reporte de asistencia en formato matriz
 */
window.modules.reportes.generarReporteMatriz = async function() {
    const pnfId = document.getElementById('select-pnf')?.value;
    const ambiente = document.getElementById('select-ambiente')?.value;
    const materiaId = document.getElementById('select-materia')?.value;
    const categoria = document.getElementById('select-categoria')?.value;
    const genero = document.getElementById('select-genero')?.value;
    const status = document.getElementById('select-status-asist')?.value;

    window.appState.procesoActual = document.getElementById('select-proceso')?.value;
    window.appState.trayectoActual = document.getElementById('select-trayecto')?.value || null;

    if (!pnfId || !ambiente || !materiaId || !window.appState.trayectoActual) {
        return Swal.fire("Atención", "Seleccione PNF, Unidad, Ambiente y Trayecto", "warning");
    }

    const selectProf = document.getElementById('select-profesor-reporte');
    const profesorIdSeleccionado = selectProf ? selectProf.value : null;
    const verTodas = window.appState.rolUsuarioActual === 'super_usuario' && document.getElementById('chk-ver-todas-asistencias')?.checked;

    let profesorIdFiltro = window.appState.usuarioActualId;
    let nombreProfesorReporte = window.appState.nombreProfesorGlobal;

    if (window.appState.rolUsuarioActual === 'super_usuario') {
        if (verTodas) {
            profesorIdFiltro = null;
            nombreProfesorReporte = "TODAS LAS ASISTENCIAS";
        } else if (profesorIdSeleccionado) {
            profesorIdFiltro = profesorIdSeleccionado;
            const opcionSeleccionada = selectProf?.options[selectProf.selectedIndex];
            nombreProfesorReporte = opcionSeleccionada ? opcionSeleccionada.text : 'Profesor';
        }
    }

    // Cargar datos
    const { data: dataPnf } = await window.supabaseClient.from('pnf').select('nombre').eq('id', pnfId).single();
    const { data: dataMateria } = await window.supabaseClient.from('unidades_curriculares').select('nombre').eq('id', materiaId).single();
    
    const tiposTrayectos = window.appState.tiposTrayectos || [];
    const trayectoSeleccionado = tiposTrayectos.find(t => t.id === window.appState.trayectoActual);
    const nombreTrayecto = trayectoSeleccionado?.nombre || 'Trayecto';

    // Consultar estudiantes
    let queryEst = window.supabaseClient
        .from('estudiantes')
        .select('*, status')
        .eq('pnf_id', pnfId)
        .eq('ambiente', ambiente)
        .eq('proceso', window.appState.procesoActual)
        .eq('trayecto_id', window.appState.trayectoActual)
        .order('numero_lista');

    if (categoria) queryEst = queryEst.eq('categoria', categoria);
    if (genero) queryEst = queryEst.eq('genero', genero);
    if (status) queryEst = queryEst.eq('status', status);

    const { data: estudiantes, error: errorEst } = await queryEst;
    if (errorEst) console.error('Error cargando estudiantes:', errorEst);

    // Consultar asistencias
    let queryAsist = window.supabaseClient.from('asistencias').select('*')
        .eq('unidad_curricular_id', materiaId)
        .eq('ambiente_registro', ambiente)
        .eq('proceso', window.appState.procesoActual);

    if (profesorIdFiltro) queryAsist = queryAsist.eq('profesor_id', profesorIdFiltro);

    const { data: asistencias, error: errorAsist } = await queryAsist.order('fecha');
    if (errorAsist) console.error('Error cargando asistencias:', errorAsist);

    // Procesar datos
    const fechasUnicas = [...new Set((asistencias || []).map(a => a.fecha))].sort();
    const mapaAsistencias = {};
    (asistencias || []).forEach(a => { mapaAsistencias[`${a.estudiante_id}_${a.fecha}`] = a.estado; });

    const totalesPresentes = new Array(fechasUnicas.length).fill(0);
    const totalesAusentes = new Array(fechasUnicas.length).fill(0);

    const bodyTabla = (estudiantes || []).map(est => {
        const filaBase = [est.numero_lista, est.cedula, `${est.nombres} ${est.apellidos}`.toUpperCase()];
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
        filaCompleta.isInactive = (est.status === 'Inactivo');
        return filaCompleta;
    });

    // Generar PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });

    doc.setFontSize(11).setFont(undefined, 'bold').text(`UNIVERSIDAD NACIONAL EXPERIMENTAL DE LA SEGURIDAD`, 140, 10, { align: 'center' });
    doc.setFontSize(8).setFont(undefined, 'normal').text(`PNF: ${dataPnf?.nombre || ''} - AMBIENTE: ${ambiente} - PROCESO: ${window.appState.procesoActual} - ${nombreTrayecto}`, 140, 15, { align: 'center' });
    doc.setFont(undefined, 'bold').text(`UNIDAD: ${dataMateria?.nombre || ''} - PROFESOR: ${nombreProfesorReporte.toUpperCase()}`, 140, 20, { align: 'center' });

    const cabeceras = ["N°", "CÉDULA", "NOMBRES Y APELLIDOS", ...fechasUnicas.map(f => f.split('-').reverse().slice(0, 2).join('/')), "P", "A", "%"];

    doc.autoTable({
        startY: 25,
        margin: { left: 10, right: 10 },
        head: [cabeceras],
        body: bodyTabla,
        foot: [
            [{ content: 'TOTAL PRESENTES', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [210, 245, 210], textColor: [0, 0, 0] } }, ...totalesPresentes.map(t => ({ content: t, styles: { fillColor: [210, 245, 210], textColor: [0, 0, 0] } })), '', '', ''],
            [{ content: 'TOTAL AUSENTES', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [250, 230, 230], textColor: [0, 0, 0] } }, ...totalesAusentes.map(t => ({ content: t, styles: { fillColor: [250, 230, 230], textColor: [0, 0, 0] } })), '', '', '']
        ],
        theme: 'grid',
        styles: { fontSize: 6.5, cellPadding: 0.5, valign: 'middle', halign: 'center', lineWidth: 0.1 },
        headStyles: {
            fillColor: [220, 235, 245],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            minCellHeight: 8,
            valign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 7 }, 1: { cellWidth: 18 }, 2: { cellWidth: 65, halign: 'left', fontStyle: 'bold' },
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

    const unidadNombre = dataMateria?.nombre?.split(' ')[0].toUpperCase() || "REPORTE";
    doc.save(`Asistencia ${unidadNombre} ${window.appState.procesoActual} ${nombreTrayecto} AMB${ambiente}.pdf`);
    Swal.fire("Éxito", `Reporte generado para ${window.appState.procesoActual} - ${nombreTrayecto}`, "success");
};

// Exportar función al scope global
window.generarReporteMatriz = window.modules.reportes.generarReporteMatriz;

console.log('✅ Módulo de reportes cargado');