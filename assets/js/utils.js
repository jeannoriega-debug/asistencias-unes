/**
 * FUNCIONES UTILITARIAS REUTILIZABLES
 * Todas las fechas usan hora de Venezuela (UTC-4)
 */

window.utils = window.utils || {};

/**
 * Limpiar un select y agregar opción por defecto
 */
window.utils.clearSelect = (selectId, defaultText = 'Seleccione...') => {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="">${defaultText}</option>`;
    return select;
};

/**
 * Llenar un select con opciones desde un array
 */
window.utils.fillSelect = (selectId, items, valueKey = 'id', textKey = 'nombre', includeEmpty = true) => {
    const select = document.getElementById(selectId);
    if (!select || !items) return;
    
    select.innerHTML = includeEmpty ? '<option value="">Seleccione...</option>' : '';
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        select.appendChild(option);
    });
};

/**
 * Obtener valores únicos de un array de objetos
 */
window.utils.getUniqueValues = (array, key) => {
    if (!array || !key) return [];
    return [...new Set(array.map(item => item[key]).filter(v => v))].sort();
};

/**
 * Formatear cédula a mayúsculas
 */
window.utils.formatCedula = (cedula) => {
    return cedula ? cedula.toUpperCase().trim() : '';
};

/**
 * Validar que un campo no esté vacío
 */
window.utils.isRequired = (value, fieldName) => {
    if (!value || value.trim() === '') {
        Swal.fire('Atención', `${fieldName} es requerido`, 'warning');
        return false;
    }
    return true;
};

/**
 * Mostrar loader en un elemento
 */
window.utils.showLoader = (elementId, message = 'Cargando...') => {
    const el = document.getElementById(elementId);
    if (el) {
        el.innerHTML = `<div class="p-4 text-center text-gray-500">${message}</div>`;
    }
};

/**
 * Ocultar loader y mostrar contenido
 */
window.utils.hideLoader = (elementId) => {
    const el = document.getElementById(elementId);
    if (el && el.innerHTML.includes('Cargando')) {
        el.innerHTML = '';
    }
};

/**
 * 🇻 Obtener fecha actual en formato ISO (YYYY-MM-DD) - HORA VENEZUELA
 */
window.utils.getFechaISO = function() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
};

/**
 * 🇻🇪 Obtener fecha y hora actual de Venezuela (para logs)
 */
window.utils.getFechaHoraVenezuela = function() {
    return new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' });
};

/**
 * Formatear fecha de BD (YYYY-MM-DD) a formato legible (DD/MM/YYYY)
 */
window.utils.formatearFecha = function(fechaISO) {
    if (!fechaISO) return '';
    const [year, month, day] = fechaISO.split('-');
    return `${day}/${month}/${year}`;
};

/**
 * Formatear fecha con hora de Venezuela
 */
window.utils.formatearFechaHora = function(fechaISO) {
    if (!fechaISO) return '';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-VE', { timeZone: 'America/Caracas' });
};

console.log('✅ Utils cargado - Todas las funciones usan hora Venezuela');
