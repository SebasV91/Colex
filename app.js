// ================= CONFIGURACIÓN SUPABASE SIN CONFLICTOS DE NOMBRE =================
const SUPABASE_URL = 'https://ljxhehuierhexvkveszr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o_m6elxMjBmViae-LChBfQ_G4BB8LAy';

let dbClient = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error('Error al inicializar cliente de datos:', e);
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

// Paleta de colores temáticos para las barras gráficas
const CATEGORIA_COLORES = {
    "Cómic / Manga / Libro / Fanzine / Revista": "bg-amber-500",
    "Cartas TCG": "bg-blue-500",
    "Vehículos a Escala (Hot Wheels)": "bg-red-500",
    "Figuras / Funkos / Estatuas": "bg-purple-500",
    "Videojuegos / Retro": "bg-green-500",
    "Música (LPs/Vinilos, CDs)": "bg-pink-500",
    "Otro": "bg-gray-400"
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
        subtipoContainer.innerHTML = `
            <input type="text" id="subtipoMaterial" required placeholder="Escribe el formato o variante..." class="w-full p-3 colex-input rounded-xl text-sm">
        `;
    } else {
        subtipoContainer.innerHTML = `
            <select id="subtipoMaterial" required class="w-full p-3 colex-input rounded-xl text-sm">
                <option value="" class="bg-gray-900">Selecciona variante...</option>
            </select>
        `;

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

// ================= OPERACIONES DE BASE DE DATOS (CRUD) =================
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
    if (!confirm('¿Estás seguro de que deseas eliminar este coleccionable?')) return;

    try {
        const { error } = await dbClient.from('obras').delete().eq('id', id);
        if (error) throw error;

        await cargarColeccion();
        irAColeccion();
    } catch (err) {
        alert('Error al eliminar: ' + err.message);
    }
}

// ================= RENDERIZADO Y BÚSQUEDA =================
function generarEstrellasHtml(numEstrellas, tamano = 'text-xs') {
    if (!numEstrellas || numEstrellas <= 0) return '';

    let html = `<span class="${tamano} font-bold inline-flex items-center space-x-0.5">`;
    for (let i = 1; i <= 5; i++) {
        if (i <= numEstrellas) {
            html += `<span style="color: #fbbf24 !important; text-shadow: 0 0 3px rgba(251, 191, 36, 0.4);">★</span>`;
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
        const estrellasHtml = generarEstrellasHtml(item.estrellas, 'text-xs');

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
                        ${esLectura ? (item.leido ? `<span class="text-xs" title="Leído">📖 ✅</span>` : `<span class="text-xs opacity-50" title="Pendiente">📖 ⏳</span>`) : ''}
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
    const numEstrellas = item.estrellas || 0;
    
    const estrellasHtml = numEstrellas > 0 
        ? `<div class="flex items-center justify-center gap-1 mt-1">
            ${generarEstrellasHtml(numEstrellas, 'text-lg')}
            <span class="text-xs text-gray-400 font-normal ml-1">(${numEstrellas}/5)</span>
           </div>`
        : '<span class="text-xs text-gray-500">Sin calificar</span>';

    contenedor.innerHTML = `
        <div class="flex flex-col items-center space-y-3">
            <img src="${item.portada_url}" class="w-48 h-64 object-cover rounded-2xl shadow-2xl border-2 border-amber-600/50">
            <h2 class="text-2xl font-black text-amber-custom text-center leading-tight">${item.titulo}</h2>
            ${estrellasHtml}
        </div>

        <div class="colex-card p-4 rounded-2xl space-y-2.5 text-xs">
            <div class="flex justify-between border-b border-gray-700 pb-1.5">
                <span class="text-gray-400 font-semibold">Categoría:</span>
                <span class="text-gray-200 font-bold">${item.tipo_material}</span>
            </div>
            <div class="flex justify-between border-b border-gray-700 pb-1.5">
                <span class="text-gray-400 font-semibold">Variante / Subtipo:</span>
                <span class="text-gray-200 font-bold">${item.subtipo_material || 'N/A'}</span>
            </div>
            ${esLectura ? `
            <div class="flex justify-between border-b border-gray-700 pb-1.5">
                <span class="text-gray-400 font-semibold">Estado de Lectura:</span>
                <span class="font-bold ${item.leido ? 'text-green-400' : 'text-amber-400'}">${item.leido ? '📖 Leído / Completado' : '⏳ Pendiente'}</span>
            </div>
            ` : ''}
            <div class="flex justify-between border-b border-gray-700 pb-1.5">
                <span class="text-gray-400 font-semibold">Número / Set:</span>
                <span class="text-gray-200">${item.numero || 'N/A'}</span>
            </div>
            <div class="flex justify-between border-b border-gray-700 pb-1.5">
                <span class="text-gray-400 font-semibold">Año:</span>
                <span class="text-gray-200">${item.anio || 'N/A'}</span>
            </div>
            <div class="flex justify-between border-b border-gray-700 pb-1.5">
                <span class="text-gray-400 font-semibold">Autor / Artista:</span>
                <span class="text-gray-200">${item.autor || 'N/A'}</span>
            </div>
            <div class="flex justify-between border-b border-gray-700 pb-1.5">
                <span class="text-gray-400 font-semibold">Editorial / Fabricante:</span>
                <span class="text-gray-200">${item.editorial || 'N/A'}</span>
            </div>
            <div class="flex justify-between border-b border-gray-700 pb-1.5">
                <span class="text-gray-400 font-semibold">Estado Físico:</span>
                <span class="text-gray-200">${item.estado_fisico || 'N/A'}</span>
            </div>
            <div class="flex justify-between border-b border-gray-700 pb-1.5">
                <span class="text-gray-400 font-semibold">Precio Estimado:</span>
                <span class="text-amber-custom font-bold text-sm">$${(item.valor_manual || 0).toFixed(2)}</span>
            </div>
            ${item.notas ? `
            <div class="pt-1">
                <span class="text-gray-400 font-semibold block mb-1">Notas / Observaciones:</span>
                <p class="text-gray-300 italic bg-gray-900/60 p-2.5 rounded-xl border border-gray-800">${item.notas}</p>
            </div>
            ` : ''}
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
        (item.editorial && item.editorial.toLowerCase().includes(q)) ||
        (item.subtipo_material && item.subtipo_material.toLowerCase().includes(q)) ||
        (item.notas && item.notas.toLowerCase().includes(q))
    );
    renderizarColeccion(coleccionFiltrada);
}

function ordenarColeccion(criterio) {
    if (criterio === 'recientes') {
        coleccionFiltrada.sort((a, b) => b.id - a.id);
    } else if (criterio === 'alfabetico') {
        coleccionFiltrada.sort((a, b) => a.titulo.localeCompare(b.titulo));
    } else if (criterio === 'precio-desc') {
        coleccionFiltrada.sort((a, b) => (b.valor_manual || 0) - (a.valor_manual || 0));
    } else if (criterio === 'precio-asc') {
        coleccionFiltrada.sort((a, b) => (a.valor_manual || 0) - (b.valor_manual || 0));
    } else if (criterio === 'anio') {
        coleccionFiltrada.sort((a, b) => (b.anio || 0) - (a.anio || 0));
    } else if (criterio === 'estrellas') {
        coleccionFiltrada.sort((a, b) => (b.estrellas || 0) - (a.estrellas || 0));
    }
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

// CÁLCULO Y RENDERIZADO DE GRÁFICOS VISUALES
function calcularEstadisticas() {
    const totalItems = coleccionFiltrada.length;
    const valorTotal = coleccionFiltrada.reduce((acc, curr) => acc + (curr.valor_manual || 0), 0);

    const statTotal = document.getElementById('statTotal');
    const statValor = document.getElementById('statValor');
    if (statTotal) statTotal.innerText = `${totalItems} / ${coleccionData.length}`;
    if (statValor) statValor.innerText = `$${valorTotal.toFixed(2)}`;

    // Acumuladores por categoría
    const desgloses = {};
    const valoresPorCat = {};

    coleccionFiltrada.forEach(item => {
        const cat = item.tipo_material || 'Otro';
        desgloses[cat] = (desgloses[cat] || 0) + 1;
        valoresPorCat[cat] = (valoresPorCat[cat] || 0) + (item.valor_manual || 0);
    });

    const contenedorGrafico = document.getElementById('statGraficoCategorias');
    if (!contenedorGrafico) return;
    contenedorGrafico.innerHTML = '';

    if (totalItems === 0) {
        contenedorGrafico.innerHTML = '<span class="text-xs text-gray-500 italic block">Sin datos disponibles para graficar.</span>';
        return;
    }

    Object.keys(desgloses).forEach(cat => {
        const cantidad = desgloses[cat];
        const valorCat = valoresPorCat[cat] || 0;
        const porcentaje = ((cantidad / totalItems) * 100).toFixed(1);
        const colorBarra = CATEGORIA_COLORES[cat] || 'bg-amber-600';

        const barBlock = document.createElement('div');
        barBlock.className = 'space-y-1';
        barBlock.innerHTML = `
            <div class="flex justify-between items-center text-[11px]">
                <span class="text-gray-300 font-semibold truncate max-w-[200px]" title="${cat}">${cat}</span>
                <span class="text-gray-400 font-medium">${cantidad} u. <span class="text-amber-custom font-bold">(${porcentaje}%)</span> — $${valorCat.toFixed(2)}</span>
            </div>
            <div class="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden border border-gray-700 flex">
                <div class="${colorBarra} h-2.5 rounded-full transition-all duration-500" style="width: ${porcentaje}%;"></div>
            </div>
        `;
        contenedorGrafico.appendChild(barBlock);
    });
}

function exportarCSV() {
    if (coleccionFiltrada.length === 0) return alert('No hay datos para exportar.');
    let csv = 'ID,Título,Número,Año,Categoría,Subtipo,Calificación,Autor,Editorial,Estado,Precio,Notas\n';
    coleccionFiltrada.forEach(i => {
        csv += `"${i.id}","${i.titulo}","${i.numero||''}","${i.anio||''}","${i.tipo_material}","${i.subtipo_material||''}","${i.estrellas||0}","${i.autor||''}","${i.editorial||''}","${i.estado_fisico||''}","${i.valor_manual||0}","${(i.notas||'').replace(/"/g, '""')}"\n`;
    });
    descargarArchivo(csv, 'coleccion_colex.csv', 'text/csv');
}

function exportarExcel() {
    exportarCSV();
}

// Generación de Reporte PDF
function exportarPDF() {
    if (coleccionFiltrada.length === 0) return alert('No hay datos filtrados para exportar a PDF.');

    const valorTotal = coleccionFiltrada.reduce((acc, curr) => acc + (curr.valor_manual || 0), 0);
    const fechaReporte = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    let filasTabla = '';
    coleccionFiltrada.forEach((item, index) => {
        filasTabla += `
            <tr style="border-bottom: 1px solid #e2e8f0; ${index % 2 === 0 ? 'background-color: #f8fafc;' : ''}">
                <td style="padding: 8px; text-align: center;">${item.id}</td>
                <td style="padding: 8px; font-weight: bold; color: #0f172a;">${item.titulo}</td>
                <td style="padding: 8px;">${item.tipo_material}</td>
                <td style="padding: 8px;">${item.subtipo_material || '-'}</td>
                <td style="padding: 8px;">${item.autor || '-'}</td>
                <td style="padding: 8px;">${item.editorial || '-'}</td>
                <td style="padding: 8px; text-align: center;">${item.anio || '-'}</td>
                <td style="padding: 8px; text-align: right; font-weight: bold; color: #b45309;">$${(item.valor_manual || 0).toFixed(2)}</td>
            </tr>
        `;
    });

    const ventanaImp = window.open('', '_blank');
    ventanaImp.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>ColeX - Reporte de Colección</title>
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 25px; color: #1e293b; background: #fff; }
                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #b45309; padding-bottom: 12px; margin-bottom: 20px; }
                .title { font-size: 24px; font-weight: 900; color: #b45309; }
                .meta { font-size: 12px; color: #64748b; }
                .summary { display: flex; gap: 20px; margin-bottom: 20px; background: #f1f5f9; padding: 12px 18px; border-radius: 8px; }
                .summary-item { font-size: 13px; font-weight: 600; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background-color: #0f172a; color: #fff; padding: 10px; text-align: left; }
                @media print {
                    @page { margin: 1.5cm; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="title">ColeX — Reporte de Colección</div>
                    <div class="meta">Generado el ${fechaReporte}</div>
                </div>
            </div>

            <div class="summary">
                <div class="summary-item">Ítems Filtrados: <span style="color:#b45309">${coleccionFiltrada.length} / ${coleccionData.length}</span></div>
                <div class="summary-item">Valor Total Estimado: <span style="color:#b45309">$${valorTotal.toFixed(2)}</span></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="text-align: center;">ID</th>
                        <th>Título</th>
                        <th>Categoría</th>
                        <th>Variante</th>
                        <th>Autor / Artista</th>
                        <th>Editorial / Fabricante</th>
                        <th style="text-align: center;">Año</th>
                        <th style="text-align: right;">Valor ($)</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasTabla}
                </tbody>
            </table>

            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `);
    ventanaImp.document.close();
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

// Inicialización de la App
document.addEventListener('DOMContentLoaded', () => {
    inicializarModoVitrina();
    cargarColeccion();
});
