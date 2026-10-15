import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuración e Inicialización de Supabase
const SUPABASE_URL = 'https://TU_SUPABASE_URL.supabase.co'; // Reemplaza con tu URL real
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY';           // Reemplaza con tu Key real

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Estado Global de la Aplicación
let coleccionData = [];
let coleccionFiltrada = [];
let base64Comprimido = '';
let modoVitrinaActivo = false;

// Subtipos según Categoría
const SUBTIPOS_MAP = {
    "Cómic / Manga / Libro / Fanzine / Revista": ["Cómic", "Manga", "Libro", "Fanzine", "Revista"],
    "Cartas TCG": ["Cartas Sueltas / Singles", "Sobres / Packs", "Cajas / Booster Box", "Decks / Mazos", "Accesorios / Protecciones"],
    "Vehículos a Escala (Hot Wheels)": ["Hot Wheels Mainline", "Hot Wheels Premium", "Matchbox", "Majorette", "Greenlight", "1:64", "1:43", "1:18", "Otro Vehículo"],
    "Figuras / Funkos / Estatuas": ["Funko Pop!", "Figura de Acción", "Estatua / Resin", "Nendoroid", "Scale Figure", "Model Kit / Gunpla"],
    "Videojuegos / Retro": ["Juego Físico", "Consola", "Mando / Mandos", "Edición Coleccionista", "Accesorio"],
    "Música (LPs/Vinilos, CDs)": ["LP / Vinilo", "CD", "Cassette", "Boxset / Edición Especial"],
    "Otro / Fanzine": ["Fanzine / Artbook", "Poster / Arte", "Pin / Insignia", "Merchandising Variado"]
};

// ================= NAVEGACIÓN Y VISTAS =================
function cambiarPantalla(idPantalla) {
    document.querySelectorAll('.app-screen').forEach(screen => screen.classList.add('hidden'));
    const target = document.getElementById(idPantalla);
    if (target) target.classList.remove('hidden');
}

function irAColeccion() {
    cambiarPantalla('viewColeccion');
}

function irAFormulario(obra = null) {
    const formTitle = document.getElementById('formTitle');
    const form = document.getElementById('formObra');
    form.reset();
    base64Comprimido = '';
    document.getElementById('editObraId').value = '';
    document.getElementById('fileName').innerText = 'Sin archivo seleccionado';
    document.getElementById('compressBadge').classList.add('hidden');

    if (obra) {
        formTitle.innerText = 'Editar Coleccionable';
        document.getElementById('editObraId').value = obra.id;
        document.getElementById('titulo').value = obra.titulo || '';
        document.getElementById('numero').value = obra.numero || '';
        document.getElementById('anio').value = obra.anio || '';
        document.getElementById('tipoMaterial').value = obra.tipo_material || '';
        
        cambiarTipo(obra.tipo_material || '');
        document.getElementById('subtipoMaterial').value = obra.subtipo_material || '';
        document.getElementById('chkLeido').checked = !!obra.leido;
        document.getElementById('estrellas').value = obra.estrellas || 0;
        
        // Cargar Etiquetas Checkboxes
        const tagsGuardados = (obra.etiquetas || '').split(',').map(t => t.trim());
        document.querySelectorAll('input[name="tagCheck"]').forEach(chk => {
            chk.checked = tagsGuardados.includes(chk.value);
        });

        document.getElementById('autor').value = obra.autor || '';
        document.getElementById('editorial').value = obra.editorial || '';
        document.getElementById('estadoFisico').value = obra.estado_fisico || 'Nuevo / Mint';
        document.getElementById('valorManual').value = obra.valor_manual || 0.00;
        document.getElementById('portadaUrl').value = obra.portada_url || '';
        document.getElementById('notas').value = obra.notas || '';
    } else {
        formTitle.innerText = 'Agregar Coleccionable';
        cambiarTipo('');
    }

    cambiarPantalla('viewForm');
}

function irAEstadisticas() {
    calcularEstadisticas();
    cambiarPantalla('viewStats');
}

// Alternar Modo Vitrina (Público de Solo Lectura)
function toggleModoVitrina() {
    modoVitrinaActivo = !modoVitrinaActivo;
    const btn = document.getElementById('btnVitrinaToggle');
    
    if (modoVitrinaActivo) {
        document.body.classList.add('public-mode');
        if (btn) btn.innerText = '🔒';
    } else {
        document.body.classList.remove('public-mode');
        if (btn) btn.innerText = '👁️';
    }

    localStorage.setItem('colex_modo_vitrina', modoVitrinaActivo ? 'true' : 'false');
    renderizarColeccion(coleccionFiltrada);
}

// Cargar preferencia de Modo Vitrina
function inicializarModoVitrina() {
    const guardado = localStorage.getItem('colex_modo_vitrina');
    if (guardado === 'true') {
        modoVitrinaActivo = true;
        document.body.classList.add('public-mode');
        const btn = document.getElementById('btnVitrinaToggle');
        if (btn) btn.innerText = '🔒';
    }
}

// ================= SELECTORES Y COMPRESIÓN =================
function cambiarTipo(categoria) {
    const subtipoSelect = document.getElementById('subtipoMaterial');
    const leidoContainer = document.getElementById('leidoContainer');
    subtipoSelect.innerHTML = '<option value="" class="bg-gray-900">Selecciona variante...</option>';

    if (categoria && SUBTIPOS_MAP[categoria]) {
        SUBTIPOS_MAP[categoria].forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.textContent = sub;
            opt.className = 'bg-gray-900';
            subtipoSelect.appendChild(opt);
        });
    }

    if (categoria === 'Cómic / Manga / Libro / Fanzine / Revista') {
        leidoContainer.classList.remove('hidden');
    } else {
        leidoContainer.classList.add('hidden');
    }
}

function procesarArchivo(input) {
    const file = input.files[0];
    if (!file) return;

    document.getElementById('fileName').innerText = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            base64Comprimido = canvas.toDataURL('image/jpeg', 0.7);
            document.getElementById('compressBadge').classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ================= OPERACIONES DE BASE DE DATOS (CRUD) =================
async function cargarColeccion() {
    try {
        const { data, error } = await supabase
            .from('obras')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        coleccionData = data || [];
        coleccionFiltrada = [...coleccionData];
        renderizarColeccion(coleccionFiltrada);
    } catch (err) {
        console.error('Error al cargar la colección:', err.message);
    }
}

async function guardarObra(event) {
    event.preventDefault();

    const id = document.getElementById('editObraId').value;
    const urlDirecta = document.getElementById('portadaUrl').value;
    const portadaFinal = base64Comprimido || urlDirecta || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

    const tipoCat = document.getElementById('tipoMaterial').value;
    const esLibro = (tipoCat === 'Cómic / Manga / Libro / Fanzine / Revista');

    // Obtener etiquetas seleccionadas
    const selectedTags = Array.from(document.querySelectorAll('input[name="tagCheck"]:checked')).map(c => c.value).join(', ');

    const payload = {
        titulo: document.getElementById('titulo').value,
        numero: document.getElementById('numero').value,
        anio: parseInt(document.getElementById('anio').value) || null,
        tipo_material: tipoCat,
        subtipo_material: document.getElementById('subtipoMaterial').value,
        leido: esLibro ? document.getElementById('chkLeido').checked : false,
        estrellas: parseInt(document.getElementById('estrellas').value) || 0,
        etiquetas: selectedTags,
        autor: document.getElementById('autor').value,
        editorial: document.getElementById('editorial').value,
        estado_fisico: document.getElementById('estadoFisico').value,
        valor_manual: parseFloat(document.getElementById('valorManual').value) || 0.00,
        portada_url: portadaFinal,
        notas: document.getElementById('notas').value
    };

    try {
        if (id) {
            const { error } = await supabase.from('obras').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('obras').insert([payload]);
            if (error) throw error;
        }

        await cargarColeccion();
        irAColeccion();
    } catch (err) {
        alert('Error al guardar el ítem: ' + err.message);
    }
}

async function eliminarObra(id) {
    if (modoVitrinaActivo) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este coleccionable?')) return;

    try {
        const { error } = await supabase.from('obras').delete().eq('id', id);
        if (error) throw error;

        await cargarColeccion();
        irAColeccion();
    } catch (err) {
        alert('Error al eliminar: ' + err.message);
    }
}

// ================= RENDERIZADO Y BÚSQUEDA =================
function renderizarColeccion(lista) {
    const contenedor = document.getElementById('listColeccion');
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.innerHTML = `<div class="text-center text-gray-400 py-12 text-sm">No se encontraron coleccionables.</div>`;
        return;
    }

    lista.forEach(item => {
        const esLectura = (item.tipo_material === 'Cómic / Manga / Libro / Fanzine / Revista');
        
        // Formato Estrellas
        const numEstrellas = item.estrellas || 0;
        const estrellasHtml = numEstrellas > 0 
            ? `<span class="text-amber-400 text-xs font-bold">` + '★'.repeat(numEstrellas) + `</span>` 
            : '';

        // Formato Etiquetas
        const tagsArray = item.etiquetas ? item.etiquetas.split(',').map(t => t.trim()).filter(Boolean) : [];
        const tagsHtml = tagsArray.map(t => `<span class="bg-amber-950/80 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-md text-[10px] font-medium">${t}</span>`).join(' ');

        const card = document.createElement('div');
        card.className = 'colex-card p-3 rounded-2xl flex items-center justify-between gap-3 shadow-md hover:border-amber-600 transition cursor-pointer relative';
        card.onclick = () => verDetalle(item);

        card.innerHTML = `
            <div class="flex items-center space-x-3 overflow-hidden">
                <img src="${item.portada_url}" class="w-16 h-20 object-cover rounded-xl border border-gray-700 flex-shrink-0" alt="Portada">
                <div class="overflow-hidden space-y-1">
                    <h3 class="font-bold text-sm text-gray-100 truncate">${item.titulo}</h3>
                    <p class="text-xs text-amber-custom truncate">${item.autor || 'Sin Autor'} ${item.numero ? `(${item.numero})` : ''}</p>
                    <div class="flex items-center space-x-2">
                        <span class="bg-gray-800 text-gray-300 px-2 py-0.5 rounded-md text-[10px] font-semibold">${item.subtipo_material || item.tipo_material}</span>
                        ${esLectura ? (item.leido ? `<span
