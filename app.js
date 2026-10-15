import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ================= CONFIGURACIÓN SUPABASE =================
const SUPABASE_URL = 'https://ljxhehuierhexvkveszr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o_m6elxMjBmViae-LChBfQ_G4BB8LAy';

let supabase = null;
try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error('Error al inicializar Supabase:', e);
}

// Estado Global de la Aplicación
let coleccionData = [];
let coleccionFiltrada = [];
let mapaObras = {}; // Diccionario seguro por ID
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

function irAFormulario(idObra = null) {
    const formTitle = document.getElementById('formTitle');
    const form = document.getElementById('formObra');
    if (form) form.reset();
    base64Comprimido = '';
    
    const editId = document.getElementById('editObraId');
    if (editId) editId.value = '';
    
    const fileName = document.getElementById('fileName');
    if (fileName) fileName.innerText = 'Sin archivo seleccionado';
    
    const compressBadge = document.getElementById('compressBadge');
    if (compressBadge) compressBadge.classList.add('hidden');

    const obra = idObra !== null ? mapaObras[idObra] : null;

    if (obra) {
        if (formTitle) formTitle.innerText = 'Editar Coleccionable';
        if (editId) editId.value = obra.id;
        document.getElementById('titulo').value = obra.titulo || '';
        document.getElementById('numero').value = obra.numero || '';
        document.getElementById('anio').value = obra.anio || '';
        document.getElementById('tipoMaterial').value = obra.tipo_material || '';
        
        cambiarTipo(obra.tipo_material || '');
        document.getElementById('subtipoMaterial').value = obra.subtipo_material || '';
        document.getElementById('chkLeido').checked = !!obra.leido;
        document.getElementById('estrellas').value = obra.estrellas || 0;
        
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
        if (formTitle) formTitle.innerText = 'Agregar Coleccionable';
        cambiarTipo('');
    }

    cambiarPantalla('viewForm');
}

function irAEstadisticas() {
    calcularEstadisticas();
    cambiarPantalla('viewStats');
}

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
    if (!subtipoSelect) return;
    
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

    if (leidoContainer) {
        if (categoria === 'Cómic / Manga / Libro / Fanzine / Revista') {
            leidoContainer.classList.remove('hidden');
        } else {
            leidoContainer.classList.add('hidden');
        }
    }
}

function procesarArchivo(input) {
    const file = input.files[0];
    if (!file) return;

    const fileNameEl = document.getElementById('fileName');
    if (fileNameEl) fileNameEl.innerText = file.name;

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
            const badge = document.getElementById('compressBadge');
            if (badge) badge.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ================= OPERACIONES DE BASE DE DATOS (CRUD) =================
async function cargarColeccion() {
    if (!supabase) {
        console.warn('Supabase no está configurado.');
        return;
    }
    try {
        const { data, error } = await supabase
            .from('obras')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        coleccionData = data || [];
        mapaObras = {};
        coleccionData.forEach(item => { mapaObras[item.id] = item; });

        coleccionFiltrada = [...coleccionData];
        renderizarColeccion(coleccionFiltrada);
    } catch (err) {
        console.error('Error al cargar la colección:', err.message);
    }
}

async function guardarObra(event) {
    event.preventDefault();
    if (!supabase) {
        alert('Supabase no está configurado.');
        return;
    }

    const id = document.getElementById('editObraId').value;
    const urlDirecta = document.getElementById('portadaUrl').value;
    const portadaFinal = base64Comprimido || urlDirecta || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

    const tipoCat = document.getElementById('tipoMaterial').value;
    const esLibro = (tipoCat === 'Cómic / Manga / Libro / Fanzine / Revista');

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
    if (modoVitrinaActivo || !supabase) return;
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
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.innerHTML = `<div class="text-center text-gray-400 py-12 text-sm">No se encontraron coleccionables.</div>`;
        return;
    }

    lista.forEach(item => {
        const esLectura = (item.tipo_material === 'Cómic / Manga / Libro / Fanzine / Revista');
        
        // Estrellas doradas forzadas
        const numEstrellas = item.estrellas || 0;
        const estrellasHtml = numEstrellas > 0 
            ? `<span class="text-xs font-bold" style="color: #fbbf24 !important; text-shadow: 0 0 3px rgba(251, 191, 36, 0.4);">` + '★'.repeat(numEstrellas) + `</span>` 
            : '';

        // Etiquetas vibrantes
        const tagsArray = item.etiquetas ? item.etiquetas.split(',').map(t => t.trim()).filter(Boolean) : [];
        const tagsHtml = tagsArray.map(t => `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md text-[10px] font-semibold">${t}</span>`).join(' ');

        const card = document.createElement('div');
        card.className = 'colex-card p-3 rounded-2xl flex items-center justify-between gap-3 shadow-md hover:border-amber-600 transition cursor-pointer relative';
        card.onclick = () => verDetalle(item.id);

        card.innerHTML = `
            <div class="flex items-center space-x-3 overflow-hidden">
                <img src="${item.portada_url}" class="
