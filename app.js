// app.js - ColeX con Compresión de Imágenes HTML5 Canvas y Edición de Obras

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// ============================================================
// CREDENCIALES DE SUPABASE
// ============================================================
const SUPABASE_URL = 'https://ljxhehuierhexvkveszr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o_m6elxMjBmViae-LChBfQ_G4BB8LAy';
// ============================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
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
        Object.values(screens).forEach(screen => screen.classList.add('hidden'));
        if (screens[screenName]) {
            screens[screenName].classList.remove('hidden');
        }
    }

    // Cargar datos desde Supabase al iniciar
    async function cargarObras() {
        const { data, error } = await supabase.from('obras').select('*').order('id', { ascending: false });
        if (error) {
            console.error('Error al cargar de Supabase:', error);
            return;
        }
        obras = data || [];
        obrasFiltradasGlobal = [...obras];
        renderizarColeccion(obras);
    }

    // Navegación
    document.getElementById('navToAddBtn').addEventListener('click', () => { resetForm(); switchScreen('form'); });
    document.getElementById('navToAddBtnBottom').addEventListener('click', () => { resetForm(); switchScreen('form'); });
    document.getElementById('navToStatsBtn').addEventListener('click', () => { actualizarEstadisticas(); switchScreen('stats'); });
    document.getElementById('backFromForm').addEventListener('click', () => switchScreen('coleccion'));
    document.getElementById('backFromDetalle').addEventListener('click', () => switchScreen('coleccion'));
    document.getElementById('backFromStats').addEventListener('click', () => switchScreen('coleccion'));

    // Subtipos de material
    const subformatos = {
        'Cómic': ['Grapa (Floppy)', 'Tomo Rústica (TPB)', 'Tomo Cartoné (Hardcover)'],
        'Novela Gráfica': ['Tomo Cartoné', 'Tomo Rústica'],
        'Manga': ['Tankoubon', 'Kanzenban', 'Bunkoban'],
        'Fanzine': ['Grapa Artesanal', 'Plegado'],
        'Libro': ['Tapa Dura', 'Tapa Blanda']
    };

    const tipoSelect = document.getElementById('tipoMaterial');
    const subtipoSelect = document.getElementById('subtipoMaterial');

    function actualizarOpcionesSubtipo(tipoSeleccionado, valorSubtipoActual = '') {
        subtipoSelect.innerHTML = '<option value="">Seleccionar formato...</option>';
        if (subformatos[tipoSeleccionado]) {
            subtipoSelect.disabled = false;
            subformatos[tipoSeleccionado].forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                if (sub === valorSubtipoActual) opt.selected = true;
                subtipoSelect.appendChild(opt);
            });
        } else {
            subtipoSelect.disabled = true;
            subtipoSelect.innerHTML = '<option value="">Selecciona tipo primero...</option>';
        }
    }

    tipoSelect.addEventListener('change', (e) => actualizarOpcionesSubtipo(e.target.value));

    // ================= FUNCIÓN DE COMPRESIÓN DE IMÁGENES =================
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

                    const compressedBase64 = canvas.toDataURL('image/webp', calidad);
                    resolve(compressedBase64);
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

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = "Comprimiendo " + file.name + "...";
            compressBadge.classList.add('hidden');

            try {
                imagenPortadaBase64 = await comprimirImagen(file, 600, 0.7);
                fileNameSpan.textContent = file.name + " (Optimizada)";
                fileNameSpan.classList.add('text-amber-400', 'font-medium');
                compressBadge.classList.remove('hidden');
                urlInput.value = '';
            } catch (err) {
                console.error("Error al comprimir:", err);
                fileNameSpan.textContent = "Error al procesar la imagen";
            }
        } else {
            fileNameSpan.textContent = 'Sin archivo seleccionado';
            fileNameSpan.classList.remove('text-amber-400', 'font-medium');
            compressBadge.classList.add('hidden');
            imagenPortadaBase64 = '';
        }
    });

    // Guardar o Editar Obra en Supabase
    const formObra = document.getElementById('formObra');
    formObra.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const editId = document.getElementById('editObraId').value;
        const tituloIngresado = document.getElementById('titulo').value.trim();
        
        // Validación anticopia (ignorando la misma obra en caso de edición)
        const tituloExistente = obras.some(o => o.titulo.toLowerCase() === tituloIngresado.toLowerCase() && String(o.id) !== String(editId));
        if (tituloExistente) {
            alert(`⚠️ Ya existe una obra registrada con el título "${tituloIngresado}".`);
            return;
        }

        let finalPortada = imagenPortadaBase64 || urlInput.value.trim();
        if (!finalPortada) {
            if (editId) {
                const obraExistente = obras.find(o => String(o.id) === String(editId));
                finalPortada = obraExistente ? obraExistente.portada : 'https://via.placeholder.com/150';
            } else {
                finalPortada = 'https://via.placeholder.com/150';
            }
        }

        const datosObra = {
            titulo: tituloIngresado,
            numero: document.getElementById('numero').value || 'N/A',
            anio: document.getElementById('anio').value || 'S/F',
            tipo: tipoSelect.value,
            subtipo: subtipoSelect.value,
            autor: document.getElementById('autor').value || 'Desconocido',
            editorial: document.getElementById('editorial').value.trim() || 'Independiente',
            estado: document.getElementById('estadoFisico').value,
            valor: parseFloat(document.getElementById('valorManual').value) || 0,
            portada: finalPortada
        };

        if (editId) {
            // MODO EDICIÓN (.update)
            const idNumber = Number(editId);
            const { error } = await supabase.from('obras').update(datosObra).eq('id', idNumber);
            if (error) {
                alert('Error al actualizar en la base de datos: ' + error.message);
                return;
            }
            const index = obras.findIndex(o => String(o.id) === String(editId));
            if (index !== -1) {
                obras[index] = { id: idNumber, ...datosObra };
            }
        } else {
            // MODO CREACIÓN (.insert)
            const nuevaObra = { id: Date.now(), ...datosObra };
            const { error } = await supabase.from('obras').insert([nuevaObra]);
            if (error) {
                alert('Error al guardar en la base de datos: ' + error.message);
                return;
            }
            obras.unshift(nuevaObra);
        }

        obrasFiltradasGlobal = [...obras];
        renderizarColeccion(obras);
        switchScreen('coleccion');
    });

    function resetForm() {
        formObra.reset();
        document.getElementById('editObraId').value = '';
        document.getElementById('formTitle').textContent = 'Agregar Obra';
        document.getElementById('btnSubmitForm').textContent = 'Guardar Obra';
        imagenPortadaBase64 = '';
        fileNameSpan.textContent = 'Sin archivo seleccionado';
        fileNameSpan.classList.remove('text-amber-400', 'font-medium');
        compressBadge.classList.add('hidden');
        subtipoSelect.disabled = true;
        subtipoSelect.innerHTML = '<option value="">Selecciona tipo primero...</option>';
    }

    // Cargar formulario con datos existentes para Editar
    function cargarFormularioParaEditar(obra) {
        document.getElementById('editObraId').value = obra.id;
        document.getElementById('formTitle').textContent = 'Editar Obra';
        document.getElementById('btnSubmitForm').textContent = 'Actualizar Obra';

        document.getElementById('titulo').value = obra.titulo;
        document.getElementById('numero').value = obra.numero !== 'N/A' ? obra.numero : '';
        document.getElementById('anio').value = obra.anio !== 'S/F' ? obra.anio : '';
        document.getElementById('tipoMaterial').value = obra.tipo;
        
        actualizarOpcionesSubtipo(obra.tipo, obra.subtipo);

        document.getElementById('autor').value = obra.autor !== 'Desconocido' ? obra.autor : '';
        document.getElementById('editorial').value = obra.editorial !== 'Independiente' ? obra.editorial : '';
        document.getElementById('estadoFisico').value = obra.estado;
        document.getElementById('valorManual').value = obra.valor;

        if (obra.portada && obra.portada.startsWith('http')) {
            document.getElementById('portadaUrl').value = obra.portada;
            fileNameSpan.textContent = 'Usando URL actual';
        } else {
            document.getElementById('portadaUrl').value = '';
            fileNameSpan.textContent = 'Portada almacenada en la obra';
        }

        imagenPortadaBase64 = '';
        compressBadge.classList.add('hidden');
        switchScreen('form');
    }

    // Renderizar Colección Agrupada por Editorial
    function renderizarColeccion(listaA_Renderizar) {
        const container = document.getElementById('listColeccion');
        container.innerHTML = '';

        if (!listaA_Renderizar || listaA_Renderizar.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-400 text-sm py-10">No se encontraron obras.</p>`;
            return;
        }

        const gruposPorEditorial = {};
        listaA_Renderizar.forEach(obra => {
            const editorial = obra.editorial || 'Independiente';
            if (!gruposPorEditorial[editorial]) {
                gruposPorEditorial[editorial] = [];
            }
            gruposPorEditorial[editorial].push(obra);
        });

        Object.keys(gruposPorEditorial).sort().forEach(editorial => {
            const obrasDeEditorial = gruposPorEditorial[editorial];

            const seccionEditorial = document.createElement('div');
            seccionEditorial.className = "space-y-2 mb-4";
            
            seccionEditorial.innerHTML = `
                <div class="flex justify-between items-center px-1 border-b border-amber-900/40 pb-1">
                    <h3 class="text-xs font-bold text-amber-200 uppercase tracking-wider">📚 ${editorial}</h3>
                    <span class="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full border border-slate-700">${obrasDeEditorial.length} obra${obrasDeEditorial.length > 1 ? 's' : ''}</span>
                </div>
            `;

            const listaTarjetas = document.createElement('div');
            listaTarjetas.className = "space-y-2.5";

            obrasDeEditorial.forEach(obra => {
                const card = document.createElement('div');
                card.className = "flex items-center bg-slate-800/80 hover:bg-slate-800 p-3 rounded-2xl border border-slate-700 shadow-sm hover:shadow-md transition cursor-pointer gap-3";
                card.innerHTML = `
                    <img src="${obra.portada}" alt="${obra.titulo}" class="w-14 h-16 object-cover rounded-xl bg-slate-900">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-sm text-amber-100 truncate">${obra.titulo}</h4>
                        <p class="text-xs text-slate-400">${obra.autor} • <span class="text-amber-400 font-medium">${obra.tipo}</span></p>
                        <p class="text-[11px] text-slate-500 mt-0.5">${obra.anio} - <strong class="text-amber-200">$${obra.valor.toFixed(2)}</strong></p>
                    </div>
                `;
                card.addEventListener('click', () => verDetalleObra(obra.id));
                listaTarjetas.appendChild(card);
            });

            seccionEditorial.appendChild(listaTarjetas);
            container.appendChild(seccionEditorial);
        });
    }

    // Ver Detalle con opciones de Editar y Eliminar
    function verDetalleObra(id) {
        const obra = obras.find(o => String(o.id) === String(id));
        if (!obra) return;

        const detalleContent = document.getElementById('detalleContent');
        detalleContent.innerHTML = `
            <div class="flex flex-col items-center bg-slate-800/80 p-6 rounded-2xl border border-slate-700 shadow-sm space-y-4">
                <img src="${obra.portada}" alt="${obra.titulo}" class="w-36 h-48 object-cover rounded-xl shadow-md bg-slate-900">
                <div class="text-center">
                    <h3 class="text-lg font-bold text-amber-100">${obra.titulo} ${obra.numero !== 'N/A' ? obra.numero : ''}</h3>
                    <p class="text-sm text-slate-400">${obra.autor}</p>
                </div>
                <div class="w-full space-y-2 pt-2 border-t border-slate-700 text-sm">
                    <div class="flex justify-between"><span class="text-slate-400">Tipo:</span> <span class="font-semibold text-slate-200">${obra.tipo} (${obra.subtipo})</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Editorial:</span> <span class="font-semibold text-amber-300">${obra.editorial}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Año:</span> <span class="font-semibold text-slate-200">${obra.anio}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Estado:</span> <span class="font-semibold text-slate-200">${obra.estado}</span></div>
                    <div class="flex justify-between"><span class="text-slate-400">Precio Aprox:</span> <span class="font-bold text-amber-400">$${obra.valor.toFixed(2)}</span></div>
                </div>

                <div class="grid grid-cols-2 gap-2 w-full pt-2">
                    <button id="btnEditar" class="py-2.5 bg-amber-700 text-white font-semibold rounded-xl hover:bg-amber-600 transition cursor-pointer text-xs flex items-center justify-center gap-1">
                        ✏️ Editar Obra
                    </button>
                    <button id="btnEliminar" class="py-2.5 bg-red-950/60 text-red-400 font-semibold rounded-xl hover:bg-red-900/80 transition cursor-pointer text-xs border border-red-900/50">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;

        document.getElementById('btnEditar').onclick = () => {
            cargarFormularioParaEditar(obra);
        };

        document.getElementById('btnEliminar').onclick = async () => {
            if (!confirm(`¿Estás seguro de eliminar "${obra.titulo}"?`)) return;
            const { error } = await supabase.from('obras').delete().eq('id', obra.id);
            if (error) {
                alert('Error al eliminar: ' + error.message);
                return;
            }
            obras = obras.filter(o => String(o.id) !== String(id));
            obrasFiltradasGlobal = [...obras];
            renderizarColeccion(obras);
            switchScreen('coleccion');
        };

        switchScreen('detalle');
    }

    // Buscador rápido
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const texto = e.target.value.toLowerCase();
        const resultado = obras.filter(o => 
            o.titulo.toLowerCase().includes(texto) || 
            o.autor.toLowerCase().includes(texto) ||
            o.editorial.toLowerCase().includes(texto)
        );
        renderizarColeccion(resultado);
    });

    // Filtros avanzados
    document.getElementById('btnAplicarFiltros').addEventListener('click', () => {
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

    document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
        document.getElementById('filtroTipo').value = '';
        document.getElementById('filtroEditorial').value = '';
        document.getElementById('filtroPrecio').value = '';
        obrasFiltradasGlobal = [...obras];
        renderizarColeccion(obras);
        actualizarEstadisticas();
    });

    function actualizarEstadisticas() {
        document.getElementById('statTotal').textContent = `${obrasFiltradasGlobal.length} / ${obras.length}`;
        const valorTotal = obrasFiltradasGlobal.reduce((acc, curr) => acc + curr.valor, 0);
        document.getElementById('statValor').textContent = `$${valorTotal.toFixed(2)}`;
    }

    // Exportaciones
    document.getElementById('btnExportCSV').addEventListener('click', () => {
        if (obrasFiltradasGlobal.length === 0) { alert('No hay datos para exportar.'); return; }
        let csvContent = "data:text/csv;charset=utf-8,ID,Titulo,Numero,Anio,Tipo,Subtipo,Autor,Editorial,Estado,PrecioAprox\n";
        obrasFiltradasGlobal.forEach(o => {
            let row = [o.id, `"${o.titulo}"`, o.numero, o.anio, `"${o.tipo}"`, `"${o.subtipo}"`, `"${o.autor}"`, `"${o.editorial}"`, o.estado, o.valor];
            csvContent += row.join(",") + "\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "colex_reporte.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    document.getElementById('btnExportExcel').addEventListener('click', () => {
        if (obrasFiltradasGlobal.length === 0) { alert('No hay datos para exportar.'); return; }
        let htmlTabla = `<table><tr><th>ID</th><th>Titulo</th><th>Numero</th><th>Anio</th><th>Tipo</th><th>Subtipo</th><th>Autor</th><th>Editorial</th><th>Estado</th><th>Precio Aprox</th></tr>`;
        obrasFiltradasGlobal.forEach(o => {
            htmlTabla += `<tr><td>${o.id}</td><td>${o.titulo}</td><td>${o.numero}</td><td>${o.anio}</td><td>${o.tipo}</td><td>${o.subtipo}</td><td>${o.autor}</td><td>${o.editorial}</td><td>${o.estado}</td><td>${o.valor}</td></tr>`;
        });
        htmlTabla += `</table>`;
        const blob = new Blob([htmlTabla], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'colex_reporte.xls';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    document.getElementById('btnExportPDF').addEventListener('click', () => {
        if (obrasFiltradasGlobal.length === 0) { alert('No hay datos para exportar.'); return; }
        let ventanaPrint = window.open('', '', 'height=600,width=800');
        ventanaPrint.document.write('<html><head><title>Reporte ColeX</title>');
        ventanaPrint.document.write('<style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px;} th{background-color:#b45309;color:white;}</style>');
        ventanaPrint.document.write('</head><body>');
        ventanaPrint.document.write('<h2>Reporte de Colección - ColeX</h2>');
        ventanaPrint.document.write('<p>Total de obras listadas: ' + obrasFiltradasGlobal.length + '</p>');
        ventanaPrint.document.write('<table><thead><tr><th>Título</th><th>Autor</th><th>Tipo</th><th>Editorial</th><th>Año</th><th>Estado</th><th>Precio Aprox</th></tr></thead><tbody>');
        obrasFiltradasGlobal.forEach(o => {
            ventanaPrint.document.write(`<tr><td>${o.titulo}</td><td>${o.autor}</td><td>${o.tipo}</td><td>${o.editorial}</td><td>${o.anio}</td><td>${o.estado}</td><td>$${o.valor.toFixed(2)}</td></tr>`);
        });
        ventanaPrint.document.write('</tbody></table></body></html>');
        ventanaPrint.document.close();
        ventanaPrint.focus();
        setTimeout(() => {
            ventanaPrint.print();
            ventanaPrint.close();
        }, 500);
    });

    // Carga inicial
    cargarObras();
});
