/**
 * MÓDULO DE REPORTES
 * Generación de reportes en PDF con fechas en hora Venezuela
 */

window.modules = window.modules || {};
window.modules.reportes = {};

window.modules.reportes.generarReporteMatriz = async function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // 🇻 Fecha del reporte en hora Venezuela
    const fechaReporte = window.utils.getFechaHoraVenezuela();
    
    // Obtener valores de los selects
    const selectPnf = document.getElementById('select-pnf');
    const selectProceso = document.getElementById('select-proceso');
    const selectTrayecto = document.getElementById('select-trayecto');
    const selectAmbiente = document.getElementById('select-ambiente');
    const selectMateria = document.getElementById('select-materia');
    
    const pnfNombre = selectPnf?.options[selectPnf.selectedIndex]?.text || 'N/A';
    const procesoNombre = selectProceso?.value || 'N/A';
    const ambienteNombre = selectAmbiente?.value ? `Ambiente ${selectAmbiente.value}` : 'N/A';
    const materiaNombre = selectMateria?.options[selectMateria.selectedIndex]?.text || 'N/A';
    
    // ✅ Obtener nombre COMPLETO del trayecto desde tipos_trayecto
    let trayectoNombre = 'N/A';
    const trayectoId = selectTrayecto?.value;
    if (trayectoId && window.appState.tiposTrayectos) {
        const trayecto = window.appState.tiposTrayectos.find(t => t.id === trayectoId);
        if (trayecto) {
            trayectoNombre = trayecto.nombre; // Ej: "Trayecto Inicial"
        }
    } else if (trayectoId) {
        // Si no está en appState, consultar desde Supabase
        const { data } = await window.supabaseClient
            .from('tipos_trayecto')
            .select('nombre')
            .eq('id', trayectoId)
            .single();
        if (data?.nombre) {
            trayectoNombre = data.nombre;
        }
    }
    
    // Título principal
    doc.setFontSize(16);
    doc.text('UNIVERSIDAD NACIONAL EXPERIMENTAL DE LA SEGURIDAD', 105, 15, { align: 'center' });
    
    // Información del filtro - Línea 1
    doc.setFontSize(10);
    const linea1 = `PNF: ${pnfNombre} - AMBIENTE: ${ambienteNombre} - PROCESO: ${procesoNombre} - ${trayectoNombre}`;
    doc.text(linea1, 105, 25, { align: 'center' });
    
    // Información del filtro - Línea 2
    const linea2 = `UNIDAD: ${materiaNombre} - PROFESOR: ${window.appState.nombreProfesorGlobal || 'N/A'}`;
    doc.text(linea2, 105, 32, { align: 'center' });
    
    // 🇻🇪 Fecha y hora de generación
    doc.setFontSize(9);
    doc.text(`Reporte generado: ${fechaReporte}`, 105, 40, { align: 'center' });
    
    // Línea divisoria
    doc.setLineWidth(0.5);
    doc.line(14, 45, 196, 45);
    
    // Tabla de estudiantes
    const estudiantes = window.appState.estudiantesActuales || [];
    
    if (estudiantes.length === 0) {
        doc.setFontSize(12);
        doc.text('No hay estudiantes cargados', 105, 65, { align: 'center' });
    } else {
        const tableColumn = ['N°', 'Estudiante', 'Cédula', 'Estado'];
        const tableRows = [];
        
        estudiantes.forEach((est, index) => {
            const row = [
                index + 1,
                `${est.nombres || ''} ${est.apellidos || ''}`,
                est.cedula || 'N/A',
                est.status === 'Activo' ? '✅ Activo' : '❌ Baja'
            ];
            tableRows.push(row);
        });
        
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 50,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 9 }
        });
    }
    
    // Pie de página
    const finalY = doc.lastAutoTable.finalY || 70;
    doc.setFontSize(9);
    doc.text(`Generado el ${fechaReporte}`, 105, finalY + 10, { align: 'center' });
    doc.text('Sistema de Asistencia PNF - UNES', 105, finalY + 15, { align: 'center' });
    
    // ✅ Generar nombre de archivo COMPLETO
    // Ej: "Asistencia TECNOLOGÍAS I-2026 Trayecto Inicial AMB2.pdf"
    const materiaCorta = materiaNombre.split(' ')[0]?.toUpperCase() || 'MATERIA';
    const nombreArchivo = `Asistencia ${materiaCorta} ${procesoNombre} ${trayectoNombre} ${ambienteNombre.replace('Ambiente ', 'AMB')}.pdf`;
    
    // Guardar
    doc.save(nombreArchivo);
    
    console.log('✅ Reporte generado:', {
        fecha: fechaReporte,
        trayecto: trayectoNombre,
        archivo: nombreArchivo
    });
};

console.log('✅ Módulo de reportes cargado');
