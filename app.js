// app.js - ColeX Lógica Principal

document.addEventListener('DOMContentLoaded', () => {
    // Estado de la aplicación
    let obras = JSON.parse(localStorage.getItem('colex_obras')) || [];
    let imagenPortadaBase64 = '';

    // Manejo de pantallas (SPA Navigation)
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

    // Botones de navegación
    document.getElementById('navToAddBtn').addEventListener('click', () => { resetForm(); switchScreen('form'); });
    document.getElementById('navToAddBtnBottom').addEventListener('click', () => { resetForm(); switchScreen('form'); });
    document.getElementById('navToStatsBtn').addEventListener('click', () => { actualizarEstadisticas(); switchScreen('stats'); });
    document.getElementById('backFromForm').addEventListener('click', () => switchScreen('coleccion'));
    document.getElementById('backFromDetalle').addEventListener('click', () => switchScreen('coleccion'));
    document.getElementById('backFromStats').addEventListener('click', () => switchScreen('coleccion'));

    // Dinámica de Subtipos según Tipo de Material
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

    // Manejo de Archivo Local (Portada) y conversión a Base64
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
                urlInput.value = ''; // Limpiar URL si se usa archivo local
            };
            reader.readAsDataURL(file);
        } else {
            fileNameSpan.textContent = 'Sin archivo seleccionado';
            fileNameSpan.classList.remove('text-blue-600', 'font-medium');
            imagenPortadaBase64 = '';
        }
    });

    // Guardar Obra (Formulario)
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

    // Renderizar Lista Principal
    function renderizarColeccion(filtro = '') {
        const container = document.getElementById('listColeccion');
        container.innerHTML = '';

        const obrasFiltradas = obras.filter(o => 
            o.titulo.toLowerCase().includes(filtro.toLowerCase()) || 
            o.autor.toLowerCase().includes(filtro.toLowerCase())
        );

        if (obrasFiltradas.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-400 text-sm py-10">No hay obras registradas.</p>`;
            return;
        }

        obrasFiltradas.forEach(obra => {
            const card = document.createElement('div');
            card.className = "flex items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer gap-3";
            card.innerHTML = `
                <img src="${obra.portada}" alt="${obra.titulo}" class="w-14 h-16 object-cover rounded-xl bg-slate-100">
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-sm text-slate-900 truncate">${obra.titulo}</h4>
                    <p class="text-xs text-slate-500">${obra.autor} • <span class="text-blue-600 font-medium">${obra.tipo}</span></p>
                    <p class="text-[11px] text-slate-400 mt-0.5">${obra.editorial} (${obra.anio})</p>
                </div>
            `;
            card.addEventListener('click', () => verDetalleObra(obra.id));
            container.appendChild(card);
        });
    }

    // Ver Detalle de Obra
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
            renderizarColeccion();
            switchScreen('coleccion');
        };

        switchScreen('detalle');
    }

    // Buscador en tiempo real
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderizarColeccion(e.target.value);
    });

    // Actualizar Estadísticas
    function actualizarEstadisticas() {
        const totalObras = obras.length;
        const valorTotal = obras.reduce((acc, curr) => acc + curr.valor, 0);

        document.getElementById('statTotal').textContent = totalObras;
        document.getElementById('statValor').textContent = `$${valorTotal.toFixed(2)}`;
    }

    // Inicializar app renderizando la colección guardada
    renderizarColeccion();
});
