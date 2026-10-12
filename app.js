// app.js - ColeX Lógica Principal con Filtros y Exportación

document.addEventListener('DOMContentLoaded', () => {
    let obras = JSON.parse(localStorage.getItem('colex_obras')) || [];
    let obrasFiltradasGlobal = [...obras];
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

    tipoSelect.addEventListener('change', (e) => {
        const tipo = e.target.value;
        subtipoSelect.innerHTML = '<option value="">Seleccionar formato...</option>';
        if (subformatos[tipo]) {
            subtipoSelect.disabled = false;
            subformatos[tipo].forEach(sub => {
                const opt = document.createElement('option');
                opt.value = sub;
                opt.textContent = sub;
                subtipoSelect.appendChild(opt);
            });
        } else {
            subtipoSelect.disabled = true;
            subtipoSelect.innerHTML = '<option value="">Selecciona tipo primero...</option>';
        }
    });

    // Manejo de archivo local (Portada)
    const fileInput = document.getElementById('portadaFile');
    const fileNameSpan = document.getElementById('fileName');
    const urlInput = document.getElementById('portadaUrl');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameSpan.textContent = file.name;
            fileNameSpan.classList.add('text-blue-600', 'font-medium');
            const reader = new FileReader();
            reader.onload = function(uploadEvent) {
                imagenPortadaBase64 = uploadEvent.target.result;
                urlInput.value = '';
            };
            reader.readAsDataURL(file);
        } else {
            fileNameSpan.textContent = 'Sin archivo seleccionado';
            fileNameSpan.classList.remove('text-blue-600', 'font-medium');
            imagenPortadaBase64 = '';
        }
    });

    // Guardar Obra
    const formObra = document.getElementById('formObra');
    formObra.addEventListener('submit', (e) => {
        e.preventDefault();
        const finalPortada = imagenPortadaBase64 || urlInput.value.trim() || 'https://via.placeholder.com/150';

        const nuevaObra = {
            id: Date.now(),
            portada: finalPortada,
            titulo: document.getElementById('titulo').value,
            numero: document.getElementById('numero').value || 'N/A',
            anio: document.getElementById('anio').value || 'S/F',
            tipo: tipoSelect.value,
            subtipo: subtipoSelect.value,
            autor: document.getElementById('autor').value || 'Desconocido',
            editorial: document.getElementById('editorial').value || 'Independiente',
            estado: document.getElementById('estadoFisico').value,
            valor: parseFloat(document.getElementById('valorManual').value) || 0
        };

        obras.push(nuevaObra);
        localStorage.setItem('colex_obras', JSON.stringify(obras));
        obrasFiltradasGlobal = [...obras];

        renderizarColeccion();
        switchScreen('coleccion');
    });

    function resetForm() {
        formObra.reset();
        imagenPortadaBase64 = '';
        fileNameSpan.textContent = 'Sin archivo seleccionado';
        fileNameSpan.classList.remove('text-blue-600', 'font-medium');
        subtipoSelect.disabled = true;
        subtipoSelect.innerHTML = '<option value="">Selecciona tipo primero...</option>';
    }

    // Renderizar Colección Principal
    function renderizarColeccion(listaA_Renderizar = obras) {
        const container = document.getElementById('listColeccion');
        container.innerHTML = '';

        if (listaA_Renderizar.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-400 text-sm py-10">No se encontraron obras.</p>`;
            return;
        }

        listaA_Renderizar.forEach(obra => {
            const card = document.createElement('div');
            card.className = "flex items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer gap-3";
            card.innerHTML = `
                <img src="${obra.portada}" alt="${obra.titulo}" class="w-14 h-16 object-cover rounded-xl bg-slate-100">
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-sm text-slate-900 truncate">${obra.titulo}</h4>
                    <p class="text-xs text-slate-500">${obra.autor} • <span class="text-blue-600 font-medium">${obra.tipo}</span></p>
                    <p class="text-[11px] text-slate-400 mt-0.5">${obra.editorial} (${obra.anio}) - <strong class="text-slate-600">$${obra.valor.toFixed(2)}</strong></p>
                </div>
            `;
            card.addEventListener('click', () => verDetalleObra(obra.id));
            container.appendChild(card);
        });
    }

    // Ver Detalle
    function verDetalleObra(id) {
        const obra = obras.find(o => o.id === id);
        if (!obra) return;

        const detalleContent = document.getElementById('detalleContent');
        detalleContent.innerHTML = `
            <div class="flex flex-col items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <img src="${obra.portada}" alt="${obra.titulo}" class="w-36 h-48 object-cover rounded-xl shadow-md bg-slate-100">
                <div class="text-center">
                    <h3 class="text-lg font-bold text-slate-900">${obra.titulo} ${obra.numero !== 'N/A' ? obra.numero : ''}</h3>
                    <p class="text-sm text-slate-500">${obra.autor}</p>
                </div>
                <div class="w-full space-y-2 pt-2 border-t border-slate-100 text-sm">
                    <div class="flex justify-between"><span class="text-slate-500">Tipo:</span> <span class="font-semibold">${obra.tipo} (${obra.subtipo})</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Editorial:</span> <span class="font-semibold">${obra.editorial}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Año:</span> <span class="font-semibold">${obra.anio}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Estado:</span> <span class="font-semibold">${obra.estado}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Valor:</span> <span class="font-bold text-blue-600">$${obra.valor.toFixed(2)}</span></div>
                </div>
                <button id="btnEliminar" class="w-full py-2.5 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition cursor-pointer text-xs mt-2">Eliminar Obra</button>
            </div>
        `;

        document.getElementById('btnEliminar').onclick = () => {
            obras = obras.filter(o => o.id !== id);
            localStorage.setItem('colex_obras', JSON.stringify(obras));
            obrasFiltradasGlobal = [...obras];
            renderizarColeccion();
            switchScreen('coleccion');
        };

        switchScreen('detalle');
    }

    // Buscador rápido principal
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const texto = e.target.value.toLowerCase();
        const resultado = obras.filter(o => 
            o.titulo.toLowerCase().includes(texto) || 
            o.autor.toLowerCase().includes(texto) ||
            o.editorial.toLowerCase().includes(texto)
        );
        renderizarColeccion(resultado);
    });

    // Lógica de Filtros Avanzados
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

    // ================= FUNCIONES DE EXPORTACIÓN =================

    // 1. Exportar a CSV
    document.getElementById('btnExportCSV').addEventListener('click', () => {
        if (obrasFiltradasGlobal.length === 0) { alert('No hay datos para exportar.'); return; }
        
        let csvContent = "data:text/csv;charset=utf-8,ID,Titulo,Numero,Anio,Tipo,Subtipo,Autor,Editorial,Estado,Valor\n";
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

    // 2. Exportar a Excel (Formato XLS Compatible)
    document.getElementById('btnExportExcel').addEventListener('click', () => {
        if (obrasFiltradasGlobal.length === 0) { alert('No hay datos para exportar.'); return; }

        let htmlTabla = `<table>
            <tr><th>ID</th><th>Titulo</th><th>Numero</th><th>Anio</th><th>Tipo</th><th>Subtipo</th><th>Autor</th><th>Editorial</th><th>Estado</th><th>Valor</th></tr>`;
        
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

    // 3. Exportar a PDF (Mediante ventana de impresión optimizada)
    document.getElementById('btnExportPDF').addEventListener('click', () => {
        if (obrasFiltradasGlobal.length === 0) { alert('No hay datos para exportar.'); return; }

        let ventanaPrint = window.open('', '', 'height=600,width=800');
        ventanaPrint.document.write('<html><head><title>Reporte ColeX</title>');
        ventanaPrint.document.write('<style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px;} th{background-color:#2563eb;color:white;}</style>');
        ventanaPrint.document.write('</head><body>');
        ventanaPrint.document.write('<h2>Reporte de Colección - ColeX</h2>');
        ventanaPrint.document.write('<p>Total de obras listadas: ' + obrasFiltradasGlobal.length + '</p>');
        ventanaPrint.document.write('<table><thead><tr><th>Título</th><th>Autor</th><th>Tipo</th><th>Editorial</th><th>Año</th><th>Estado</th><th>Valor</th></tr></thead><tbody>');

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

    renderizarColeccion();
});
