/**
 * FUNCIONES UTILITARIAS REUTILIZABLES
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

console.log('✅ Utilidades cargadas');