import { supabase } from './supabaseClient.js';

// Diccionario con las sublistas de formatos correspondientes
const sublistasFormatos = {
    "Cómic": [
        "Grapa", 
        "Tapa blanda (TPB)", 
        "Tapa dura (Hardcover)", 
        "Ómnibus / Integral"
    ],
    "Novela Gráfica": [
        "Tapa blanda", 
        "Tapa dura", 
        "Edición Coleccionista / Boxset"
    ],
    "Manga": [
        "Tankōbon", 
        "Kanzenban (Edición de Lujo)", 
        "Bunkoban", 
        "Wideban / A5"
    ],
    "Fanzine": [
        "Grapado artesanal", 
        "Cosido a mano", 
        "Booklet / Plegado libre"
    ],
    "Libro": [
        "Tapa blanda (Rústica)", 
        "Tapa dura (Cartoné)", 
        "Edición de bolsillo"
    ]
};

let listaObrasGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    cargarColeccion();
    configurarModal();
    configurarSelectsDependientes();
    configurarFiltrosYBusqueda();
});

// --- CARGAR DATOS DESDE SUPABASE ---
async function cargarColeccion() {
    const { data, error } = await supabase
        .from('coleccion')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al cargar la colección:', error.message);
        return;
    }

    listaObrasGlobal = data || [];
    renderizarGrid(listaObrasGlobal);
}

// --- RENDERIZAR TARJETAS EN EL DOM ---
function renderizarGrid(items) {
    const grid = document.getElementById('gridColeccion');
    grid.innerHTML = '';
    
    if (items.length === 0) {
        grid.innerHTML = `<p class="text-slate-500 col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">No se encontraron obras registradas.</p>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition';
        
        const portadaHtml = item.portada_url 
            ? `<img src="${item.portada_url}" alt="Portada" class="w-full h-48 object-cover bg-slate-100">`
            : `<div class="w-full h-48 bg-blue-50 flex items-center justify-center text-blue-300 font-bold text-lg">ColeX</div>`;

        card.innerHTML = `
            <div>
                ${portadaHtml}
                <div class="p-4">
                    <div class="flex justify-between items-start gap-2">
                        <span class="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">${item.tipo_material}</span>
                        <span class="text-xs text-slate-500 font-medium">${item.subtipo_material || ''}</span>
                    </div>
                    <h3 class="font-bold text-lg mt-2 text-slate-900 leading-snug">${item.titulo} ${item.numero ? '#' + item.numero : ''}</h3>
                    <p class="text-sm text-slate-600 mt-0.5">${item.autor || 'Autor desconocido'}</p>
                    <p class="text-xs text-slate-400 mt-1">${item.editorial || 'Sin editorial'} (${item.anio_lanzamiento || 'N/A'})</p>
                </div>
            </div>
            <div class="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <span class="font-bold text-blue-600">$${Number(item.valor_manual || 0).toFixed(2)}</span>
                <span class="text-xs font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700">${item.estado_fisico || 'Nuevo'}</span>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- LOGICA DE LISTAS DEPENDIENTES EN EL FORMULARIO ---
function configurarSelectsDependientes() {
    const selectTipo = document.getElementById('tipoMaterial');
    const selectSubtipo = document.getElementById('subtipoMaterial');

    selectTipo.addEventListener('change', (e) => {
        const tipoSeleccionado = e.target.value;
        selectSubtipo.innerHTML = '<option value="">Seleccione formato...</option>';
        
        if (tipoSeleccionado && sublistasFormatos[tipoSeleccionado]) {
            selectSubtipo.disabled = false;
            selectSubtipo.classList.remove('bg-slate-100');
            selectSubtipo.classList.add('bg-white');
            
            sublistasFormatos[tipoSeleccionado].forEach(formato => {
                const option = document.createElement('option');
                option.value = formato;
                option.textContent = formato;
                selectSubtipo.appendChild(option);
            });
        } else {
            selectSubtipo.disabled = true;
            selectSubtipo.classList.add('bg-slate-100');
            selectSubtipo.classList.remove('bg-white');
        }
    });
}

// --- MANEJO DEL MODAL Y FORMULARIO DE CREACIÓN ---
function configurarModal() {
    const modal = document.getElementById('modalAdd');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');
    const form = document.getElementById('formAddObra');

    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nuevaObra = {
            titulo: document.getElementById('titulo').value.trim(),
            numero: document.getElementById('numero').value.trim(),
            tipo_material: document.getElementById('tipoMaterial').value,
            subtipo_material: document.getElementById('subtipoMaterial').value,
            autor: document.getElementById('autor').value.trim(),
            dibujante: document.getElementById('dibujante').value.trim(),
            editorial: document.getElementById('editorial').value.trim(),
            anio_lanzamiento: document.getElementById('anio').value ? parseInt(document.getElementById('anio').value) : null,
            estado_fisico: document.getElementById('estadoFisico').value,
            valor_manual: document.getElementById('valorManual').value ? parseFloat(document.getElementById('valorManual').value) : 0,
            portada_url: document.getElementById('portadaUrl').value.trim()
        };

        const { error } = await supabase.from('coleccion').insert([nuevaObra]);

        if (error) {
            alert('Error al guardar la obra: ' + error.message);
            return;
        }

        form.reset();
        document.getElementById('subtipoMaterial').disabled = true;
        document.getElementById('subtipoMaterial').classList.add('bg-slate-100');
        modal.classList.add('hidden');
        cargarColeccion();
    });
}

// --- FILTROS Y BÚSQUEDA EN TIEMPO REAL ---
function configurarFiltrosYBusqueda() {
    const searchInput = document.getElementById('searchInput');
    const filterMaterial = document.getElementById('filterMaterial');

    function aplicarFiltros() {
        const texto = searchInput.value.toLowerCase();
        const tipoFiltro = filterMaterial.value;

        const filtradas = listaObrasGlobal.filter(item => {
            const coincideTexto = 
                (item.titulo && item.titulo.toLowerCase().includes(texto)) ||
                (item.autor && item.autor.toLowerCase().includes(texto)) ||
                (item.editorial && item.editorial.toLowerCase().includes(texto));

            const coincideTipo = tipoFiltro === "" || item.tipo_material === tipoFiltro;

            return coincideTexto && coincideTipo;
        });

        renderizarGrid(filtradas);
    }

    searchInput.addEventListener('input', aplicarFiltros);
    filterMaterial.addEventListener('change', aplicarFiltros);
}