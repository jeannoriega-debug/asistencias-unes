window.components = window.components || {};
window.components.tablas = {};

window.components.tablas.renderizarListaEstudiantes = function () {
    const container = document.getElementById('estudiantes-body');
    const listaContenedor = document.getElementById('lista-contenedor');
    if (!container) return;

    const estudiantes = window.appState.estudiantesActuales || [];

    // 📊 Calcular totales dinámicamente
    const activos = estudiantes.filter(e => e.status === 'Activo').length;
    const bajas = estudiantes.filter(e => e.status !== 'Activo').length;
    const total = estudiantes.length;

    // 🔄 Actualizar contadores en el DOM
    const elActivos = document.getElementById('count-activos');
    const elBajas = document.getElementById('count-bajas');
    const elTotal = document.getElementById('count-total');
    if (elActivos) elActivos.textContent = activos;
    if (elBajas) elBajas.textContent = bajas;
    if (elTotal) elTotal.textContent = total;

    container.innerHTML = '';

    if (estudiantes.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-gray-500">No se encontraron estudiantes con estos filtros</div>';
        if (listaContenedor) listaContenedor.classList.remove('hidden');
        return;
    }

    estudiantes.forEach(est => {
        const esActivo = est.status === 'Activo';
        const row = document.createElement('div');
        // ✅ Layout en una sola fila (móvil y desktop)
        row.className = `p-3 flex flex-row items-center justify-between gap-2 border-b last:border-0 ${!esActivo ? 'bg-gray-100 opacity-60' : 'bg-white hover:bg-gray-50 transition'}`;

        // Información del estudiante (lado izquierdo)
        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-1 min-w-0';
        infoDiv.innerHTML = `
            <div class="font-bold text-gray-800 text-xs md:text-sm truncate">${est.nombres || ''} ${est.apellidos || ''}</div>
            <div class="text-xs text-gray-500 mt-0.5">Cédula: ${est.cedula || 'N/A'} | Lista: ${est.numero_lista || 'N/A'}</div>
        `;

        // Botones o Estado de Baja (lado derecho)
        const btnDiv = document.createElement('div');
        btnDiv.className = 'flex gap-1 shrink-0';

        if (esActivo) {
            // Botón P (gris por defecto)
            const btnP = document.createElement('button');
            btnP.textContent = 'P';
            btnP.className = 'bg-gray-300 hover:bg-gray-400 text-gray-700 w-8 h-8 rounded-lg font-bold text-xs transition shadow-sm flex items-center justify-center';
            btnP.onclick = function () {
                btnP.className = 'bg-green-500 hover:bg-green-600 text-white w-8 h-8 rounded-lg font-bold text-xs transition shadow-sm flex items-center justify-center';
                btnA.className = 'bg-gray-300 hover:bg-gray-400 text-gray-700 w-8 h-8 rounded-lg font-bold text-xs transition shadow-sm flex items-center justify-center';
                window.modules.asistencia.marcarAsistencia(est.id, 'P', btnP);
            };

            // Botón A (gris por defecto)
            const btnA = document.createElement('button');
            btnA.textContent = 'A';
            btnA.className = 'bg-gray-300 hover:bg-gray-400 text-gray-700 w-8 h-8 rounded-lg font-bold text-xs transition shadow-sm flex items-center justify-center';
            btnA.onclick = function () {
                btnA.className = 'bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-lg font-bold text-xs transition shadow-sm flex items-center justify-center';
                btnP.className = 'bg-gray-300 hover:bg-gray-400 text-gray-700 w-8 h-8 rounded-lg font-bold text-xs transition shadow-sm flex items-center justify-center';
                window.modules.asistencia.marcarAsistencia(est.id, 'A', btnA);
            };

            btnDiv.appendChild(btnP);
            btnDiv.appendChild(btnA);
        } else {
            // Estudiante de Baja
            const spanBaja = document.createElement('span');
            spanBaja.textContent = '⛔';
            spanBaja.title = 'Baja';
            spanBaja.className = 'text-gray-500 text-lg font-semibold cursor-not-allowed w-8 h-8 flex items-center justify-center';
            btnDiv.appendChild(spanBaja);
        }

        row.appendChild(infoDiv);
        row.appendChild(btnDiv);
        container.appendChild(row);
    });

    if (listaContenedor) listaContenedor.classList.remove('hidden');
};

console.log('✅ Componente de tablas optimizado para móviles');