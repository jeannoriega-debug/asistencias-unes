/**
 * MÓDULO DE ASISTENCIA - VERSIÓN CORREGIDA
 * ✅ Soluciona: error de options undefined y consulta de unidades
 */
window.modules = window.modules || {};
window.modules.asistencia = {};
let tiposTrayectos = [];

window.modules.asistencia.init = async function () {
	if (!document.getElementById('select-pnf')) return;
	await cargarTrayectos();
	await cargarPNF();

	const btnCargar = document.getElementById('btn-cargar');
	const btnReporte = document.getElementById('btn-reporte');
	if (btnCargar) btnCargar.onclick = window.modules.asistencia.cargarLista;
	if (btnReporte) btnReporte.onclick = window.modules.reportes?.generarReporteMatriz;

	console.log('✅ Asistencia inicializada | Orden optimizado');
};

async function cargarTrayectos() {
	try {
		const { data, error } = await window.supabaseClient.from('tipos_trayecto').select('*').eq('activo', true).order('orden');
		console.log('🔍 Trayectos cargados:', data?.length || 0, 'registros');
		tiposTrayectos = (!error && data && data.length > 0) ? data : [
			{ id: '2bc377b7-f549-4352-abce-4038ac29d301', nombre: 'Trayecto Inicial', orden: 0 },
			{ id: 'b5bcc9a6-a491-4bb2-b838-90af80541038', nombre: 'Trayecto I', orden: 1 },
			{ id: '233dd3cf-816f-452e-8650-4cc594072624', nombre: 'Trayecto II', orden: 2 },
			{ id: 'e620f65b-963c-49df-9dcb-50ab29a5afa4', nombre: 'Trayecto III', orden: 3 },
			{ id: 'b2943adc-c23f-43a6-b8fd-4e08b14efe26', nombre: 'Trayecto IV', orden: 4 },
			{ id: '90fdfb96-4557-441e-a31b-5d155fe96c3f', nombre: 'No Aplica', orden: 99 }
		];
	} catch (err) { console.error('❌ Error trayectos:', err); }
}

async function cargarPNF() {
	const sel = document.getElementById('select-pnf');
	if (!sel) {
		console.error('❌ No se encontró el elemento select-pnf');
		return;
	}
	
	sel.innerHTML = '<option value="">Cargando PNFs...</option>';

	let pnfs = [];
	try {
		if (window.appState.rolUsuarioActual === 'super_usuario') {
			const { data, error } = await window.supabaseClient.from('pnf').select('id, nombre').order('nombre');
			if (error) {
				console.error('❌ Error cargando PNFs:', error);
				sel.innerHTML = '<option value="">Error al cargar PNFs</option>';
				return;
			}
			pnfs = data || [];
			console.log('✅ PNFs cargados (super_usuario):', pnfs.length);
		} else {
			const { data, error } = await window.supabaseClient
				.from('asignaciones_profesor')
				.select('pnf:pnf_id(id, nombre)')
				.eq('profesor_id', window.appState.usuarioActualId);
			
			if (error) {
				console.error('❌ Error cargando asignaciones:', error);
				sel.innerHTML = '<option value="">Error al cargar asignaciones</option>';
				return;
			}
			
			pnfs = [...new Map((data || []).map(a => [a.pnf?.id, a.pnf]).filter(p => p[0] && p[1])).values()];
			console.log('✅ PNFs cargados (profesor):', pnfs.length, pnfs);
		}
		
		sel.innerHTML = '<option value="">Seleccione PNF</option>';
		pnfs.forEach(p => { 
			const o = document.createElement('option'); 
			o.value = p.id; 
			o.textContent = p.nombre; 
			sel.appendChild(o); 
		});
		
		console.log('✅ Dropdown PNF poblado con', pnfs.length, 'opciones');
	} catch (err) {
		console.error('❌ Error general cargando PNF:', err);
		sel.innerHTML = '<option value="">Error al cargar</option>';
	}

	// ✅ EVENT LISTENER CORREGIDO
	sel.addEventListener('change', function() {
		window.modules.asistencia.onPnfChangeAsistencia.call(this);
	});
}

// 1. PNF → CARGA CATEGORÍA Y UNIDADES
window.modules.asistencia.onPnfChangeAsistencia = async function () {
	const pnfId = this.value;
	const pnfName = this.options[this.selectedIndex]?.text || 'Desconocido';
	console.log('🔄 PNF seleccionado:', pnfId, '-', pnfName);
	
	const selCat = document.getElementById('select-categoria');
	['select-categoria', 'select-materia', 'select-proceso', 'select-trayecto', 'select-ambiente', 'select-status-asist', 'select-genero'].forEach(id => { 
		const el = document.getElementById(id); 
		if (el) el.innerHTML = '<option value="">Cargando...</option>'; 
	});
	
	if (!pnfId || !selCat) {
		console.warn('️ No hay PNF seleccionado o no existe el select de categoría');
		return;
	}

	try {
		let cats = [];
		if (window.appState.rolUsuarioActual === 'super_usuario') {
			const { data, error } = await window.supabaseClient.from('estudiantes').select('categoria').eq('pnf_id', pnfId).not('categoria', 'is', null).eq('status', 'Activo');
			if (error) console.error(' Error cargando categorías:', error);
			cats = window.utils.getUniqueValues(data, 'categoria').filter(Boolean);
		} else {
			const { data, error } = await window.supabaseClient
				.from('asignaciones_profesor')
				.select('categoria')
				.eq('profesor_id', window.appState.usuarioActualId)
				.eq('pnf_id', pnfId);
			
			if (error) console.error('❌ Error cargando categorías profesor:', error);
			cats = window.utils.getUniqueValues(data, 'categoria').filter(c => c !== null && c !== undefined && c !== '');
		}
		
		console.log('✅ Categorías encontradas:', cats.length, cats);
		
		selCat.innerHTML = '<option value="">Todas las categorías</option>';
		cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; selCat.appendChild(o); });
		selCat.addEventListener('change', function() {
			window.modules.asistencia.onCategoriaChangeAsistencia.call(this);
		});
		
		// Cargar unidades inmediatamente
		await cargarUnidadesDirectamente(pnfId);
		
	} catch (e) { 
		console.error('❌ Error en onPnfChange:', e); 
	}
};

// ✅ FUNCIÓN CORREGIDA: Cargar unidades con consulta en 2 pasos
async function cargarUnidadesDirectamente(pnfId) {
	const selMat = document.getElementById('select-materia');
	if (!selMat || !pnfId) {
		console.warn('⚠️ No existe select-materia o no hay PNF');
		return;
	}

	console.log('🔍 Cargando unidades para PNF:', pnfId, '| Rol:', window.appState.rolUsuarioActual);
	selMat.innerHTML = '<option value="">Cargando unidades...</option>';

	try {
		let mats = [];
		
		if (window.appState.rolUsuarioActual === 'super_usuario') {
			// Super usuario: usar tabla intermedia o fallback directo
			const { data: relaciones, error: errorRel } = await window.supabaseClient
				.from('pnf_unidades_relacion')
				.select('unidad_curricular_id')
				.eq('pnf_id', pnfId);

			console.log(' Relaciones PNF-Unidad:', relaciones?.length || 0, errorRel ? 'con error' : 'OK');

			if (errorRel || !relaciones || relaciones.length === 0) {
				console.warn('⚠️ No hay relaciones, usando fallback directo');
				const { data: unidades, error: errorUni } = await window.supabaseClient
					.from('unidades_curriculares')
					.select('id, nombre')
					.eq('pnf_id', pnfId)
					.order('nombre');
				
				if (errorUni) {
					console.error('❌ Error en fallback:', errorUni);
					selMat.innerHTML = '<option value="">Error al cargar</option>';
					return;
				}
				
				mats = unidades || [];
				console.log('✅ Unidades cargadas (fallback directo):', mats.length);
			} else {
				const unidadIds = relaciones.map(r => r.unidad_curricular_id);
				console.log('🔗 IDs de unidades a buscar:', unidadIds.length);
				
				const { data: unidades, error: errorUni } = await window.supabaseClient
					.from('unidades_curriculares')
					.select('id, nombre')
					.in('id', unidadIds)
					.order('nombre');

				if (errorUni) {
					console.error('❌ Error cargando unidades:', errorUni);
					selMat.innerHTML = '<option value="">Error al cargar</option>';
					return;
				}
				
				mats = unidades || [];
				console.log('✅ Unidades cargadas (desde relación):', mats.length);
			}
		} else {
			// ✅ PROFESOR: CONSULTA EN 2 PASOS
			console.log('👨‍🏫 Buscando asignaciones del profesor para PNF:', pnfId);
			
			// PASO 1: Obtener IDs de unidades asignadas
			const { data: asignaciones, error: errorAsig } = await window.supabaseClient
				.from('asignaciones_profesor')
				.select('unidad_curricular_id')
				.eq('profesor_id', window.appState.usuarioActualId)
				.eq('pnf_id', pnfId);

			if (errorAsig) {
				console.error('❌ Error cargando asignaciones:', errorAsig);
				selMat.innerHTML = '<option value="">Error al cargar asignaciones</option>';
				return;
			}

			console.log(' Asignaciones encontradas:', asignaciones?.length || 0);
			
			if (asignaciones && asignaciones.length > 0) {
				// Obtener IDs únicos
				const unidadIds = [...new Set(asignaciones.map(a => a.unidad_curricular_id).filter(Boolean))];
				console.log('🔗 IDs únicos de unidades:', unidadIds);
				
				// PASO 2: Consultar nombres de unidades
				const { data: unidades, error: errorUni } = await window.supabaseClient
					.from('unidades_curriculares')
					.select('id, nombre')
					.in('id', unidadIds)
					.order('nombre');

				if (errorUni) {
					console.error(' Error cargando nombres de unidades:', errorUni);
					selMat.innerHTML = '<option value="">Error al cargar</option>';
					return;
				}

				mats = unidades || [];
				console.log('✅ Unidades cargadas (profesor - 2 pasos):', mats.length);
				
				// Mostrar detalles
				mats.forEach((m, idx) => {
					console.log(`  [${idx}] ${m.id}: ${m.nombre}`);
				});
			} else {
				console.warn('⚠️ El profesor NO tiene asignaciones para este PNF');
				console.log('💡 Solución: Un administrador debe asignarte unidades para este PNF en el panel de administración');
			}
		}

		// Poblar el dropdown
		selMat.innerHTML = '<option value="">Seleccione Unidad Curricular</option>';
		if (mats.length === 0) {
			selMat.innerHTML = '<option value="">No hay unidades disponibles</option>';
			console.warn('⚠️ No se encontraron unidades para este PNF');
		} else {
			mats.forEach(m => { 
				const o = document.createElement('option'); 
				o.value = m.id; 
				o.textContent = m.nombre; 
				selMat.appendChild(o); 
			});
			console.log('✅ Dropdown de unidades poblado con', mats.length, 'opciones');
		}
		
	} catch (err) {
		console.error('❌ Error general cargando unidades:', err);
		selMat.innerHTML = '<option value="">Error al cargar</option>';
	}

	// ✅ EVENT LISTENER CORREGIDO
	selMat.addEventListener('change', function() {
		window.modules.asistencia.onMateriaChangeAsistencia.call(this);
	});
}

// 2. CATEGORÍA → ACTUALIZA UNIDAD CURRICULAR
window.modules.asistencia.onCategoriaChangeAsistencia = async function () {
	const pnfId = document.getElementById('select-pnf').value;
	const cat = this.value;
	console.log('🔄 Categoría seleccionada:', cat || 'TODAS', 'para PNF:', pnfId);
	
	// Recargar unidades
	await cargarUnidadesDirectamente(pnfId);
	
	// Resetear campos siguientes
	['select-proceso', 'select-trayecto', 'select-ambiente', 'select-status-asist', 'select-genero'].forEach(id => { 
		const el = document.getElementById(id); 
		if (el) el.innerHTML = '<option value="">Cargando...</option>'; 
	});
};

// 3. UNIDAD CURRICULAR → CARGA PROCESO
window.modules.asistencia.onMateriaChangeAsistencia = async function () {
	const pnfId = document.getElementById('select-pnf').value;
	const cat = document.getElementById('select-categoria').value;
	const selProc = document.getElementById('select-proceso');
	['select-proceso', 'select-trayecto', 'select-ambiente', 'select-status-asist', 'select-genero'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = '<option value="">Cargando...</option>'; });
	if (!pnfId || !selProc) return;

	try {
		let procs = [];
		if (window.appState.rolUsuarioActual === 'super_usuario') {
			let q = window.supabaseClient.from('estudiantes').select('proceso').eq('pnf_id', pnfId).eq('status', 'Activo');
			if (cat) q = q.eq('categoria', cat);
			const { data } = await q;
			procs = window.utils.getUniqueValues(data, 'proceso').filter(Boolean);
		} else {
			let q = window.supabaseClient.from('asignaciones_profesor').select('proceso').eq('profesor_id', window.appState.usuarioActualId).eq('pnf_id', pnfId);
			if (cat) q = q.eq('categoria', cat);
			const { data } = await q;
			procs = window.utils.getUniqueValues(data, 'proceso').filter(Boolean);
		}
		selProc.innerHTML = '<option value="">Seleccione Proceso</option>';
		procs.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; selProc.appendChild(o); });
		selProc.addEventListener('change', function() {
			window.modules.asistencia.onProcesoChangeAsistencia.call(this);
		});
	} catch (e) { console.error('Error proc:', e); }
};

// 4. PROCESO → CARGA TRAYECTO
window.modules.asistencia.onProcesoChangeAsistencia = async function () {
	const pnfId = document.getElementById('select-pnf').value;
	const cat = document.getElementById('select-categoria').value;
	const proc = this.value;
	const selTray = document.getElementById('select-trayecto');
	['select-trayecto', 'select-ambiente', 'select-status-asist', 'select-genero'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = '<option value="">Cargando...</option>'; });
	if (!pnfId || !proc || !selTray) return;

	try {
		let tIds = [];
		if (window.appState.rolUsuarioActual === 'super_usuario') {
			let q = window.supabaseClient.from('estudiantes').select('trayecto_id').eq('pnf_id', pnfId).eq('proceso', proc).eq('status', 'Activo');
			if (cat) q = q.eq('categoria', cat);
			const { data } = await q;
			tIds = window.utils.getUniqueValues(data, 'trayecto_id').filter(Boolean);
		} else {
			let q = window.supabaseClient.from('asignaciones_profesor').select('trayecto_id').eq('profesor_id', window.appState.usuarioActualId).eq('pnf_id', pnfId).eq('proceso', proc);
			if (cat) q = q.eq('categoria', cat);
			const { data } = await q;
			tIds = window.utils.getUniqueValues(data, 'trayecto_id').filter(Boolean);
		}
		selTray.innerHTML = '<option value="">Seleccione Trayecto</option>';
		tIds.forEach(id => { const info = tiposTrayectos.find(t => t.id === id); if (info) { const o = document.createElement('option'); o.value = id; o.textContent = info.nombre; selTray.appendChild(o); } });
		selTray.addEventListener('change', function() {
			window.modules.asistencia.onTrayectoChangeAsistencia.call(this);
		});
	} catch (e) { console.error('Error tray:', e); }
};

// 5. TRAYECTO → CARGA AMBIENTE
window.modules.asistencia.onTrayectoChangeAsistencia = async function () {
	const pnfId = document.getElementById('select-pnf').value;
	const cat = document.getElementById('select-categoria').value;
	const proc = document.getElementById('select-proceso').value;
	const trayId = this.value;
	const selAmb = document.getElementById('select-ambiente');
	['select-ambiente', 'select-status-asist', 'select-genero'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = '<option value="">Cargando...</option>'; });
	if (!pnfId || !proc || !trayId || !selAmb) return;

	try {
		let ambs = [];
		if (window.appState.rolUsuarioActual === 'super_usuario') {
			let q = window.supabaseClient.from('estudiantes').select('ambiente').eq('pnf_id', pnfId).eq('proceso', proc).eq('trayecto_id', trayId).eq('status', 'Activo');
			if (cat) q = q.eq('categoria', cat);
			const { data } = await q;
			ambs = window.utils.getUniqueValues(data, 'ambiente').filter(a => a !== null);
		} else {
			let q = window.supabaseClient.from('asignaciones_profesor').select('ambiente').eq('profesor_id', window.appState.usuarioActualId).eq('pnf_id', pnfId).eq('proceso', proc).eq('trayecto_id', trayId);
			if (cat) q = q.eq('categoria', cat);
			const { data } = await q;
			ambs = window.utils.getUniqueValues(data, 'ambiente').filter(a => a !== null && a !== '');
			if (ambs.length === 0) {
				const { data: est } = await window.supabaseClient.from('estudiantes').select('ambiente').eq('pnf_id', pnfId).eq('proceso', proc).eq('trayecto_id', trayId).eq('status', 'Activo');
				ambs = window.utils.getUniqueValues(est, 'ambiente').filter(a => a !== null);
			}
		}
		selAmb.innerHTML = '<option value="">Seleccione Ambiente</option>';
		ambs.forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = `Ambiente ${a}`; selAmb.appendChild(o); });
		selAmb.addEventListener('change', function() {
			window.modules.asistencia.onAmbienteChangeAsistencia.call(this);
		});
	} catch (e) { console.error('Error amb:', e); }
};

// 6. AMBIENTE → CARGA ESTATUS & GÉNERO
window.modules.asistencia.onAmbienteChangeAsistencia = async function () {
	const pnfId = document.getElementById('select-pnf').value;
	const cat = document.getElementById('select-categoria').value;
	const proc = document.getElementById('select-proceso').value;
	const trayId = document.getElementById('select-trayecto').value;
	const amb = this.value;
	const selSt = document.getElementById('select-status-asist');
	const selGe = document.getElementById('select-genero');
	if (!amb || !pnfId || !proc || !trayId) return;
	if (selSt) selSt.innerHTML = '<option value="">Cargando...</option>';
	if (selGe) selGe.innerHTML = '<option value="">Cargando...</option>';

	try {
		let q = window.supabaseClient.from('estudiantes').select('status, genero').eq('pnf_id', pnfId).eq('proceso', proc).eq('trayecto_id', trayId).eq('ambiente', amb);
		if (cat) q = q.eq('categoria', cat);
		const { data } = await q;

		if (selSt) {
			const sts = window.utils.getUniqueValues(data, 'status').filter(Boolean);
			selSt.innerHTML = '<option value="">Todos los estados</option>';
			sts.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s === 'Activo' ? '✅ Activos' : '❌ Inactivos'; selSt.appendChild(o); });
		}
		if (selGe) {
			const ges = [...new Set(data.map(d => d.genero).filter(Boolean))].sort();
			selGe.innerHTML = '<option value="">Todos los géneros</option>';
			ges.forEach(g => { const o = document.createElement('option'); o.value = g; o.textContent = g; selGe.appendChild(o); });
		}
	} catch (e) { console.error('Error filtros finales:', e); }
};

window.modules.asistencia.onStatusChangeAsistencia = () => console.log('Status:', document.getElementById('select-status-asist')?.value);
window.modules.asistencia.onGeneroChangeAsistencia = () => console.log('Género:', document.getElementById('select-genero')?.value);

// CARGAR LISTA
window.modules.asistencia.cargarLista = async function () {
	const pnfId = document.getElementById('select-pnf')?.value;
	const proc = document.getElementById('select-proceso')?.value;
	const trayId = document.getElementById('select-trayecto')?.value;
	const amb = document.getElementById('select-ambiente')?.value;
	const matId = document.getElementById('select-materia')?.value;
	const status = document.getElementById('select-status-asist')?.value;
	const genero = document.getElementById('select-genero')?.value;

	if (!pnfId || !proc || !trayId || !amb) return Swal.fire("Atención", "Complete PNF, Proceso, Trayecto y Ambiente", "warning");

	if (window.appState.rolUsuarioActual === 'profesor') {
		if (!matId) return Swal.fire("Atención", "Seleccione la Unidad Curricular", "warning");
		const { data: asig } = await window.supabaseClient.from('asignaciones_profesor').select('id').eq('profesor_id', window.appState.usuarioActualId).eq('pnf_id', pnfId).eq('unidad_curricular_id', matId).eq('proceso', proc).eq('trayecto_id', trayId).or(`ambiente.eq.${amb},ambiente.is.null`).maybeSingle();
		if (!asig) return Swal.fire("Acceso denegado", "No tiene asignación para esta combinación", "error");
	}

	let q = window.supabaseClient.from('estudiantes').select(`*, tipos_trayecto(id, codigo, nombre, orden)`).eq('pnf_id', pnfId).eq('proceso', proc).eq('trayecto_id', trayId).eq('ambiente', amb);
	if (status) q = q.eq('status', status);
	if (genero) q = q.eq('genero', genero);

	const { data, error } = await q.order('numero_lista');
	if (error) return Swal.fire("Error", error.message, "error");

	window.appState.estudiantesActuales = data || [];
	window.components?.tablas?.renderizarListaEstudiantes?.();
};

window.modules.asistencia.marcarAsistencia = async function(estId, estado, btn) {
    const contenedor = btn.parentElement;
    const btnP = contenedor.querySelector('button:first-child');
    const btnA = contenedor.querySelector('button:last-child');
    const claseGris = 'bg-gray-300 hover:bg-gray-400 text-gray-700 w-8 h-8 rounded-lg font-bold text-xs transition shadow-sm flex items-center justify-center';

    const matId = document.getElementById('select-materia')?.value;
    const amb = document.getElementById('select-ambiente')?.value;
    const proc = document.getElementById('select-proceso')?.value;
	const fecha = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

    console.log('📤 Intentando guardar:', { estId, estado, matId, amb, proc, fecha });

    const { data, error } = await window.supabaseClient
        .from('asistencias')
        .upsert({
            estudiante_id: estId,
            unidad_curricular_id: matId,
            profesor_id: window.appState.usuarioActualId,
            estado: estado,
            proceso: proc,
            ambiente_registro: amb,
            fecha: fecha
        }, { onConflict: 'estudiante_id, unidad_curricular_id, fecha' });

    if (error) {
        console.error('❌ ERROR SUPABASE:', error);
        Swal.fire("No se guardó", error.message || "Verifica consola (F12) para más detalles", "error");
        if(btnP) btnP.className = claseGris;
        if(btnA) btnA.className = claseGris;
        return;
    }

    console.log('✅ Guardado exitoso en BD');
};

// Exportar funciones globales
window.onPnfChangeAsistencia = window.modules.asistencia.onPnfChangeAsistencia;
window.onCategoriaChangeAsistencia = window.modules.asistencia.onCategoriaChangeAsistencia;
window.onMateriaChangeAsistencia = window.modules.asistencia.onMateriaChangeAsistencia;
window.onProcesoChangeAsistencia = window.modules.asistencia.onProcesoChangeAsistencia;
window.onTrayectoChangeAsistencia = window.modules.asistencia.onTrayectoChangeAsistencia;
window.onAmbienteChangeAsistencia = window.modules.asistencia.onAmbienteChangeAsistencia;
window.onStatusChangeAsistencia = window.modules.asistencia.onStatusChangeAsistencia;
window.onGeneroChangeAsistencia = window.modules.asistencia.onGeneroChangeAsistencia;
window.cargarLista = window.modules.asistencia.cargarLista;
window.marcarAsistencia = window.modules.asistencia.marcarAsistencia;
console.log('✅ Asistencia JS cargado - Versión corregida');
