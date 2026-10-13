// app.js - ColeX (Global State Controller)

// ============================================================
// CREDENCIALES DE SUPABASE (REEMPLAZA CON TUS CLAVES REALES)
// ============================================================
const SUPABASE_URL = 'https://ljxhehuierhexvkveszr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o_m6elxMjBmViae-LChBfQ_G4BB8LAy';
// ============================================================

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.ColeXApp = {
    obras: [],
    obrasFiltradas: [],
    imagenPortadaBase64: '',

    init: async function() {
        console.log("🚀 ColeXApp lista e inicializada.");
        await this.cargarObras();
    },

    switchScreen: function(screenName) {
        const screens = ['viewColeccion', 'viewDetalle', 'viewForm', 'viewStats'];
        screens.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.classList.add('hidden');
        });
        const target = document.getElementById(screenName);
        if (target) target.classList.remove('hidden');
    },

    irAColeccion: function() { this.switchScreen('viewColeccion'); },
    irAFormulario: function() { this.resetForm(); this.switchScreen('viewForm'); },
    irAEstadisticas: function() { this.actualizarEstadisticas(); this.switchScreen('viewStats'); },

    cargarObras: async function() {
        const { data, error } = await supabase.from('obras').select('*').order('id', { ascending: false });
        if (error) {
            console.error('Error Supabase:', error.message);
            return;
        }
        this.obras = data || [];
        this.obrasFiltradas = [...this.obras];
        this.renderizarColeccion(this.obras);
    },

    renderizarColeccion: function(lista) {
        const container = document.getElementById('listColeccion');
        if (!container) return;
        container.innerHTML = '';

        if (!lista || lista.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-400 text-sm py-10">No se encontraron coleccionables.</p>`;
            return;
        }

        const grupos = {};
        lista.forEach(item => {
            const editorial = item.editorial || 'Independiente';
            if (!grupos[editorial]) grupos[editorial] = [];
            grupos[editorial].push(item);
        });

        Object.keys(grupos).sort().forEach(editorial => {
            const items = grupos[editorial];
            const seccion = document.createElement('div');
            seccion.className = "space-y-2 mb-4";
            seccion.innerHTML = `
                <div class="flex justify-between items-center px-1 border-b border-amber-900 pb-1">
                    <h3 class="text-xs font-bold text-amber-300 uppercase tracking-wider">🏷️ ${editorial}</h3>
                    <span class="text-[10px] colex-card text-amber-300 px-2 py-0.5 rounded-full border border-gray-700">${items.length} ítem${items.length > 1 ? 's' : ''}</span>
                </div>
            `;
            const listaTarjetas = document.createElement('div');
            listaTarjetas.className = "space-y-2.5";

            items.forEach(obra => {
                const card = document.createElement('div');
                card.className = "flex items-center colex-card hover:bg-gray-800 p-3 rounded-2xl shadow-sm transition cursor-pointer gap-3";
                card.onclick = () => ColeXApp.verDetalle(obra.id);
                card.innerHTML = `
                    <img src="${obra.portada}" alt="${obra.titulo}" class="w-14 h-16 object-cover rounded-xl bg-gray-900">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-sm text-gray-100 truncate">${obra.titulo}</h4>
                        <p class="text-xs text-gray-400">${obra.autor} • <span class="text-amber-300 font-medium">${obra.tipo}</span></p>
                        <p class="text-[11px] text-gray-400 mt-0.5">${obra.anio} - <strong class="text-amber-300">$${obra.valor.toFixed(2)}</strong></p>
                    </div>
                `;
                listaTarjetas.appendChild(card);
            });
            seccion.appendChild(listaTarjetas);
            container.appendChild(seccion);
        });
    },

    verDetalle: function(id) {
        const obra = this.obras.find(o => String(o.id) === String(id));
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
                    <button onclick="ColeXApp.cargarEditar(${obra.id})" class="py-2.5 bg-amber-btn text-white font-semibold rounded-xl hover:bg-amber-600 transition cursor-pointer text-xs flex items-center justify-center gap-1">✏️ Editar Ítem</button>
                    <button onclick="ColeXApp.eliminarObra(${obra.id})" class="py-2.5 bg-red-900 text-red-200 font-semibold rounded-xl hover:bg-red-800 transition cursor-pointer text-xs border border-red-700">🗑️ Eliminar</button>
                </div>
            </div>
        `;
        this.switchScreen('viewDetalle');
    },

    cambiarTipo: function(tipo) {
        const subtipoSelect = document.getElementById('subtipoMaterial');
        if (!subtipoSelect) return;

        const subformatos = {
            'Cómic / Manga / Libro': ['Grapa (Floppy)', 'Tomo Rústica (TPB)', 'Tomo Cartoné (Hardcover)', 'Tankoubon', 'Tapa Blanda', 'Tapa Dura'],
            'Cartas TCG': ['Holofoil / Rara', 'Común / Infrecuente', 'Secreta / Ultra Rara', 'Promo / Edición Especial'],
            'Vehículos a Escala (Hot Wheels)': ['Mainline', 'Treasure Hunt', 'Super Treasure Hunt', 'Edición Especial / Premium', 'Set de 5 Pack'],
            'Figuras / Funkos / Estatuas': ['Funko Pop', 'Action Figure (Articulada)', 'Estatua / PVC', 'Nendoroid', 'Busto / Diorama'],
            'Videojuegos / Retro': ['Formato Físico (Cartucho)', 'Formato Físico (Disco)', 'Edición Coleccionista', 'Consola / Hardware'],
            'Otro / Fanzine': ['Fanzine / Artesanal', 'Merchandising', 'Otro Coleccionable']
        };

        subtipoSelect.innerHTML = '<option value="" class="bg-gray-900">Seleccionar variante...</option>';
        if (subformatos[tipo]) {
            subtipoSelect.disabled = false;
            subformatos[tipo].forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                opt.className = "bg-gray-900";
                subtipoSelect.appendChild(opt);
            });
        } else {
            subtipoSelect.disabled = true;
        }
    },

    procesarArchivo: async function(input) {
        const file = input.files[0];
        const span = document.getElementById('fileName');
        const badge = document.getElementById('compressBadge');
        if (file) {
            if (span) span.textContent = "Comprimiendo " + file.name + "...";
            try {
                this.imagenPortadaBase64 = await this.comprimir(file);
                if (span) {
                    span.textContent = file.name + " (Optimizada)";
                    span.classList.add('text-amber-300', 'font-medium');
                }
                if (badge) badge.classList.remove('hidden');
                document.getElementById('portadaUrl').value = '';
            } catch (err) {
                console.error(err);
            }
        }
    },

    comprimir: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    let w = img.width, h = img.height;
                    const max = 600;
                    if (w > h && w > max) { h = Math.round((h * max) / w); w = max; }
                    else if (h > max) { w = Math.round((w * max) / h); h = max; }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/webp', 0.7));
                };
            };
        });
    },

    guardarObra: async function(e) {
        e.preventDefault();
        const editId = document.getElementById('editObraId').value;
        const titulo = document.getElementById('titulo').value.trim();
        const urlInput = document.getElementById('portadaUrl').value.trim();

        let finalPortada = this.imagenPortadaBase64 || urlInput;
        if (!finalPortada) {
            finalPortada = editId ? (this.obras.find(o => String(o.id) === String(editId))?.portada || 'https://via.placeholder.com/150') : 'https://via.placeholder.com/150';
        }

        const datosObra = {
            titulo: titulo,
            numero: document.getElementById('numero').value || 'N/A',
            anio: document.getElementById('anio').value || 'S/F',
            tipo: document.getElementById('tipoMaterial').value,
            subtipo: document.getElementById('subtipoMaterial').value,
            autor: document.getElementById('autor').value || 'Desconocido',
            editorial: document.getElementById('editorial').value.trim() || 'Independiente',
            estado: document.getElementById('estadoFisico').value,
            valor: parseFloat(document.getElementById('valorManual').value) || 0,
            portada: finalPortada
        };

        if (editId) {
            const { error } = await supabase.from('obras').update(datosObra).eq('id', Number(editId));
            if (error) { alert('Error: ' + error.message); return; }
        } else {
            const nueva = { id: Date.now(), ...datosObra };
            const { error } = await supabase.from('obras').insert([nueva]);
            if (error) { alert('Error: ' + error.message); return; }
        }

        await this.cargarObras();
        this.switchScreen('viewColeccion');
    },

    resetForm: function() {
        document.getElementById('formObra').reset();
        document.getElementById('editObraId').value = '';
        document.getElementById('formTitle').textContent = 'Agregar Coleccionable';
        document.getElementById('btnSubmitForm').textContent = 'Guardar Ítem';
        this.imagenPortadaBase64 = '';
        document.getElementById('fileName').textContent = 'Sin archivo seleccionado';
        document.getElementById('compressBadge').classList.add('hidden');
    },

    cargarEditar: function(id) {
        const obra = this.obras.find(o => String(o.id) === String(id));
        if (!obra) return;
        document.getElementById('editObraId').value = obra.id;
        document.getElementById('formTitle').textContent = 'Editar Coleccionable';
        document.getElementById('btnSubmitForm').textContent = 'Actualizar Ítem';
        document.getElementById('titulo').value = obra.titulo;
        document.getElementById('numero').value = obra.numero !== 'N/A' ? obra.numero : '';
        document.getElementById('anio').value = obra.anio !== 'S/F' ? obra.anio : '';
        document.getElementById('tipoMaterial').value = obra.tipo;
        this.cambiarTipo(obra.tipo);
        document.getElementById('subtipoMaterial').value = obra.subtipo;
        document.getElementById('autor').value = obra.autor !== 'Desconocido' ? obra.autor : '';
        document.getElementById('editorial').value = obra.editorial !== 'Independiente' ? obra.editorial : '';
        document.getElementById('estadoFisico').value = obra.estado;
        document.getElementById('valorManual').value = obra.valor;
        this.switchScreen('viewForm');
    },

    eliminarObra: async function(id) {
        if (!confirm('¿Eliminar este ítem?')) return;
        const { error } = await supabase.from('obras').delete().eq('id', Number(id));
        if (error) { alert('Error: ' + error.message); return; }
        await this.cargarObras();
        this.switchScreen('viewColeccion');
    },

    buscar: function(texto) {
        const res = this.obras.filter(o => 
            o.titulo.toLowerCase().includes(texto.toLowerCase()) ||
            o.autor.toLowerCase().includes(texto.toLowerCase()) ||
            o.editorial.toLowerCase().includes(texto.toLowerCase())
        );
        this.renderizarColeccion(res);
    },

    aplicarFiltros: function() {
        const tipo = document.getElementById('filtroTipo').value;
        const editorial = document.getElementById('filtroEditorial').value.toLowerCase();
        const precio = parseFloat(document.getElementById('filtroPrecio').value);

        this.obrasFiltradas = this.obras.filter(o => {
            const matchTipo = tipo ? o.tipo === tipo : true;
            const matchEd = editorial ? o.editorial.toLowerCase().includes(editorial) : true;
            const matchPrecio = !isNaN(precio) ? o.valor <= precio : true;
            return matchTipo && matchEd && matchPrecio;
        });

        this.renderizarColeccion(this.obrasFiltradas);
        this.actualizarEstadisticas();
        this.switchScreen('viewColeccion');
    },

    limpiarFiltros: function() {
        document.getElementById('filtroTipo').value = '';
        document.getElementById('filtroEditorial').value = '';
        document.getElementById('filtroPrecio').value = '';
        this.obrasFiltradas = [...this.obras];
        this.renderizarColeccion(this.obras);
        this.actualizarEstadisticas();
    },

    actualizarEstadisticas: function() {
        document.getElementById('statTotal').textContent = `${this.obrasFiltradas.length} / ${this.obras.length}`;
        const total = this.obrasFiltradas.reduce((acc, curr) => acc + curr.valor, 0);
        document.getElementById('statValor').textContent = `$${total.toFixed(2)}`;
    },

    exportarCSV: function() {
        let csv = "data:text/csv;charset=utf-8,ID,Titulo,Numero,Anio,Categoria,Variante,Autor,Editorial,Estado,Precio\n";
        this.obrasFiltradas.forEach(o => {
            csv += [o.id, `"${o.titulo}"`, o.numero, o.anio, `"${o.tipo}"`, `"${o.subtipo}"`, `"${o.autor}"`, `"${o.editorial}"`, o.estado, o.valor].join(",") + "\n";
        });
        const a = document.createElement("a");
        a.href = encodeURI(csv);
        a.download = "colex.csv";
        a.click();
    },

    exportarExcel: function() {
        let tabla = `<table><tr><th>ID</th><th>Titulo</th><th>Numero</th><th>Anio</th><th>Categoria</th><th>Variante</th><th>Autor</th><th>Editorial</th><th>Estado</th><th>Precio</th></tr>`;
        this.obrasFiltradas.forEach(o => {
            tabla += `<tr><td>${o.id}</td><td>${o.titulo}</td><td>${o.numero}</td><td>${o.anio}</td><td>${o.tipo}</td><td>${o.subtipo}</td><td>${o.autor}</td><td>${o.editorial}</td><td>${o.estado}</td><td>${o.valor}</td></tr>`;
        });
        tabla += `</table>`;
        const blob = new Blob([tabla], { type: 'application/vnd.ms-excel' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'colex.xls';
        a.click();
    },

    exportarPDF: function() {
        let win = window.open('', '', 'height=600,width=800');
        win.document.write('<html><head><title>ColeX</title></head><body><h2>Reporte ColeX</h2><table>');
        this.obrasFiltradas.forEach(o => {
            win.document.write(`<tr><td>${o.titulo}</td><td>${o.tipo}</td><td>$${o.valor}</td></tr>`);
        });
        win.document.write('</table></body></html>');
        win.document.close();
        win.print();
    }
};

document.addEventListener('DOMContentLoaded', () => ColeXApp.init());
}
    // Carga inicial
    cargarObras();
});
