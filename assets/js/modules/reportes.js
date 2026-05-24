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
    
    const pnf = document.getElementById('select-pnf');
    const proceso = document.getElementById('select-proceso');
    const materia = document.getElementById('select-materia');
    
    const pnfNombre = pnf?.options[pnf.selectedIndex]?.text || 'N/A';
    const procesoNombre = proceso?.value || 'N/A';
    const materiaNombre = materia?.options[materia.selectedIndex]?.text || 'N/A';
    
    // Título
    doc.setFontSize(16);
    doc.text('REPORTE DE ASISTENCIA - PNF', 105, 20, { align: 'center' });
    
    // Información del filtro
    doc.setFontSize(11);
    doc.text(`PNF: ${pnfNombre}`, 14, 35);
    doc.text(`Proceso: ${procesoNombre}`, 14, 42);
    doc.text(`Unidad Curricular: ${materiaNombre}`, 14, 49);
    doc.text(`Generado: ${fechaReporte}`, 14, 56);
    
    // Línea divisoria
    doc.setLineWidth(0.5);
    doc.line(14, 60, 196, 60);
    
    // Tabla de estudiantes
    const estudiantes = window.appState.estudiantesActuales || [];
    
    if (estudiantes.length === 0) {
        doc.setFontSize(12);
        doc.text('No hay estudiantes cargados', 105, 80, { align: 'center' });
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
            startY: 65,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 9 }
        });
    }
    
    // Pie de página
    const finalY = doc.lastAutoTable.finalY || 70;
    doc.setFontSize(9);
    doc.text(`Reporte generado el ${fechaReporte}`, 105, finalY + 10, { align: 'center' });
    doc.text('Sistema de Asistencia PNF - UNES', 105, finalY + 15, { align: 'center' });
    
    // Guardar
    const nombreArchivo = `asistencia_${pnfNombre.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    doc.save(nombreArchivo);
    
    console.log('✅ Reporte generado con fecha Venezuela:', fechaReporte);
};

console.log('✅ Módulo de reportes cargado');
