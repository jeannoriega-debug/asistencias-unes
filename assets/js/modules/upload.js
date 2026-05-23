/**
 * MÓDULO DE CARGA MASIVA (CSV)
 */

window.modules = window.modules || {};
window.modules.upload = {};

let datosCSVValidados = [];

/**
 * Descargar plantilla de ejemplo
 */
window.modules.upload.descargarPlantillaCSV = function() {
    const headers = ['cedula', 'fecha_nacimiento', 'nombres', 'apellidos', 'genero', 'categoria', 'numero_lista', 'ambiente', 'proceso', 'status', 'pnf_id'];
    const ejemplos = ['V-12345678;2000-01-01;JUAN;PEREZ;Masculino;TSU;1;1;I-2026;Activo;ID_PNF'];
    const contenido = [headers.join(';'), ejemplos.join(';')].join('\n');
    const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'plantilla_estudiantes.csv';
    link.click();
};

/**
 * Limpiar interfaz de carga
 */
window.modules.upload.limpiarCargaMasiva = function() {
    document.getElementById('csv-file').value = '';
    document.getElementById('carga-masiva-status').classList.add('hidden');
    datosCSVValidados = [];
};

/**
 * Procesar archivo CSV subido
 */
window.modules.upload.procesarCSV = async function(input) {
    const file = input.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('carga-masiva-status');
    statusDiv.classList.remove('hidden');
    document.getElementById('carga-progreso-texto').textContent = '📖 Leyendo archivo...';
    document.getElementById('carga-resultados').innerHTML = '';

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const lineas = e.target.result.split(/\r\n|\n/).filter(l => l.trim());
            if (lineas.length < 2) return Swal.fire('Error', 'CSV vacío', 'error');

            const delimitador = lineas[0].includes(';') ? ';' : ',';
            const encabezados = lineas[0].split(delimitador).map(h => h.trim().toLowerCase());
            
            datosCSVValidados = [];
            const errores = [];

            // Obtener ID de PNF por defecto si no se provee en el CSV (ajusta según necesidad)
            // Aquí asumimos que el CSV trae el pnf_id como texto o ID
            
            for (let i = 1; i < lineas.length; i++) {
                const cols = lineas[i].split(delimitador).map(c => c.trim());
                const fila = {};
                encabezados.forEach((h, idx) => fila[h] = cols[idx] || '');

                if (!fila.cedula || !fila.nombres || !fila.apellidos) {
                    errores.push(`Fila ${i}: Datos incompletos`);
                    continue;
                }

                // Formatear fecha si es DD/MM/YYYY
                let fechaNac = fila.fecha_nacimiento;
                if (fila.fecha_nacimiento.includes('/')) {
                    const p = fila.fecha_nacimiento.split('/');
                    fechaNac = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
                }

                datosCSVValidados.push({
                    cedula: fila.cedula.toUpperCase(),
                    fecha_nacimiento: fechaNac,
                    nombres: fila.nombres.toUpperCase(),
                    apellidos: fila.apellidos.toUpperCase(),
                    genero: fila.genero || null,
                    categoria: fila.categoria || null,
                    numero_lista: parseInt(fila.numero_lista) || null,
                    ambiente: fila.ambiente || '1',
                    proceso: fila.proceso || 'I-2026',
                    status: fila.status || 'Activo',
                    pnf_id: fila.pnf_id || (pnfs[0]?.id) // Usar primer PNF si no hay ID
                });
            }

            if (datosCSVValidados.length === 0) return Swal.fire('Error', 'No hay datos válidos', 'warning');

            document.getElementById('carga-contador').textContent = `${datosCSVValidados.length} registros`;
            document.getElementById('carga-barra').style.width = '100%';
            document.getElementById('carga-progreso-texto').textContent = '✅ Listo para insertar';
            
            document.getElementById('carga-resultados').innerHTML = `
                <button onclick="window.modules.upload.insertarLoteEstudiantes()" class="bg-green-600 text-white px-4 py-2 rounded mt-2">🚀 Insertar ${datosCSVValidados.length} estudiantes</button>
                ${errores.length > 0 ? `<p class="text-red-600 text-sm mt-2">${errores.length} filas ignoradas</p>` : ''}
            `;

        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    };
    reader.readAsText(file, 'UTF-8');
};

/**
 * Insertar registros en lote
 */
window.modules.upload.insertarLoteEstudiantes = async function() {
    if (!datosCSVValidados.length) return;

    const barra = document.getElementById('carga-barra');
    const texto = document.getElementById('carga-progreso-texto');
    const resultados = document.getElementById('carga-resultados');

    texto.textContent = 'Verificando duplicados...';
    barra.style.width = '10%';

    const cedulas = datosCSVValidados.map(d => d.cedula);
    const { data: existentes } = await window.supabaseClient.from('estudiantes').select('cedula').in('cedula', cedulas);
    const cedulasExistentes = new Set((existentes || []).map(e => e.cedula));

    const nuevos = datosCSVValidados.filter(d => !cedulasExistentes.has(d.cedula));

    if (!nuevos.length) {
        texto.textContent = 'Finalizado';
        resultados.innerHTML = `<p class="text-orange-600 font-bold">⚠️ Todos ya existen.</p>`;
        return;
    }

    texto.textContent = `Insertando ${nuevos.length} nuevos...`;
    let insertados = 0;
    const CHUNK = 50;

    for (let i = 0; i < nuevos.length; i += CHUNK) {
        const lote = nuevos.slice(i, i + CHUNK);
        const { error } = await window.supabaseClient.from('estudiantes').insert(lote);
        if (!error) insertados += lote.length;
        barra.style.width = `${10 + ((i / nuevos.length) * 80)}%`;
        await new Promise(r => setTimeout(r, 50));
    }

    barra.style.width = '100%';
    texto.textContent = '✅ Proceso finalizado';
    resultados.innerHTML = `<p class="text-green-700 font-bold">✅ ${insertados} insertados</p>`;
    
    // Recargar tabla si estamos en gestión
    if (window.modules.gestion) window.modules.gestion.aplicarFiltros();
};

console.log('✅ Módulo de carga masiva cargado');