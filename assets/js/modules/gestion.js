/**
 * MÓDULO DE GESTIÓN DE ESTUDIANTES
 * Maneja CRUD, Filtros en Cascada, Paginación y Exportación
 */

window.modules = window.modules || {};
window.modules.gestion = {};

// Estado local del módulo
let estudiantes = [];
let pnfs = [];
let tiposTrayectos = [];
const POR_PAGINA = 20;

/**
 * Inicializar página
 */
window.modules.gestion.init = async function() {
	console.log('🚀 Iniciando Gestión de Estudiantes...');
	try {
		await verificarSesionGestion();
		await cargarEstudiantes();
		console.log('✅ Gestión de Estudiantes lista');
	} catch (error) {
		console.error('❌ Error en init:', error);
		Swal.fire('Error', 'No se pudo cargar la aplicación: ' + error.message, 'error');
	}
};

/**
 * Verificar sesión específica para esta página
 */
async function verificarSesionGestion() {
	const { data } = await window.supabaseClient.auth.getSession();
	const session = data?.session;
	
	if (!session) {
		window.location.href = 'index.html';
		return;
	}
	
	window.appState.usuarioActualId = session.user.id;
	const userInfo = document.getElementById('user-info');
	if (userInfo) userInfo.textContent = `👤 ${session.user.email}`;
	
	await cargarSelectoresIniciales();
}

/**
 * Cargar PNFs y Trayectos
 */
async function cargarSelectoresIniciales() {
	// 1. Cargar PNFs
	const { data } = await window.supabaseClient.from('pnf').select('id, nombre').order('nombre');
	pnfs = data || [];
	
	const selectPnf = document.getElementById('filtro-pnf');
	const selectEstPnf = document.getElementById('est-pnf');
	
	[selectPnf, selectEstPnf].forEach(sel => {
		if (!sel) return;
		sel.innerHTML = '<option value="">Seleccione PNF</option>';
		pnfs.forEach(p => {
			const opt = document.createElement('option');
			opt.value = p.id;
			opt.textContent = p.nombre;
			sel.appendChild(opt);
		});
	});

	// 2. Cargar Trayectos
	try {
		const { data: trayData } = await window.supabaseClient.from('tipos_trayecto').select('*').eq('activo', true).order('orden');
		tiposTrayectos = trayData || [];
	} catch (e) {
		tiposTrayectos = [
			{ id: '2bc377b7-f549-4352-abce-4038ac29d301', nombre: 'Periodo I' },
			{ id: 'b5bcc9a6-a491-4bb2-b838-90af80541038', nombre: 'Periodo II' },
			{ id: '233dd3cf-816f-452e-8650-4cc594072624', nombre: 'Periodo III' },
			{ id: 'e620f65b-963c-49df-9dcb-50ab29a5afa4', nombre: 'Periodo IV' },
			{ id: 'b2943adc-c23f-43a6-b8fd-4e08b14efe26', nombre: 'Periodo V' },
			{ id: '90fdfb96-4557-441e-a31b-5d155fe96c3f', nombre: 'No Aplica' }
		];
	}

	const selectEstTray = document.getElementById('est-trayecto');
	if (selectEstTray) {
		selectEstTray.innerHTML = '<option value="">Seleccione Trayecto</option>';
		tiposTrayectos.forEach(t => {
			const opt = document.createElement('option');
			opt.value = t.id;
			opt.textContent = t.nombre;
			selectEstTray.appendChild(opt);
		});
	}
}

async function cargarProcesosParaModal() {
	const { data } = await window.supabaseClient.from('estudiantes').select('proceso').not('proceso', 'is', null);
	if (!data) return [];
	const procesosUnicos = [...new Set(data.map(e => e.proceso))].sort();
	
	const selectProceso = document.getElementById('est-proceso');
	selectProceso.innerHTML = '<option value="">Seleccione Proceso</option>';
	procesosUnicos.forEach(proc => {
		const opt = document.createElement('option');
		opt.value = proc;
		opt.textContent = proc;
		selectProceso.appendChild(opt);
	});
}

// ================= FILTROS EN CASCADA =================

window.modules.gestion.onPnfChange = async function() {
	const pnfId = document.getElementById('filtro-pnf').value;
	const selectCategoria = document.getElementById('filtro-categoria');
	
	window.utils.clearSelect('filtro-categoria', 'Cargando...');
	window.utils.clearSelect('filtro-proceso', 'Cargando...');
	window.utils.clearSelect('filtro-trayecto', 'Cargando...');
	window.utils.clearSelect('filtro-ambiente', 'Cargando...');
	window.utils.clearSelect('filtro-genero', 'Cargando...');

	if (pnfId) {
		try {
			const { data } = await window.supabaseClient.from('estudiantes').select('categoria').eq('pnf_id', pnfId).not('categoria', 'is', null);
			if (data) {
				const categorias = window.utils.getUniqueValues(data, 'categoria');
				selectCategoria.innerHTML = '<option value="">Todas las categorías</option>';
				categorias.forEach(cat => {
					const opt = document.createElement('option');
					opt.value = cat; opt.textContent = cat;
					selectCategoria.appendChild(opt);
				});
			}
		} catch (err) { console.error('Error:', err); }
	}
};

window.modules.gestion.onCategoriaChange = async function() {
	const pnfId = document.getElementById('filtro-pnf').value;
	const categoria = document.getElementById('filtro-categoria').value;
	const selectProceso = document.getElementById('filtro-proceso');

	window.utils.clearSelect('filtro-proceso', 'Cargando...');
	window.utils.clearSelect('filtro-trayecto', 'Cargando...');
	window.utils.clearSelect('filtro-ambiente', 'Cargando...');
	window.utils.clearSelect('filtro-genero', 'Cargando...');

	if (pnfId) {
		try {
			let query = window.supabaseClient.from('estudiantes').select('proceso').eq('pnf_id', pnfId).not('proceso', 'is', null);
			if (categoria) query = query.eq('categoria', categoria);
			const { data } = await query;
			
			if (data) {
				const procesos = window.utils.getUniqueValues(data, 'proceso');
				selectProceso.innerHTML = '<option value="">Todos los procesos</option>';
				procesos.forEach(p => {
					const opt = document.createElement('option'); opt.value = p; opt.textContent = p;
					selectProceso.appendChild(opt);
				});
			}
		} catch (err) { console.error('Error:', err); }
	}
};

window.modules.gestion.onProcesoChange = async function() {
	const pnfId = document.getElementById('filtro-pnf').value;
	const categoria = document.getElementById('filtro-categoria').value;
	const proceso = document.getElementById('filtro-proceso').value;
	const selectTrayecto = document.getElementById('filtro-trayecto');

	window.utils.clearSelect('filtro-trayecto', 'Cargando...');
	window.utils.clearSelect('filtro-ambiente', 'Cargando...');
	window.utils.clearSelect('filtro-genero', 'Cargando...');

	if (pnfId && proceso) {
		try {
			let query = window.supabaseClient.from('estudiantes').select('trayecto_id').eq('pnf_id', pnfId).eq('proceso', proceso);
			if (categoria) query = query.eq('categoria', categoria);
			const { data } = await query;

			if (data) {
				const trayectos = window.utils.getUniqueValues(data, 'trayecto_id');
				selectTrayecto.innerHTML = '<option value="">Todos los trayectos</option>';
				trayectos.forEach(id => {
					const info = tiposTrayectos.find(t => t.id === id);
					if (info) {
						const opt = document.createElement('option'); opt.value = id; opt.textContent = info.nombre;
						selectTrayecto.appendChild(opt);
					}
				});
			}
		} catch (err) { console.error('Error:', err); }
	}
};

window.modules.gestion.onTrayectoChange = async function() {
	const pnfId = document.getElementById('filtro-pnf').value;
	const categoria = document.getElementById('filtro-categoria').value;
	const proceso = document.getElementById('filtro-proceso').value;
	const trayectoId = document.getElementById('filtro-trayecto').value;
	const selectAmbiente = document.getElementById('filtro-ambiente');

	window.utils.clearSelect('filtro-ambiente', 'Cargando...');
	window.utils.clearSelect('filtro-genero', 'Cargando...');

	if (pnfId && proceso && trayectoId) {
		try {
			let query = window.supabaseClient.from('estudiantes').select('ambiente').eq('pnf_id', pnfId).eq('proceso', proceso).eq('trayecto_id', trayectoId);
			if (categoria) query = query.eq('categoria', categoria);
			const { data } = await query;

			if (data) {
				const ambientes = window.utils.getUniqueValues(data, 'ambiente');
				selectAmbiente.innerHTML = '<option value="">Todos los ambientes</option>';
				ambientes.forEach(amb => {
					const opt = document.createElement('option'); opt.value = amb; opt.textContent = `Ambiente ${amb}`;
					selectAmbiente.appendChild(opt);
				});
			}
		} catch (err) { console.error('Error:', err); }
	}
};

// 🔥 CORRECCIÓN: Ahora carga los géneros dinámicamente al seleccionar ambiente
window.modules.gestion.onAmbienteChange = async function() {
	const pnfId = document.getElementById('filtro-pnf').value;
	const categoria = document.getElementById('filtro-categoria').value;
	const proceso = document.getElementById('filtro-proceso').value;
	const trayectoId = document.getElementById('filtro-trayecto').value;
	const ambiente = document.getElementById('filtro-ambiente').value;
	const selectGenero = document.getElementById('filtro-genero');

	if (!selectGenero) return;
	selectGenero.innerHTML = '<option value="">Cargando...</option>';

	if (pnfId && proceso && trayectoId && ambiente) {
		try {
			let query = window.supabaseClient
				.from('estudiantes')
				.select('genero')
				.eq('pnf_id', pnfId)
				.eq('proceso', proceso)
				.eq('trayecto_id', trayectoId)
				.eq('ambiente', ambiente)
				.not('genero', 'is', null); // Solo traer géneros válidos

			if (categoria) query = query.eq('categoria', categoria);
			
			const { data } = await query;

			if (data) {
				const generos = window.utils.getUniqueValues(data, 'genero');
				selectGenero.innerHTML = '<option value="">Todos los géneros</option>';
				generos.forEach(gen => {
					const opt = document.createElement('option'); opt.value = gen; opt.textContent = gen;
					selectGenero.appendChild(opt);
				});
			}
		} catch (err) { console.error('Error cargando géneros:', err); }
	} else {
		selectGenero.innerHTML = '<option value="">Todos los géneros</option>';
	}
};

window.modules.gestion.onGeneroChange = function() {
	console.log('Género cambiado:', document.getElementById('filtro-genero').value);
};

/**
 * Funciones principales de la tabla
 */
window.modules.gestion.aplicarFiltros = function() {
	window.modules.gestion.filtros = {
		pnf: document.getElementById('filtro-pnf')?.value || '',
		categoria: document.getElementById('filtro-categoria')?.value || '',
		proceso: document.getElementById('filtro-proceso')?.value || '',
		trayecto: document.getElementById('filtro-trayecto')?.value || '',
		ambiente: document.getElementById('filtro-ambiente')?.value || '',
		genero: document.getElementById('filtro-genero')?.value || '',
		status: document.getElementById('filtro-status')?.value || '',
		busqueda: window.modules.gestion.filtros?.busqueda || ''
	};
	window.appState.paginaActual = 1;
	cargarEstudiantes();
};

window.modules.gestion.limpiarFiltros = function() {
	document.getElementById('filtro-pnf').value = '';
	document.getElementById('filtro-categoria').innerHTML = '<option value="">Todas las categorías</option>';
	document.getElementById('filtro-proceso').innerHTML = '<option value="">Todos los procesos</option>';
	document.getElementById('filtro-trayecto').innerHTML = '<option value="">Todos los trayectos</option>';
	document.getElementById('filtro-ambiente').innerHTML = '<option value="">Todos los ambientes</option>';
	document.getElementById('filtro-genero').innerHTML = '<option value="">Todos los géneros</option>';
	document.getElementById('filtro-status').value = '';
	document.getElementById('busqueda-texto').value = '';
	
	window.modules.gestion.filtros = { pnf: '', categoria: '', proceso: '', trayecto: '', ambiente: '', genero: '', status: '', busqueda: '' };
	window.appState.paginaActual = 1;
	cargarEstudiantes();
};

window.modules.gestion.buscarEnTiempoReal = function(e) {
	window.modules.gestion.filtros = window.modules.gestion.filtros || {};
	window.modules.gestion.filtros.busqueda = e.target.value.trim().toLowerCase();
	window.appState.paginaActual = 1;
	cargarEstudiantes();
};

async function cargarEstudiantes() {
	const tbody = document.getElementById('tabla-estudiantes');
	tbody.innerHTML = '<tr><td colspan="13" class="p-8 text-center">Cargando...</td></tr>';

	const filtros = window.modules.gestion.filtros || {};
	let query = window.supabaseClient.from('estudiantes').select(`
		*,
		pnf:pnf_id(nombre),
		tipos_trayecto:trayecto_id(nombre)
	`, { count: 'exact' });

	if (filtros.pnf) query = query.eq('pnf_id', filtros.pnf);
	if (filtros.categoria) query = query.eq('categoria', filtros.categoria);
	if (filtros.proceso) query = query.eq('proceso', filtros.proceso);
	if (filtros.trayecto) query = query.eq('trayecto_id', filtros.trayecto);
	if (filtros.ambiente) query = query.eq('ambiente', filtros.ambiente);
	if (filtros.genero) query = query.eq('genero', filtros.genero);
	if (filtros.status) query = query.eq('status', filtros.status);
	if (filtros.busqueda) query = query.or(`cedula.ilike.%${filtros.busqueda}%,nombres.ilike.%${filtros.busqueda}%,apellidos.ilike.%${filtros.busqueda}%`);

	const { data, error, count } = await query.order('apellidos, nombres');

	if (error) {
		Swal.fire('Error', 'No se pudieron cargar los estudiantes', 'error');
		return;
	}

	estudiantes = data || [];
	window.modules.gestion.totalEstudiantes = count || 0;
	
	actualizarContador();
	renderizarTabla();
	actualizarPaginacionUI();
}

// 🔥 CORRECCIÓN: Formato de fecha y cálculo de edad
function renderizarTabla() {
    const tbody = document.getElementById('tabla-estudiantes');
    const inicio = (window.appState.paginaActual - 1) * POR_PAGINA;
    const fin = inicio + POR_PAGINA;
    const pagina = estudiantes.slice(inicio, fin);

    if (pagina.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" class="p-8 text-center text-gray-500">No hay estudiantes</td></tr>';
        return;
    }

    tbody.innerHTML = pagina.map((est, index) => {
        // 1. Calcular Edad
        let edadTexto = '';
        if (est.fecha_nacimiento) {
            const hoy = new Date();
            const nacimiento = new Date(est.fecha_nacimiento);
            let anios = hoy.getFullYear() - nacimiento.getFullYear();
            const mes = hoy.getMonth() - nacimiento.getMonth();
            if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
                anios--;
            }
            edadTexto = `${anios} años`;
        }

        // 2. Formatear Fecha DD/MM/AAAA
        let fechaFormateada = '-';
        if (est.fecha_nacimiento) {
            const d = new Date(est.fecha_nacimiento + 'T00:00:00');
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const dia = String(d.getDate()).padStart(2, '0');
            const anio = d.getFullYear();
            fechaFormateada = `${dia}/${mes}/${anio}`;
        }

        // 3. Combinar: "DD/MM/AAAA (XX años)"
        const contenidoFecha = edadTexto 
            ? `${fechaFormateada} <span class="text-gray-400 text-xs ml-1">(${edadTexto})</span>` 
            : fechaFormateada;

        return `
        <tr class="hover:bg-gray-50 transition">
            <td class="p-3">${inicio + index + 1}</td>
            <td class="p-3 font-mono text-xs">${est.cedula || ''}</td>
            <td class="p-3">${est.nombres || ''}</td>
            <td class="p-3">${est.apellidos || ''}</td>
            <td class="p-3 text-xs">${est.genero || '-'}</td>
            
            <!-- Columna Unificada: Fecha + Edad -->
            <td class="p-3 text-xs font-medium">${contenidoFecha}</td>
            
            <td class="p-3 text-xs">${est.categoria || '-'}</td>
            <td class="p-3 text-xs">${est.pnf?.nombre || '-'}</td>
            <td class="p-3 text-center">${est.ambiente || '-'}</td>
            <td class="p-3 text-xs">${est.tipos_trayecto?.nombre || '-'}</td>
            <td class="p-3 text-xs">${est.proceso || '-'}</td>
            <td class="p-3">
                <span class="px-2 py-1 rounded text-xs font-bold ${est.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${est.status || 'N/A'}
                </span>
            </td>
            <td class="p-3 text-center">
                <button onclick="window.modules.gestion.editarEstudiante('${est.id}')" class="text-blue-600 hover:text-blue-800 mx-1">✏️</button>
                <button onclick="window.modules.gestion.eliminarEstudiante('${est.id}', '${(est.nombres||'')} ${(est.apellidos||'')}')" class="text-red-600 hover:text-red-800 mx-1">🗑️</button>
            </td>
        </tr>
    `}).join('');
}

function actualizarPaginacionUI() {
	const totalPaginas = Math.ceil(estudiantes.length / POR_PAGINA);
	document.getElementById('pagina-actual').textContent = window.appState.paginaActual;
	document.getElementById('info-paginacion').textContent = `Mostrando ${Math.min((window.appState.paginaActual - 1) * POR_PAGINA + 1, estudiantes.length)}-${Math.min(window.appState.paginaActual * POR_PAGINA, estudiantes.length)} de ${estudiantes.length}`;
	
	document.getElementById('btn-anterior').disabled = window.appState.paginaActual === 1;
	document.getElementById('btn-siguiente').disabled = window.appState.paginaActual === totalPaginas || totalPaginas === 0;
}

function actualizarContador() {
	const total = window.modules.gestion.totalEstudiantes;
	document.getElementById('contador-estudiantes').textContent = `${total} estudiante${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`;
}

/**
 * CRUD
 */
window.modules.gestion.abrirModalCrear = async function() {
	document.getElementById('modal-titulo').textContent = 'Nuevo Estudiante';
	document.getElementById('form-estudiante').reset();
	document.getElementById('est-id').value = '';
	await cargarProcesosParaModal();
	document.getElementById('modal-estudiante').classList.remove('hidden');
	document.getElementById('modal-estudiante').classList.add('flex');
};

window.modules.gestion.cerrarModal = function() {
	document.getElementById('modal-estudiante').classList.add('hidden');
	document.getElementById('modal-estudiante').classList.remove('flex');
};

window.modules.gestion.editarEstudiante = async function(id) {
	const est = estudiantes.find(e => e.id === id);
	if (!est) return;

	await cargarProcesosParaModal();

	document.getElementById('modal-titulo').textContent = 'Editar Estudiante';
	document.getElementById('est-id').value = est.id;
	document.getElementById('est-cedula').value = est.cedula || '';
	document.getElementById('est-fecha-nac').value = est.fecha_nacimiento ? est.fecha_nacimiento.split('T')[0] : '';
	document.getElementById('est-nombres').value = est.nombres || '';
	document.getElementById('est-apellidos').value = est.apellidos || '';
	document.getElementById('est-genero').value = est.genero || '';
	document.getElementById('est-categoria').value = est.categoria || '';
	document.getElementById('est-numero-lista').value = est.numero_lista || '';
	document.getElementById('est-pnf').value = est.pnf_id || '';
	document.getElementById('est-ambiente').value = est.ambiente || '';
	document.getElementById('est-trayecto').value = est.trayecto_id || '';
	document.getElementById('est-proceso').value = est.proceso || '';
	document.getElementById('est-status').value = est.status || 'Activo';

	document.getElementById('modal-estudiante').classList.remove('hidden');
	document.getElementById('modal-estudiante').classList.add('flex');
};

window.modules.gestion.guardarEstudiante = async function(e) {
	e.preventDefault();
	
	const datos = {
		cedula: document.getElementById('est-cedula').value.toUpperCase(),
		fecha_nacimiento: document.getElementById('est-fecha-nac').value || null,
		nombres: document.getElementById('est-nombres').value.toUpperCase(),
		apellidos: document.getElementById('est-apellidos').value.toUpperCase(),
		genero: document.getElementById('est-genero').value || null,
		categoria: document.getElementById('est-categoria').value || null,
		numero_lista: parseInt(document.getElementById('est-numero-lista').value) || null,
		pnf_id: document.getElementById('est-pnf').value,
		ambiente: document.getElementById('est-ambiente').value,
		trayecto_id: document.getElementById('est-trayecto').value,
		proceso: document.getElementById('est-proceso').value,
		status: document.getElementById('est-status').value
	};

	const id = document.getElementById('est-id').value;
	const { error } = id 
		? await window.supabaseClient.from('estudiantes').update(datos).eq('id', id)
		: await window.supabaseClient.from('estudiantes').insert([datos]);

	if (error) {
		Swal.fire('Error', error.message, 'error');
	} else {
		Swal.fire('✅ Éxito', `Estudiante ${id ? 'actualizado' : 'creado'} correctamente`, 'success');
		window.modules.gestion.cerrarModal();
		cargarEstudiantes();
	}
};

window.modules.gestion.eliminarEstudiante = async function(id, nombre) {
	const confirmacion = await Swal.fire({
		title: '¿Eliminar estudiante?',
		text: `Se eliminará permanentemente a: ${nombre}`,
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#d33',
		confirmButtonText: 'Sí, eliminar',
		cancelButtonText: 'Cancelar'
	});

	if (!confirmacion.isConfirmed) return;

	const { error } = await window.supabaseClient.from('estudiantes').delete().eq('id', id);
	if (error) {
		Swal.fire('Error', error.message, 'error');
	} else {
		Swal.fire('Eliminado', 'El estudiante ha sido eliminado', 'success');
		cargarEstudiantes();
	}
};

/**
 * Exportar Excel
 */
window.modules.gestion.exportarExcel = async function() {
	const btn = document.querySelector('button[onclick="window.modules.gestion.exportarExcel()"]');
	const textoOriginal = btn.textContent;
	btn.textContent = '⏳ Generando...';
	btn.disabled = true;

	try {
		let query = window.supabaseClient.from('estudiantes').select(`
			*,
			pnf:pnf_id(nombre),
			tipos_trayecto:trayecto_id(nombre)
		`);

		const filtros = window.modules.gestion.filtros || {};
		if (filtros.pnf) query = query.eq('pnf_id', filtros.pnf);
		if (filtros.categoria) query = query.eq('categoria', filtros.categoria);
		if (filtros.proceso) query = query.eq('proceso', filtros.proceso);
		if (filtros.trayecto) query = query.eq('trayecto_id', filtros.trayecto);
		if (filtros.ambiente) query = query.eq('ambiente', filtros.ambiente);
		if (filtros.genero) query = query.eq('genero', filtros.genero);
		if (filtros.status) query = query.eq('status', filtros.status);
		if (filtros.busqueda) query = query.or(`cedula.ilike.%${filtros.busqueda}%,nombres.ilike.%${filtros.busqueda}%,apellidos.ilike.%${filtros.busqueda}%`);

		const { data, error } = await query.order('apellidos, nombres');
		if (error) throw error;
		if (!data || data.length === 0) return Swal.fire('Atención', 'No hay estudiantes para exportar', 'warning');

		const datos = data.map((e, index) => ({
			'N°': index + 1, 'Cédula': e.cedula, 'Nombres': e.nombres, 'Apellidos': e.apellidos,
			'Género': e.genero, 'Categoría': e.categoria, 'F. Nacimiento': e.fecha_nacimiento,
			'PNF': e.pnf?.nombre, 'Ambiente': e.ambiente, 'Trayecto': e.tipos_trayecto?.nombre, 'Proceso': e.proceso, 'Estado': e.status
		}));

		
		const hoja = XLSX.utils.json_to_sheet(datos);
		hoja['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 10 }];
		
		const libro = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(libro, hoja, 'Estudiantes');
		XLSX.writeFile(libro, `estudiantes_${new Date().toISOString().split('T')[0]}.xlsx`);
		Swal.fire('✅ Exportado', `Se exportaron <b>${data.length}</b> estudiantes`, 'success');

	} catch (err) {
		Swal.fire('Error', err.message, 'error');
	} finally {
		btn.textContent = textoOriginal;
		btn.disabled = false;
	}
};

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', window.modules.gestion.init);

// Hacer funciones globales para el HTML
window.aplicarFiltros = window.modules.gestion.aplicarFiltros;
window.limpiarFiltros = window.modules.gestion.limpiarFiltros;
window.buscarEnTiempoReal = window.modules.gestion.buscarEnTiempoReal;
window.abrirModalCrear = window.modules.gestion.abrirModalCrear;
window.cerrarModal = window.modules.gestion.cerrarModal;
window.guardarEstudiante = window.modules.gestion.guardarEstudiante;
window.editarEstudiante = window.modules.gestion.editarEstudiante;
window.eliminarEstudiante = window.modules.gestion.eliminarEstudiante;
window.exportarExcel = window.modules.gestion.exportarExcel;

console.log('✅ Módulo de gestión cargado');