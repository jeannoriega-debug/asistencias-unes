/**
 * DASHBOARD LÓGICA - VERSIÓN ESTABLE
 */

// Asegurar que el plugin esté registrado
if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
}

window.dashboard = {
    charts: {},

    init: async function () {
        await this.cargarFiltros();
        await this.cargarDatos();
    },

    cargarFiltros: async function () {
        // Cargar PNF
        const { data: pnfs } = await window.supabaseClient.from('pnf').select('id, nombre');
        const selPnf = document.getElementById('dash-pnf');
        selPnf.innerHTML = '<option value="">Todos los PNF</option>';
        (pnfs || []).forEach(p => {
            selPnf.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });

        // Cargar Procesos
        const { data: procesos } = await window.supabaseClient.from('estudiantes').select('proceso');
        const selProc = document.getElementById('dash-proceso');
        selProc.innerHTML = '<option value="">Todos los Procesos</option>';
        const unicosProc = [...new Set(procesos.map(x => x.proceso).filter(Boolean))].sort();
        unicosProc.forEach(p => selProc.innerHTML += `<option value="${p}">${p}</option>`);

        // Cargar Trayectos
        const { data: trayectos } = await window.supabaseClient.from('tipos_trayecto').select('id, nombre').eq('activo', true);
        const selTray = document.getElementById('dash-trayecto');
        selTray.innerHTML = '<option value="">Todos los Trayectos</option>';
        (trayectos || []).forEach(t => selTray.innerHTML += `<option value="${t.id}">${t.nombre}</option>`);

        // Cargar Categorías
        const { data: categoriasData } = await window.supabaseClient.from('estudiantes').select('categoria');
        const selCat = document.getElementById('dash-categoria');
        selCat.innerHTML = '<option value="">Todas las Categorías</option>';
        const unicasCat = [...new Set(categoriasData.map(x => x.categoria).filter(Boolean))].sort();
        unicasCat.forEach(c => selCat.innerHTML += `<option value="${c}">${c}</option>`);

        // Cargar Géneros
        const selGen = document.getElementById('dash-genero');
        selGen.innerHTML = '<option value="">Todos los Géneros</option>';
        ['Masculino', 'Femenino', 'Otro'].forEach(g => {
            selGen.innerHTML += `<option value="${g}">${g}</option>`;
        });
    },

    cargarDatos: async function () {
        Swal.fire({ title: 'Actualizando...', allowOutsideClick: false, timer: 500, didOpen: () => Swal.showLoading() });

        let query = window.supabaseClient.from('estudiantes').select('*');

        const filtros = {
            pnf_id: document.getElementById('dash-pnf').value,
            proceso: document.getElementById('dash-proceso').value,
            trayecto_id: document.getElementById('dash-trayecto').value,
            categoria: document.getElementById('dash-categoria').value,
            genero: document.getElementById('dash-genero').value
        };

        if (filtros.pnf_id) query = query.eq('pnf_id', filtros.pnf_id);
        if (filtros.proceso) query = query.eq('proceso', filtros.proceso);
        if (filtros.trayecto_id) query = query.eq('trayecto_id', filtros.trayecto_id);
        if (filtros.categoria) query = query.eq('categoria', filtros.categoria);
        if (filtros.genero) query = query.eq('genero', filtros.genero);

        query = query.limit(10000);

        const { data, error } = await query;

        if (error) {
            Swal.fire('Error', error.message, 'error');
            return;
        }

        this.renderKPIs(data);
        this.renderCharts(data);
    },

    renderKPIs: function (data) {
        const total = data.length;
        const masculinos = data.filter(e => e.genero === 'Masculino').length;
        const femeninos = data.filter(e => e.genero === 'Femenino').length;

        const activos = data.filter(e => e.status === 'Activo').length;
        const inactivos = data.filter(e => e.status === 'Inactivo').length;

        const ambientes = new Set(data.map(e => e.ambiente).filter(Boolean));

        document.getElementById('kpi-total').innerHTML = `
            <div class="text-4xl font-bold text-gray-800">${total}</div>
            <div class="text-xs mt-2 space-y-1">
                <div class="flex justify-between"><span>👨 M:</span><span class="font-bold text-blue-600">${masculinos}</span></div>
                <div class="flex justify-between"><span>👩 F:</span><span class="font-bold text-pink-600">${femeninos}</span></div>
            </div>
        `;

        document.getElementById('kpi-activos').innerHTML = `
            <div class="text-4xl font-bold text-green-600">${activos}</div>
            <div class="text-xs text-gray-500 mt-1">${total > 0 ? ((activos / total) * 100).toFixed(1) : 0}% del total</div>
        `;

        document.getElementById('kpi-inactivos').innerHTML = `
            <div class="text-4xl font-bold text-red-600">${inactivos}</div>
            <div class="text-xs text-gray-500 mt-1">${total > 0 ? ((inactivos / total) * 100).toFixed(1) : 0}% del total</div>
        `;

        document.getElementById('kpi-ambientes').innerHTML = `
            <div class="text-4xl font-bold text-blue-600">${ambientes.size}</div>
            <div class="text-xs text-gray-500 mt-1">Ambientes únicos</div>
        `;
    },

    renderCharts: function (data) {
        const total = data.length;
        if (total === 0) return;

        // --- GRÁFICO GÉNERO ---
        const conteoGenero = {};
        data.forEach(e => { if (e.genero) conteoGenero[e.genero] = (conteoGenero[e.genero] || 0) + 1; });

        this.renderChart('chart-genero', 'pie', {
            labels: Object.keys(conteoGenero),
            datasets: [{
                data: Object.values(conteoGenero),
                backgroundColor: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        }, (value, context) => {
            const label = context.chart.data.labels[context.dataIndex];
            const totalVal = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = ((value / totalVal) * 100).toFixed(1);
            return `${label}\n${percentage}%\n(${value})`;
        });

        // --- GRÁFICO TRAYECTO ---
        const conteoTrayecto = {};
        data.forEach(e => {
            if (e.trayecto_id) conteoTrayecto[e.trayecto_id] = (conteoTrayecto[e.trayecto_id] || 0) + 1;
        });

        const nombresTrayecto = Object.keys(conteoTrayecto).map(id => {
            const opt = document.querySelector(`#dash-trayecto option[value="${id}"]`);
            return opt ? opt.text.replace('Seleccione ', '') : id.substring(0, 8);
        });

        this.renderChart('chart-trayecto', 'doughnut', {
            labels: nombresTrayecto,
            datasets: [{
                data: Object.values(conteoTrayecto),
                backgroundColor: ['#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#f43f5e'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        }, (value, context) => {
            const totalVal = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = ((value / totalVal) * 100).toFixed(0);
            return `${percentage}%\n(${value})`;
        });

        // --- GRÁFICO AMBIENTE ---
        const conteoAmbiente = {};
        data.forEach(e => { if (e.ambiente) conteoAmbiente[e.ambiente] = (conteoAmbiente[e.ambiente] || 0) + 1; });

        const sortedKeys = Object.keys(conteoAmbiente).sort((a, b) => parseInt(a) - parseInt(b));

        this.renderChart('chart-ambiente', 'bar', {
            labels: sortedKeys.map(k => `Amb ${k}`),
            datasets: [{
                label: 'Estudiantes',
                data: sortedKeys.map(k => conteoAmbiente[k]),
                backgroundColor: '#3b82f6',
                borderRadius: 5,
            }]
        }, (value) => value > 0 ? value : '');

        // --- GRÁFICO CATEGORÍA ---
        const conteoCategoria = {};
        data.forEach(e => {
            if (e.categoria && e.categoria.trim() !== '') {
                conteoCategoria[e.categoria] = (conteoCategoria[e.categoria] || 0) + 1;
            }
        });

        const sortedCatKeys = Object.keys(conteoCategoria).sort((a, b) => conteoCategoria[b] - conteoCategoria[a]);

        this.renderChart('chart-categoria', 'bar', {
            labels: sortedCatKeys,
            datasets: [{
                label: 'Estudiantes',
                data: sortedCatKeys.map(k => conteoCategoria[k]),
                backgroundColor: '#10b981',
                borderRadius: 5,
            }]
        }, (value) => value > 0 ? value : '');
    },

    renderChart: function (canvasId, type, config, formatter) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 11, weight: 'bold' }, padding: 15 }
                },
                // Configuración del plugin DATALABELS aquí (más seguro)
                datalabels: {
                    display: true,
                    anchor: 'center',
                    align: 'center',
                    font: { weight: 'bold', size: 11 },
                    color: '#fff',
                    formatter: formatter
                }
            },
            scales: type === 'bar' ? {
                y: { beginAtZero: true, ticks: { precision: 0 } }
            } : {}
        };

        this.charts[canvasId] = new Chart(ctx, {
            type: type,
            data: config,
            options: options
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.dashboard !== 'undefined') {
        window.dashboard.init();
    }
});