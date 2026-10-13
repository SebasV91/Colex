// app.js - ColeX Multicoleccionista (Con Debug)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// ============================================================
// CREDENCIALES DE SUPABASE
// ============================================================
const SUPABASE_URL = 'https://ljxhehuierhexvkveszr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o_m6elxMjBmViae-LChBfQ_G4BB8LAy';
// ============================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function initColeX() {
    console.log("🚀 ColeX inicializado correctamente.");
    let obras = [];
    let obrasFiltradasGlobal = [];
    let imagenPortadaBase64 = '';

    const screens = {
        coleccion: document.getElementById('viewColeccion'),
        detalle: document.getElementById('viewDetalle'),
        form: document.getElementById('viewForm'),
        stats: document.getElementById('viewStats')
    };

    function switchScreen(screenName) {
        console.log("Cambiando a pantalla:", screenName);
        Object.values(screens).forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });
        if (screens[screenName]) {
            screens[screenName].classList.remove('hidden');
        }
    }

    async function cargarObras() {
        console.log("Cargando obras desde Supabase...");
        const { data, error } = await supabase.from('obras').select('*').order('id', { ascending: false });
        if (error) {
            console.error('Error al cargar de Supabase:', error.message);
            return;
        }
        obras = data || [];
        obrasFiltradasGlobal = [...obras];
        renderizarColeccion(obras);
    }

    const bindClick = (id, handler) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => {
                console.log(`Click detectado en elemento: ${id}`);
                handler(e);
            });
        } else {
            console.warn(`Advertencia: Elemento con id '${id}' no encontrado.`);
        }
    };

    // Registrar eventos de navegación
    bindClick('navToAddBtn', () => { resetForm(); switchScreen('form'); });
    bindClick('navToAddBtnBottom', () => { resetForm(); switchScreen('form'); });
    bindClick('navToStatsBtn', () => { actualizarEstadisticas(); switchScreen('stats'); });
    bindClick('backFromForm', () => switchScreen('coleccion'));
    bindClick('backFromDetalle', () => switchScreen('coleccion'));
    bindClick('backFromStats', () => switchScreen('coleccion'));

    const subformatos = {
        'Cómic / Manga / Libro': ['Grapa (Floppy)', 'Tomo Rústica (TPB)', 'Tomo Cartoné (Hardcover)', 'Tankoubon', 'Tapa Blanda', 'Tapa Dura'],
        'Cartas TCG': ['Holofoil / Rara', 'Común / Infrecuente', 'Secreta / Ultra Rara', 'Promo / Edición Especial'],
        'Vehículos a Escala (Hot Wheels)': ['Mainline', 'Treasure Hunt', 'Super Treasure Hunt', 'Edición Especial / Premium', 'Set de 5 Pack'],
        'Figuras / Funkos / Estatuas': ['Funko Pop', 'Action Figure (Articulada)', 'Estatua / PVC', 'Nendoroid', 'Busto / Diorama'],
        'Videojuegos / Retro': ['Formato Físico (Cartucho)', 'Formato Físico (Disco)', 'Edición Coleccionista', 'Consola / Hardware'],
        'Otro / Fanzine': ['Fanzine / Artesanal', 'Merchandising', 'Otro Coleccionable']
    };

    const labelConfig = {
        'Cómic / Manga / Libro': { editorial: 'Editorial', autor: 'Autor / Guionista', numero: 'Número / Tomo', placeholderEditorial: 'Ej. Marvel, Ivrea' },
        'Cartas TCG': { editorial: 'Juego / Marca', autor: 'Ilustrador / Artista', numero: 'Número / Set (ej. 025/102)', placeholderEditorial: 'Ej. Pokémon TCG, Yu-Gi-Oh' },
        'Vehículos a Escala (Hot Wheels)': { editorial: 'Fabricante / Marca', autor: 'Serie / Colección', numero: 'Número de Serie / Lote', placeholderEditorial: 'Ej. Mattel, Matchbox' },
        'Figuras / Funkos / Estatuas': { editorial: 'Fabricante / Marca', autor: 'Franquicia / Línea', numero: 'Número de Figura', placeholderEditorial: 'Ej. Funko, Bandai, Hot Toys' },
        'Videojuegos / Retro': { editorial: 'Desarrollador / Distribuidor', autor: 'Estudio / Creador', numero: 'Plataforma / Región', placeholderEditorial: 'Ej. Nintendo, Capcom' },
        'Otro / Fanzine': { editorial: 'Marca / Fabricante', autor: 'Autor / Creador', numero: 'Número / Referencia', placeholderEditorial: 'Ej. Independiente' }
    };

    const tipoSelect = document.getElementById('tipoMaterial');
    const subtipoSelect = document.getElementById('subtipoMaterial');

    function actualizarOpcionesSubtipoYEtiquetas(tipoSeleccionado, valorSubtipoActual = '') {
        if (!subtipoSelect) return;
        subtipoSelect.innerHTML = '<option value="">Seleccionar variante...</option>';
        
        const config = labelConfig[tipoSeleccionado] || { editorial: 'Editorial / Fabricante', autor: 'Autor / Artista', numero: 'Número / Set', placeholderEditorial: 'Ej. Marvel' };
        
        const lblEditorial = document.getElementById('lblEditorial');
        const inputEditorial = document.getElementById('editorial');
        const lblAutor = document.getElementById('lblAutor');
        const lblNumero = document.getElementById('lblNumero');

        if (lblEditorial) lblEditorial.textContent = config.editorial;
        if (inputEditorial) inputEditorial.placeholder = config.placeholderEditorial;
        if (lblAutor) lblAutor.textContent = config.autor;
        if (lblNumero) lblNumero.textContent = config.numero;

        if (subformatos[tipoSeleccionado]) {
            subtipoSelect.disabled = false;
            subformatos[tipoSeleccionado].forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                opt.className = "bg-gray-900";
                if (sub === valorSubtipoActual) opt.selected = true;
                subtipoSelect.appendChild(opt);
            });
        } else {
            subtipoSelect.disabled = true;
            subtipoSelect.innerHTML = '<option value="" class="bg-gray-900">Selecciona categoría primero...</option>';
        }
    }

    if (tipoSelect) {
        tipoSelect.addEventListener('change', (e) => actualizarOpcionesSubtipoYEtiquetas(e.target.value));
    }

    function comprimirImagen(file, maxAnchoAlto = 600, calidad = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > maxAnchoAlto) {
                            height = Math.round((height * maxAnchoAlto) / width);
                            width = maxAnchoAlto;
                        }
                    } else {
                        if (height > maxAnchoAlto) {
                            width = Math.round((width * maxAnchoAlto) / height);
                            height = maxAnchoAlto;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/webp', calidad));
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }

    const fileInput = document.getElementById('portadaFile');
    const fileNameSpan = document.getElementById('fileName');
    const urlInput = document.getElementById('portadaUrl');
    const compressBadge = document.getElementById('compressBadge');

    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                if (fileNameSpan) fileNameSpan.textContent = "Comprimiendo " + file.name + "...";
                if (compressBadge) compressBadge.classList.add('hidden');
                try {
                    imagenPortadaBase64 = await comprimirImagen(file, 600, 0.7);
                    if (fileNameSpan) {
                        fileNameSpan.textContent = file.name + " (Optimizada)";
                        fileNameSpan.classList.add('text-amber-300', 'font-medium');
                    }
                    if (compressBadge) compressBadge.classList.remove('hidden');
                    if (urlInput) urlInput.value = '';
                } catch (err) {
                    console.error("Error al comprimir imagen:", err);
                }
            }
        });
    }

    const formObra = document.getElementById('formObra');
    if (formObra) {
        formObra.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Formulario enviado...");
            const editId = document.getElementById('editObraId').value;
            const tituloIngresado = document.getElementById('titulo').value.trim();
            
            let finalPortada = imagenPortadaBase64 || (urlInput ? urlInput.value.trim() : '');
            if (!finalPortada) {
                finalPortada = editId ? (obras.find(o => String(o.id) === String(editId))?.portada || 'https://via.placeholder.com/150') : 'https://via.placeholder.com/150';
            }

            const datosObra = {
                titulo: tituloIngresado,
                numero: document.getElementById('numero').value || 'N/A',
                anio: document.getElementById('anio').value || 'S/F',
                tipo: tipoSelect ? tipoSelect.value : '',
                subtipo: subtipoSelect ? subtipoSelect.value : '',
                autor: document.getElementById('autor').value || 'Desconocido',
                editorial: document.getElementById('editorial').value.trim() || 'Independiente',
                estado: document.getElementById('estadoFisico').value,
                valor: parseFloat(document.getElementById('valorManual').value) || 0,
                portada: finalPortada
            };

            if (editId) {
                const { error } = await supabase.from('obras').update(datosObra).eq('id', Number(editId));
                if (error) { alert('Error al actualizar: ' + error.message); return; }
                const index = obras.findIndex(o => String(o.id) === String(editId));
                if (index !== -1) obras[index] = { id: Number(editId), ...datosObra };
            } else {
                const nuevaObra = { id: Date.now(), ...datosObra };
                const { error } = await supabase.from('obras').insert([nuevaObra]);
                if (error) { alert('Error al guardar: ' + error.message); return; }
                obras.unshift(nuevaObra);
            }

            obrasFiltradasGlobal = [...obras];
            renderizarColeccion(obras);
            switchScreen('coleccion');
        });
    }

    function resetForm() {
        if (formObra) formObra.reset();
        const editObraId = document.getElementById('editObraId');
        if (editObraId) editObraId.value = '';
        const formTitle = document.getElementById('formTitle');
        if (formTitle) formTitle.textContent = 'Agregar Coleccionable';
        const btnSubmitForm = document.getElementById('btnSubmitForm');
        if (btnSubmitForm) btnSubmitForm.textContent = 'Guardar Ítem';
        imagenPortadaBase64 = '';
        if (fileNameSpan) {
            fileNameSpan.textContent = 'Sin archivo seleccionado';
            fileNameSpan.classList.remove('text-amber-300', 'font-medium');
        }
        if (compressBadge) compressBadge.classList.add('hidden');
        if (subtipoSelect) {
            subtipoSelect.disabled = true;
            subtipoSelect.innerHTML = '<option value="" class="bg-gray-900">Selecciona categoría primero...</option>';
        }
        actualizarOpcionesSubtipoYEtiquetas('');
    }

    function cargarFormularioParaEditar(obra) {
        document.getElementById('editObraId').value = obra.id;
        document.getElementById('formTitle').textContent = 'Editar Coleccionable';
        document.getElementById('btnSubmitForm').textContent = 'Actualizar Ítem';
        document.getElementById('titulo').value = obra.titulo;
        document.getElementById('numero').value = obra.numero !== 'N/A' ? obra.numero : '';
        document.getElementById('anio').value = obra.anio !== 'S/F' ? obra.anio : '';
        if (tipoSelect) tipoSelect.value = obra.tipo;
        actualizarOpcionesSubtipoYEtiquetas(obra.tipo, obra.subtipo);
        document.getElementById('autor').value = obra.autor !== 'Desconocido' ? obra.autor : '';
        document.getElementById('editorial').value = obra.editorial !== 'Independiente' ? obra.editorial : '';
        document.getElementById('estadoFisico').value = obra.estado;
        document.getElementById('valorManual').value = obra.valor;
        if (obra.portada && obra.portada.startsWith('http')) {
            if (urlInput) urlInput.value = obra.portada;
            if (fileNameSpan) fileNameSpan.textContent = 'Usando URL actual';
        } else {
            if (urlInput) urlInput.value = '';
            if (fileNameSpan) fileNameSpan.textContent = 'Foto almacenada en el ítem';
        }
        imagenPortadaBase64 = '';
        if (compressBadge) compressBadge.classList.add('hidden');
        switchScreen('form');
    }

    function renderizarColeccion(listaA_Renderizar) {
        const container = document.getElementById('listColeccion');
        if (!container) return;
        container.innerHTML = '';

        if (!listaA_Renderizar || listaA_Renderizar.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-400 text-sm py-10">No se encontraron coleccionables.</p>`;
            return;
        }

        const gruposPorEditorial = {};
        listaA_Renderizar.forEach(obra => {
            const editorial = obra.editorial || 'Independiente';
            if (!gruposPorEditorial[editorial]) gruposPorEditorial[editorial] = [];
            gruposPorEditorial[editorial].push(obra);
        });

        Object.keys(gruposPorEditorial).sort().forEach(editorial => {
            const obrasDeEditorial = gruposPorEditorial[editorial];
            const seccionEditorial = document.createElement('div');
            seccionEditorial.className = "space-y-2 mb-4";
            seccionEditorial.innerHTML = `
                <div class="flex justify-between items-center px-1 border-b border-amber-900 pb-1">
                    <h3 class="text-xs font-bold text-amber-300 uppercase tracking-wider">🏷️ ${editorial}</h3>
                    <span class="text-[10px] colex-card text-amber-300 px-2 py-0.5 rounded-full border border-gray-700">${obrasDeEditorial.length} ítem${obrasDeEditorial.length > 1 ? 's' : ''}</span>
                </div>
            `;
            const listaTarjetas = document.createElement('div');
            listaTarjetas.className = "space-y-2.5";

            obrasDeEditorial.forEach(obra => {
                const card = document.createElement('div');
                card.className = "flex items-center colex-card hover:bg-gray-800 p-3 rounded-2xl shadow-sm transition cursor-pointer gap-3";
                card.innerHTML = `
                    <img src="${obra.portada}" alt="${obra.titulo}" class="w-14 h-16 object-cover rounded-xl bg-gray-900">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-sm text-gray-100 truncate">${obra.titulo}</h4>
                        <p class="text-xs text-gray-400">${obra.autor} • <span class="text-amber-300 font-medium">${obra.tipo}</span></p>
                        <p class="text-[11px] text-gray-400 mt-0.5">${obra.anio} - <strong class="text-amber-300">$${obra.valor.toFixed(2)}</strong></p>
                    </div>
                `;
                card.addEventListener('click', () => verDetalleObra(obra.id));
                listaTarjetas.appendChild(card);
            });
            seccionEditorial.appendChild(listaTarjetas);
            container.appendChild(seccionEditorial);
        });
    }

    function verDetalleObra(id) {
        const obra = obras.find(o => String(o.id) === String(id));
        if (!obra) return;
        const detalleContent = document.getElementById('detalleContent');
        if (!detalleContent) return;

        detalleContent.innerHTML = `
            <div class="flex flex-col items-center colex-card p-6 rounded-2xl shadow-sm space-y-4">
                <img src="${obra.portada}" alt="${obra.titulo}" class="w-36 h-48 object-cover rounded-xl shadow-md bg-gray-900">
                <div class="text-center">
                    <h3 class="text-lg font-bold text-gray-100">${obra.titulo} ${obra.numero !== 'N/A' ? obra.numero : ''}</h3>
                    <p class="text-sm text-gray-400">${obra.autor}</p>
                </div>
                <div class="w-full space-y-2 pt-2 border-t border-gray-700 text-sm">
                    <div class="flex justify-between"><span class="text-gray-400">Categoría:</span> <span class="font-semibold text-gray-200">${obra.tipo} (${obra.subtipo})</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Fabricante / Editorial:</span> <span class="font-semibold text-amber-300">${obra.editorial}</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Año:</span> <span class="font-semibold text-gray-200">${obra.anio}</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Estado:</span> <span class="font-semibold text-gray-200">${obra.estado}</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Precio Aprox:</span> <span class="font-bold text-amber-300">$${obra.valor.toFixed(2)}</span></div>
                </div>
                <div class="grid grid-cols-2 gap-2 w-full pt-2">
                    <button id="btnEditar" class="py-2.5 bg-amber-btn text-white font-semibold rounded-xl hover:bg-amber-600 transition cursor-pointer text-xs flex items-center justify-center gap-1">✏️ Editar Ítem</button>
                    <button id="btnEliminar" class="py-2.5 bg-red-900 text-red-200 font-semibold rounded-xl hover:bg-red-800 transition cursor-pointer text-xs border border-red-700">🗑️ Eliminar</button>
                </div>
            </div>
        `;

        bindClick('btnEditar', () => cargarFormularioParaEditar(obra));
        bindClick('btnEliminar', async () => {
            if (!confirm(`¿Estás seguro de eliminar "${obra.titulo}"?`)) return;
            const { error } = await supabase.from('obras').delete().eq('id', obra.id);
            if (error) { alert('Error al eliminar: ' + error.message); return; }
            obras = obras.filter(o => String(o.id) !== String(id));
            obrasFiltradasGlobal = [...obras];
            renderizarColeccion(obras);
            switchScreen('coleccion');
        });

        switchScreen('detalle');
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const texto = e.target.value.toLowerCase();
            const resultado = obras.filter(o => o.titulo.toLowerCase().includes(texto) || o.autor.toLowerCase().includes(texto) || o.editorial.toLowerCase().includes(texto));
            renderizarColeccion(resultado);
        });
    }

    bindClick('btnAplicarFiltros', () => {
        const tipoFiltro = document.getElementById('filtroTipo').value;
        const editorialFiltro = document.getElementById('filtroEditorial').value.toLowerCase();
        const precioMaxFiltro = parseFloat(document.getElementById('filtroPrecio').value);

        obrasFiltradasGlobal = obras.filter(o => {
            let cumpleTipo = tipoFiltro ? o.tipo === tipoFiltro : true;
            let cumpleEditorial = editorialFiltro ? o.editorial.toLowerCase().includes(editorialFiltro) : true;
            let cumplePrecio = !isNaN(precioMaxFiltro) ? o.valor <= precioMaxFiltro : true;
            return cumpleTipo && cumpleEditorial && cumplePrecio;
        });

        renderizarColeccion(obrasFiltradasGlobal);
        actualizarEstadisticas();
        switchScreen('coleccion');
    });

    bindClick('btnLimpiarFiltros', () => {
        document.getElementById('filtroTipo').value = '';
        document.getElementById('filtroEditorial').value = '';
        document.getElementById('filtroPrecio').value = '';
        obrasFiltradasGlobal = [...obras];
        renderizarColeccion(obras);
        actualizarEstadisticas();
    });

    function actualizarEstadisticas() {
        const statTotal = document.getElementById('statTotal');
        const statValor = document.getElementById('statValor');
        if (statTotal) statTotal.textContent = `${obrasFiltradasGlobal.length} / ${obras.length}`;
        const valorTotal = obrasFiltradasGlobal.reduce((acc, curr) => acc + curr.valor, 0);
        if (statValor) statValor.textContent = `$${valorTotal.toFixed(2)}`;
    }

    bindClick('btnExportCSV', () => {
        if (obrasFiltradasGlobal.length === 0) { alert('No hay datos para exportar.'); return; }
        let csvContent = "data:text/csv;charset=utf-8,ID,Titulo,Numero,Anio,Categoria,Variante,Autor,Editorial,Estado,PrecioAprox\n";
        obrasFiltradasGlobal.forEach(o => {
            csvContent += [o.id, `"${o.titulo}"`, o.numero, o.anio, `"${o.tipo}"`, `"${o.subtipo}"`, `"${o.autor}"`, `"${o.editorial}"`, o.estado, o.valor].join(",") + "\n";
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "colex_coleccion.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    bindClick('btnExportExcel', () => {
        if (obrasFiltradasGlobal.length === 0) { alert('No hay datos para exportar.'); return; }
        let htmlTabla = `<table><tr><th>ID</th><th>Titulo</th><th>Numero</th><th>Anio</th><th>Categoria</th><th>Variante</th><th>Autor</th><th>Editorial</th><th>Estado</th><th>Precio Aprox</th></tr>`;
        obrasFiltradasGlobal.forEach(o => {
            htmlTabla += `<tr><td>${o.id}</td><td>${o.titulo}</td><td>${o.numero}</td><td>${o.anio}</td><td>${o.tipo}</td><td>${o.subtipo}</td><td>${o.autor}</td><td>${o.editorial}</td><td>${o.estado}</td><td>${o.valor}</td></tr>`;
        });
        htmlTabla += `</table>`;
        const blob = new Blob([htmlTabla], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'colex_coleccion.xls';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    bindClick('btnExportPDF', () => {
        if (obrasFiltradasGlobal.length === 0) { alert('No hay datos para exportar.'); return; }
        let ventanaPrint = window.open('', '', 'height=600,width=800');
        ventanaPrint.document.write('<html><head><title>Reporte ColeX</title><style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px;} th{background-color:#b45309;color:white;}</style></head><body>');
        ventanaPrint.document.write('<h2>Reporte General de Colección - ColeX</h2><p>Total de ítems listados: ' + obrasFiltradasGlobal.length + '</p><table><thead><tr><th>Título</th><th>Autor</th><th>Categoría</th><th>Editorial</th><th>Año</th><th>Estado</th><th>Precio</th></tr></thead><tbody>');
        obrasFiltradasGlobal.forEach(o => {
            ventanaPrint.document.write(`<tr><td>${o.titulo}</td><td>${o.autor}</td><td>${o.tipo}</td><td>${o.editorial}</td><td>${o.anio}</td><td>${o.estado}</td><td>$${o.valor.toFixed(2)}</td></tr>`);
        });
        ventanaPrint.document.write('</tbody></table></body></html>');
        ventanaPrint.document.close();
        ventanaPrint.focus();
        setTimeout(() => { ventanaPrint.print(); ventanaPrint.close(); }, 500);
    });

    cargarObras();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initColeX);
} else {
    initColeX();
}
    // Carga inicial
    cargarObras();
});
