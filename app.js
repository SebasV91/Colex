// ================= CONFIGURACIÓN SUPABASE =================
const SUPABASE_URL = 'https://ljxhehuierhexvkveszr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o_m6elxMjBmViae-LChBfQ_G4BB8LAy';

let dbClient = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error('Error al inicializar Supabase:', e);
}

// Estado Global
let coleccionData = [];
let coleccionFiltrada = [];
let mapaObras = {}; 
let base64Comprimido = '';
let modoVitrinaActivo = false;

const SUBTIPOS_MAP = {
    "Cómic / Manga / Libro / Fanzine / Revista": ["Cómic", "Novela Gráfica", "Manga", "Libro", "Fanzine", "Revista"],
    "Cartas TCG": ["Cartas Sueltas / Singles", "Sobres / Packs", "Cajas / Booster Box", "Decks / Mazos", "Accesorios / Protecciones"],
    "Vehículos a Escala (Hot Wheels)": ["Hot Wheels Mainline", "Hot Wheels Premium", "Matchbox", "Majorette", "Greenlight", "1:64", "1:43", "1:18", "Otro Vehículo"],
    "Figuras / Funkos / Estatuas": ["Funko Pop!", "Figura de Acción", "Estatua / Resin", "Nendoroid", "Scale Figure", "Model Kit / Gunpla"],
    "Videojuegos / Retro": ["Juego Físico", "Consola", "Mando / Mandos", "Edición Coleccionista", "Accesorio"],
    "Música (LPs/Vinilos, CDs)": ["LP / Vinilo", "CD", "Cassette", "Boxset / Edición Especial"]
};

// ================= NAVEGACIÓN =================
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

    const obra = (idObra !== null && idObra !== undefined) ? mapaObras[idObra] : null;

    if (obra) {
        if (formTitle) formTitle.innerText = 'Editar Coleccionable';
        if (editId) editId.value = obra.id;
        document.getElementById('titulo').value = obra.titulo || '';
        document.getElementById('numero').value = obra.numero || '';
        document.getElementById('anio').value = obra.anio || '';
        document.getElementById('tipoMaterial').value = obra.tipo_material || '';
        
        cambiarTipo(obra.tipo_material || '');
        
        const subElem = document.getElementById('subtipoMaterial');
        if (subElem) subElem.value = obra.subtipo_material || '';

        document.getElementById('chkLeido').checked = !!obra.leido;
        document.getElementById('estrellas').value = obra.estrellas || 0;
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
    const subtipoContainer = document.getElementById('subtipoContainer');
    const leidoContainer = document.getElementById('leidoContainer');
    if (!subtipoContainer) return;

    if (categoria === 'Otro') {
        subtipoContainer.innerHTML = `<input type="text" id="subtipoMaterial" required placeholder="Escribe la variante..." class="w-full p-3 colex-input rounded-xl text-sm">`;
    } else {
        subtipoContainer.innerHTML = `<select id="subtipoMaterial" required class="w-full p-3 colex-input rounded-xl text-sm"><option value="" class="bg-gray-900">Selecciona variante...</option></select>`;
        const subtipoSelect = document.getElementById('subtipoMaterial');
        if (categoria && SUBTIPOS_MAP[categoria]) {
            SUBTIPOS_MAP[categoria].forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                opt.className = 'bg-gray-900';
                subtipoSelect.appendChild(opt);
            });
        }
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

// ================= CRUD (SUPABASE) =================
async function cargarColeccion() {
    if (!dbClient) return;
    try {
        const { data, error } = await dbClient
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
    if (event) event.preventDefault();
    if (!dbClient) return;

    const id = document.getElementById('editObraId').value;
    const urlDirecta = document.getElementById('portadaUrl').value;
    const portadaFinal = base64Comprimido || urlDirecta || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';

    const tipoCat = document.getElementById('tipoMaterial').value;
    const esLibro = (tipoCat === 'Cómic / Manga / Libro / Fanzine / Revista');
    const subtipoElem = document.getElementById('subtipoMaterial');

    const payload = {
        titulo: document.getElementById('titulo').value,
        numero: document.getElementById('numero').value,
        anio: parseInt(document.getElementById('anio').value) || null,
        tipo_material: tipoCat,
        subtipo_material: subtipoElem ? subtipoElem.value : '',
        leido: esLibro ? document.getElementById('chkLeido').checked : false,
        estrellas: parseInt(document.getElementById('estrellas').value) || 0,
        autor: document.getElementById('autor').value,
        editorial: document.getElementById('editorial').value,
        estado_fisico: document.getElementById('estadoFisico').value,
        valor_manual: parseFloat(document.getElementById('valorManual').value) || 0.00,
        portada_url: portadaFinal,
        notas: document.getElementById('notas').value
    };

    try {
        if (id) {
            const { error } = await dbClient.from('obras').update(payload).eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await dbClient.from('obras').insert([payload]);
            if (error) throw error;
        }

        await cargarColeccion();
        irAColeccion();
    } catch (err) {
        alert('Error al guardar el ítem: ' + err.message);
    }
}

async function eliminarObra(id) {
    if (modoVitrinaActivo || !dbClient) return;
    if (!confirm('¿Deseas eliminar este coleccionable?')) return;

    try {
        const { error } = await dbClient.from('obras').delete().eq('id', id);
        if (error) throw error;

        await cargarColeccion();
        irAColeccion();
    } catch (err) {
        alert('Error al eliminar: ' + err.message);
    }
}

// ================= RENDERIZADO =================
function generarEstrellasHtml(numEstrellas) {
    if (!numEstrellas || numEstrellas <= 0) return '';
    let html = `<span class="text-xs font-bold inline-flex items-center space-x-0.5">`;
    for (let i = 1; i <= 5; i++) {
        if (i <= numEstrellas) {
            html += `<span style="color: #fbbf24 !important;">★</span>`;
        } else {
            html += `<span class="opacity-30" style="color: #64748b !important;">★</span>`;
        }
    }
    html += `</span>`;
    return html;
}

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
        const estrellasHtml = generarEstrellasHtml(item.estrellas);

        const card = document.createElement('div');
        card.className = 'colex-card p-3 rounded-2xl flex items-center justify-between gap-3 shadow-md hover:border-amber-600 transition cursor-pointer relative';
        card.onclick = () => verDetalle(item.id);

        card.innerHTML = `
            <div class="flex items-center space-x-3 overflow-hidden">
                <img src="${item.portada_url}" class="w-16 h-20 object-cover rounded-xl border border-gray-700 flex-shrink-0" alt="Portada">
                <div class="overflow-hidden space-y-1">
                    <h3 class="font-bold text-sm text-gray-100 truncate">${item.titulo}</h3>
                    <p class="text-xs text-amber-custom truncate">${item.autor || 'Sin Autor'} ${item.numero ? `(${item.numero})` : ''}</p>
                    <div class="flex items-center space-x-2">
                        <span class="bg-gray-800 text-gray-300 px-2 py-0.5 rounded-md text-[10px] font-semibold">${item.subtipo_material || item.tipo_material}</span>
                        ${esLectura ? (item.leido ? `<span class="text-xs">📖 ✅</span>` : `<span class="text-xs opacity-50">📖 ⏳</span>`) : ''}
                        ${estrellasHtml}
                    </div>
                </div>
            </div>
            <div class="text-right flex-shrink-0">
                <span class="block font-bold text-amber-custom text-sm">$${(item.valor_manual || 0).toFixed(2)}</span>
                <span class="text-[10px] text-gray-400 block">${item.anio || ''}</span>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

function verDetalle(id) {
    const item = mapaObras[id];
    const contenedor = document.getElementById('detalleContent');
    if (!contenedor || !item) return;
    
    const esLectura = (item.tipo_material === 'Cómic / Manga / Libro / Fanzine / Revista');
    
    contenedor.innerHTML = `
        <div class="flex flex-col items-center space-y-3">
            <img src="${item.portada_url}" class="w-48 h-64 object-cover rounded-2xl shadow-2xl border-2 border-amber-600/50">
            <h2 class="text-2xl font-black text-amber-custom text-center leading-tight">${item.titulo}</h2>
        </div>

        <div class="colex-card p-4 rounded-2xl space-y-2.5 text-xs">
            <div class="flex justify-between border-b border-gray-700 pb-1.5"><span class="text-gray-400">Categoría:</span><span class="text-gray-200 font-bold">${item.tipo_material}</span></div>
            <div class="flex justify-between border-b border-gray-700 pb-1.5"><span class="text-gray-400">Variante:</span><span class="text-gray-200 font-bold">${item.subtipo_material || 'N/A'}</span></div>
            ${esLectura ? `<div class="flex justify-between border-b border-gray-700 pb-1.5"><span class="text-gray-400">Lectura:</span><span class="font-bold ${item.leido ? 'text-green-400' : 'text-amber-400'}">${item.leido ? 'Leído' : 'Pendiente'}</span></div>` : ''}
            <div class="flex justify-between border-b border-gray-700 pb-1.5"><span class="text-gray-400">Autor:</span><span class="text-gray-200">${item.autor || 'N/A'}</span></div>
            <div class="flex justify-between border-b border-gray-700 pb-1.5"><span class="text-gray-400">Editorial:</span><span class="text-gray-200">${item.editorial || 'N/A'}</span></div>
            <div class="flex justify-between border-b border-gray-700 pb-1.5"><span class="text-gray-400">Precio Estimado:</span><span class="text-amber-custom font-bold">$${(item.valor_manual || 0).toFixed(2)}</span></div>
            ${item.notas ? `<div class="pt-1"><span class="text-gray-400 block mb-1">Notas:</span><p class="text-gray-300 italic bg-gray-900/60 p-2.5 rounded-xl">${item.notas}</p></div>` : ''}
        </div>

        <div class="flex space-x-3 pt-2 admin-only">
            <button onclick="irAFormulario(${item.id})" class="flex-1 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl transition cursor-pointer">Editar</button>
            <button onclick="eliminarObra(${item.id})" class="flex-1 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl transition cursor-pointer">Eliminar</button>
        </div>
    `;
    cambiarPantalla('viewDetalle');
}

function buscar(query) {
    const q = query.toLowerCase().trim();
    coleccionFiltrada = coleccionData.filter(item => 
        (item.titulo && item.titulo.toLowerCase().includes(q)) ||
        (item.autor && item.autor.toLowerCase().includes(q)) ||
        (item.editorial && item.editorial.toLowerCase().includes(q))
    );
    renderizarColeccion(coleccionFiltrada);
}

function ordenarColeccion(criterio) {
    if (criterio === 'recientes') coleccionFiltrada.sort((a, b) => b.id - a.id);
    else if (criterio === 'alfabetico') coleccionFiltrada.sort((a, b) => a.titulo.localeCompare(b.titulo));
    else if (criterio === 'precio-desc') coleccionFiltrada.sort((a, b) => (b.valor_manual || 0) - (a.valor_manual || 0));
    else if (criterio === 'precio-asc') coleccionFiltrada.sort((a, b) => (a.valor_manual || 0) - (b.valor_manual || 0));
    else if (criterio === 'anio') coleccionFiltrada.sort((a, b) => (b.anio || 0) - (a.anio || 0));
    else if (criterio === 'estrellas') coleccionFiltrada.sort((a, b) => (b.estrellas || 0) - (a.estrellas || 0));
    renderizarColeccion(coleccionFiltrada);
}

function aplicarFiltros() {
    const tipo = document.getElementById('filtroTipo').value;
    const editorial = document.getElementById('filtroEditorial').value.toLowerCase().trim();
    const precioMax = parseFloat(document.getElementById('filtroPrecio').value);

    coleccionFiltrada = coleccionData.filter(item => {
        let cumple = true;
        if (tipo && item.tipo_material !== tipo) cumple = false;
        if (editorial && (!item.editorial || !item.editorial.toLowerCase().includes(editorial))) cumple = false;
        if (!isNaN(precioMax) && (item.valor_manual || 0) > precioMax) cumple = false;
        return cumple;
    });
    renderizarColeccion(coleccionFiltrada);
    irAColeccion();
}

function limpiarFiltros() {
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroEditorial').value = '';
    document.getElementById('filtroPrecio').value = '';
    coleccionFiltrada = [...coleccionData];
    renderizarColeccion(coleccionFiltrada);
    irAColeccion();
}

function calcularEstadisticas() {
    const totalItems = coleccionFiltrada.length;
    const valorTotal = coleccionFiltrada.reduce((acc, curr) => acc + (curr.valor_manual || 0), 0);
    document.getElementById('statTotal').innerText = `${totalItems} / ${coleccionData.length}`;
    document.getElementById('statValor').innerText = `$${valorTotal.toFixed(2)}`;
}

function exportarCSV() {
    if (coleccionFiltrada.length === 0) return alert('No hay datos.');
    let csv = 'ID,Título,Categoría,Precio\n';
    coleccionFiltrada.forEach(i => { csv += `"${i.id}","${i.titulo}","${i.tipo_material}","${i.valor_manual||0}"\n`; });
    descargarArchivo(csv, 'colex.csv', 'text/csv');
}

function exportarExcel() { exportarCSV(); }

function exportarPDF() {
    if (coleccionFiltrada.length === 0) return alert('No hay datos.');
    window.print();
}

function descargarArchivo(contenido, nombre, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    inicializarModoVitrina();
    cargarColeccion();
});
