import { supabase } from './supabaseClient.js';

const sublistasFormatos = {
    "Cómic": ["Grapa", "Tapa blanda (TPB)", "Tapa dura (Hardcover)", "Ómnibus"],
    "Novela Gráfica": ["Tapa blanda", "Tapa dura", "Boxset"],
    "Manga": ["Tankōbon", "Kanzenban", "Bunkoban", "Wideban / A5"],
    "Fanzine": ["Grapado artesanal", "Cosido a mano", "Booklet"],
    "Libro": ["Tapa blanda (Rústica)", "Tapa dura (Cartoné)", "Bolsillo"]
};

let coleccion = [];
let obraActual = null;

// --- GESTIÓN DE NAVEGACIÓN ENTRE VENTANAS ---
function showScreen(screenId) {
    document.querySelectorAll('.app-screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    cargarColeccion();
    configurarNavegacion();
    configurarSelects();
    configurarFormulario();
});

function configurarNavegacion() {
    document.getElementById('navToAddBtn').addEventListener('click', () => abrirFormulario());
    document.getElementById('navToAddBtnBottom').addEventListener('click', () => abrirFormulario());
    document.getElementById('navToStatsBtn').addEventListener('click', () => {
        calcularEstadisticas();
        showScreen('viewStats');
    });

    document.getElementById('backFromDetalle').addEventListener('click', () => showScreen('viewColeccion'));
    document.getElementById('backFromForm').addEventListener('click', () => showScreen('viewColeccion'));
    document.getElementById('backFromStats').addEventListener('click', () => showScreen('viewColeccion'));
}

// --- CARGA DE DATOS DESDE SUPABASE ---
async function cargarColeccion() {
    const { data, error } = await supabase.from('coleccion').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    coleccion = data || [];
    renderizarColeccion(coleccion);
}

// --- RENDERIZADO DE LA PANTALLA PRINCIPAL ---
function renderizarColeccion(items) {
    const contenedor = document.getElementById('listColeccion');
    contenedor.innerHTML = '';

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'flex items-center space-x-3 p-2 bg-white rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition';
        row.innerHTML = `
            <img src="${item.portada_url || 'https://via.placeholder.com/60x80'}" class="w-12 h-16 object-cover rounded-lg bg-slate-200">
            <div class="flex-1">
                <h3 class="font-bold text-sm text-slate-900">${item.titulo} ${item.numero ? '#' + item.numero : ''}</h3>
                <p class="text-xs text-slate-500">${item.autor || 'Sin autor'}</p>
                <p class="text-xs font-semibold text-blue-600 mt-1">$${Number(item.valor_manual || 0).toFixed(2)}</p>
            </div>
        `;
        row.addEventListener('click', () => verDetalle(item));
        contenedor.appendChild(row);
    });
}

// --- PANTALLA DE DETALLE (Diseño de la maqueta) ---
function verDetalle(item) {
    obraActual = item;
    const content = document.getElementById('detalleContent');
    content.innerHTML = `
        <div class="bg-white p-4 rounded-2xl shadow-sm border space-y-4">
            <div class="flex gap-4">
                <img src="${item.portada_url || 'https://via.placeholder.com/120x160'}" class="w-28 h-40 object-cover rounded-xl bg-slate-200">
                <div>
                    <h2 class="text-xl font-bold text-slate-900">${item.titulo}</h2>
                    <p class="text-sm text-slate-500 font-medium">Número ${item.numero || 'N/A'}</p>
                    <span class="inline-block mt-2 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">${item.tipo_material}</span>
                </div>
            </div>

            <div class="space-y-2 border-t pt-3 text-sm">
                <div class="flex justify-between"><span class="text-slate-500">Autor</span><span class="font-medium">${item.autor || 'N/A'}</span></div>
                <div class="flex justify-between"><span class="text-slate-500">Editorial</span><span class="font-medium">${item.editorial || 'N/A'}</span></div>
                <div class="flex justify-between"><span class="text-slate-500">Año</span><span class="font-medium">${item.anio_lanzamiento || 'N/A'}</span></div>
                <div class="flex justify-between"><span class="text-slate-500">Estado</span><span class="font-medium">${item.estado_fisico || 'Nuevo'}</span></div>
                <div class="flex justify-between"><span class="text-slate-500">Precio</span><span class="font-bold text-blue-600">$${Number(item.valor_manual || 0).toFixed(2)}</span></div>
            </div>

            <div class="flex gap-3 pt-2">
                <button id="editBtn" class="flex-1 py-2.5 bg-slate-100 text-slate-800 rounded-xl font-semibold hover:bg-slate-200 cursor-pointer">Editar</button>
                <button id="deleteBtn" class="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 cursor-pointer">Eliminar</button>
            </div>
        </div>
    `;

    document.getElementById('editBtn').addEventListener('click', () => abrirFormulario(obraActual));
    document.getElementById('deleteBtn').addEventListener('click', () => eliminarObra(obraActual.id));

    showScreen('viewDetalle');
}

// --- FORMULARIO Y EDICIÓN ---
function abrirFormulario(item = null) {
    obraActual = item;
    const form = document.getElementById('formObra');
    form.reset();

    if (item) {
        document.getElementById('formTitle').textContent = 'Editar Obra';
        document.getElementById('titulo').value = item.titulo || '';
        document.getElementById('numero').value = item.numero || '';
        document.getElementById('anio').value = item.anio_lanzamiento || '';
        document.getElementById('tipoMaterial').value = item.tipo_material || '';
        actualizarSubtipos(item.tipo_material);
        document.getElementById('subtipoMaterial').value = item.subtipo_material || '';
        document.getElementById('autor').value = item.autor || '';
        document.getElementById('editorial').value = item.editorial || '';
        document.getElementById('estadoFisico').value = item.estado_fisico || 'Nuevo';
        document.getElementById('valorManual').value = item.valor_manual || 0;
        document.getElementById('portadaUrl').value = item.portada_url || '';
    } else {
        document.getElementById('formTitle').textContent = 'Agregar Obra';
        document.getElementById('subtipoMaterial').disabled = true;
    }

    showScreen('viewForm');
}

function configurarSelects() {
    const selectTipo = document.getElementById('tipoMaterial');
    selectTipo.addEventListener('change', (e) => actualizarSubtipos(e.target.value));
}

function actualizarSubtipos(tipo) {
    const selectSubtipo = document.getElementById('subtipoMaterial');
    selectSubtipo.innerHTML = '<option value="">Seleccionar formato...</option>';
    if (tipo && sublistasFormatos[tipo]) {
        selectSubtipo.disabled = false;
        sublistasFormatos[tipo].forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            selectSubtipo.appendChild(opt);
        });
    } else {
        selectSubtipo.disabled = true;
    }
}

function configurarFormulario() {
    document.getElementById('formObra').addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            titulo: document.getElementById('titulo').value,
            numero: document.getElementById('numero').value,
            anio_lanzamiento: document.getElementById('anio').value ? parseInt(document.getElementById('anio').value) : null,
            tipo_material: document.getElementById('tipoMaterial').value,
            subtipo_material: document.getElementById('subtipoMaterial').value,
            autor: document.getElementById('autor').value,
            editorial: document.getElementById('editorial').value,
            estado_fisico: document.getElementById('estadoFisico').value,
            valor_manual: parseFloat(document.getElementById('valorManual').value || 0),
            portada_url: document.getElementById('portadaUrl').value
        };

        if (obraActual) {
            await supabase.from('coleccion').update(payload).eq('id', obraActual.id);
        } else {
            await supabase.from('coleccion').insert([payload]);
        }

        await cargarColeccion();
        showScreen('viewColeccion');
    });
}

async function eliminarObra(id) {
    if (confirm('¿Seguro que deseas eliminar esta obra?')) {
        await supabase.from('coleccion').delete().eq('id', id);
        await cargarColeccion();
        showScreen('viewColeccion');
    }
}

function calcularEstadisticas() {
    document.getElementById('statTotal').textContent = coleccion.length;
    const totalValor = coleccion.reduce((acc, curr) => acc + (Number(curr.valor_manual) || 0), 0);
    document.getElementById('statValor').textContent = `$${totalValor.toFixed(2)}`;
}
