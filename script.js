const productosIniciales = [];

let productos = [];
let carrito = [];
let categoriaActual = 'todos';
let usuarioActual = null;
const numeroEmpresa = '5491164521118';
let historialBusquedas = JSON.parse(localStorage.getItem('historialBusquedas') || '[]');

async function cargarProductos() {
    try {
        const response = await fetch('productos.json');
        if (!response.ok) throw new Error('No se pudieron cargar los productos locales.');
        productos = await response.json();
    } catch (error) {
        console.error('Error cargando productos locales:', error);
        productos = productosIniciales.map((p, i) => ({ id: i + 1, ...p }));
    }
    mostrarProductos();
}

function mostrarProductos(productosFiltrados = productos) {
    const lista = document.getElementById('lista-productos');
    lista.innerHTML = '';
    productosFiltrados.forEach(producto => {
        const div = document.createElement('div');
        div.className = 'producto';
        div.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}">
            <h3>${producto.nombre}</h3>
            <p>${producto.descripcion}</p>
            <p class="price">$${producto.precio}</p>
            <div class="producto-actions">
                <button onclick="agregarAlCarrito('${producto.id}')">Agregar al Carrito</button>
                <a href="https://wa.me/${producto.whatsapp}?text=Hola,%20estoy%20interesado%20en%20${encodeURIComponent(producto.nombre)}.%20Precio:%20$${producto.precio}.%20Vendedor:%20${producto.whatsapp}.%20Empresa:%20${numeroEmpresa}" target="_blank">
                    <button class="whatsapp-btn">Contactar por WhatsApp</button>
                </a>
            </div>
        `;
        lista.appendChild(div);
    });
}

function filtrarCategoria(categoria) {
    categoriaActual = categoria;
    const filtrados = categoria === 'todos' ? productos : productos.filter(p => p.categoria === categoria);
    mostrarProductos(filtrados);
}

function buscarProductos() {
    const query = document.getElementById('busqueda').value.toLowerCase().trim();
    if (query) {
        historialBusquedas.push(query);
        localStorage.setItem('historialBusquedas', JSON.stringify(historialBusquedas));
    }
    let filtrados = productos.filter(p => p.nombre.toLowerCase().includes(query) || p.descripcion.toLowerCase().includes(query));
    if (categoriaActual !== 'todos') {
        filtrados = filtrados.filter(p => p.categoria === categoriaActual);
    }
    mostrarProductos(filtrados);
    mostrarRecomendaciones();
}

function mostrarRecomendaciones() {
    if (historialBusquedas.length === 0) return;
    const ultimasBusquedas = historialBusquedas.slice(-3);
    const categoriasBuscadas = productos
        .filter(p => ultimasBusquedas.some(b => p.nombre.toLowerCase().includes(b) || p.descripcion.toLowerCase().includes(b)))
        .map(p => p.categoria);
    const recomendados = productos
        .filter(p => categoriasBuscadas.includes(p.categoria) && !ultimasBusquedas.some(b => p.nombre.toLowerCase().includes(b)))
        .slice(0, 4);
    if (recomendados.length > 0) {
        const lista = document.getElementById('lista-productos');
        const recDiv = document.createElement('div');
        recDiv.innerHTML = '<h3>Productos Recomendados</h3>';
        recomendados.forEach(prod => {
            const div = document.createElement('div');
            div.className = 'producto';
            div.innerHTML = `
                <img src="${prod.imagen}" alt="${prod.nombre}">
                <h3>${prod.nombre}</h3>
                <p>${prod.descripcion}</p>
                <p class="price">$${prod.precio}</p>
                <div class="producto-actions">
                    <button onclick="agregarAlCarrito('${prod.id}')">Agregar al Carrito</button>
                    <a href="https://wa.me/${prod.whatsapp}?text=Hola,%20estoy%20interesado%20en%20${encodeURIComponent(prod.nombre)}.%20Precio:%20$${prod.precio}.%20Vendedor:%20${prod.whatsapp}.%20Empresa:%20${numeroEmpresa}" target="_blank">
                        <button class="whatsapp-btn">Contactar por WhatsApp</button>
                    </a>
                </div>
            `;
            recDiv.appendChild(div);
        });
        lista.appendChild(recDiv);
    }
}

function mostrarRegistro() {
    document.getElementById('registro').style.display = 'block';
    document.getElementById('panel-usuario').style.display = 'none';
}

function irAlInicio() {
    // Ocultar panel de usuario si está visible
    document.getElementById('registro').style.display = 'none';
    document.getElementById('panel-usuario').style.display = 'none';
    // Mostrar sección de productos
    document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
}

async function registrarUsuario(event) {
    event.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const whatsapp = document.getElementById('reg-whatsapp').value;

    try {
        // Intentar registrar en backend real
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password, whatsapp }),
        });
        if (response.ok) {
            const data = await response.json();
            usuarioActual = data;
        } else {
            throw new Error('Backend no disponible');
        }
    } catch (error) {
        // Usar localStorage como fallback
        console.log('Backend no disponible, usando localStorage');
        const usuario = { id: Date.now(), nombre, email, password, whatsapp };
        localStorage.setItem('usuarioActual', JSON.stringify(usuario));
        usuarioActual = usuario;
    }
    
    document.getElementById('registro').style.display = 'none';
    document.getElementById('panel-usuario').style.display = 'block';
    document.getElementById('usuario-nombre').textContent = nombre;
    alert('Registrado exitosamente. Ahora puedes subir productos.');
    document.getElementById('form-registro').reset();
}

document.getElementById('form-registro').addEventListener('submit', registrarUsuario);

// Cargar usuario si ya estaba registrado
window.addEventListener('load', () => {
    const usuarioGuardado = localStorage.getItem('usuarioActual');
    if (usuarioGuardado) {
        usuarioActual = JSON.parse(usuarioGuardado);
        document.getElementById('registro').style.display = 'none';
        document.getElementById('panel-usuario').style.display = 'block';
        document.getElementById('usuario-nombre').textContent = usuarioActual.nombre;
    }
});

function cerrarSesion() {
    localStorage.removeItem('usuarioActual');
    usuarioActual = null;
    document.getElementById('panel-usuario').style.display = 'none';
    document.getElementById('registro').style.display = 'block';
    document.getElementById('form-registro').reset();
    alert('Sesión cerrada.');
}

function mostrarJSONActualizado() {
    const jsonFormateado = JSON.stringify(productos, null, 2);
    const blob = new Blob([jsonFormateado], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Crear un enlace temporal para descargar
    const a = document.createElement('a');
    a.href = url;
    a.download = 'productos_actualizado.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Archivo productos_actualizado.json descargado. Reemplaza el contenido de productos.json con este archivo y súbelo a GitHub.');
}

function guardarProductosEnJSON() {
    if (productos.length === 0) {
        alert('No hay productos para guardar.');
        return;
    }
    
    mostrarJSONActualizado();
}


async function subirProducto(event) {
    event.preventDefault();
    if (!usuarioActual) {
        alert('Debes registrarte primero.');
        return;
    }
    const nombre = document.getElementById('prod-nombre').value;
    const descripcion = document.getElementById('prod-desc').value;
    const precio = parseFloat(document.getElementById('prod-precio').value);
    const categoria = document.getElementById('prod-categoria').value;
    const imagen = document.getElementById('prod-imagen').value;
    
    const nuevoProducto = {
        nombre,
        descripcion,
        precio,
        categoria,
        imagen,
        whatsapp: usuarioActual.whatsapp,
        usuario: usuarioActual.nombre,
    };

    try {
        // Intentar subir al backend real
        const response = await fetch('/api/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoProducto),
        });
        if (response.ok) {
            const data = await response.json();
            productos.push(data);
            alert('Producto subido exitosamente al servidor.');
        } else {
            throw new Error('Backend no disponible');
        }
    } catch (error) {
        // Usar almacenamiento local como fallback
        console.log('Backend no disponible, agregando localmente');
        const productoConId = {
            id: Math.max(...productos.map(p => p.id), 0) + 1,
            ...nuevoProducto
        };
        productos.push(productoConId);
        alert('Producto agregado localmente. Para guardarlo permanentemente, actualiza productos.json manualmente.');
        mostrarJSONActualizado();
    }
    
    mostrarProductos();
    document.getElementById('form-producto').reset();
}

document.getElementById('form-producto').addEventListener('submit', subirProducto);

function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id == id);
    if (!producto) return;
    const existente = carrito.find(item => item.id == id);
    if (existente) {
        existente.cantidad += 1;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }
    actualizarCarrito();
}

function actualizarCarrito() {
    const lista = document.getElementById('carrito-lista');
    lista.innerHTML = '';
    let total = 0;
    carrito.forEach(item => {
        const div = document.createElement('div');
        div.innerHTML = `<span>${item.nombre} x${item.cantidad} - $${item.precio * item.cantidad}</span>`;
        lista.appendChild(div);
        total += item.precio * item.cantidad;
    });
    document.getElementById('total').textContent = total;
    document.getElementById('carrito-count').textContent = carrito.reduce((sum, item) => sum + item.cantidad, 0);
}

function toggleCarrito() {
    const carritoEl = document.getElementById('carrito');
    carritoEl.style.display = carritoEl.style.display === 'none' ? 'block' : 'none';
}

document.getElementById('btn-buscar').addEventListener('click', buscarProductos);
document.getElementById('busqueda').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') buscarProductos();
});

document.querySelector('.user-actions a[href="#carrito"]').addEventListener('click', toggleCarrito);
document.getElementById('cerrar-carrito').addEventListener('click', toggleCarrito);
document.getElementById('comprar').addEventListener('click', () => {
    if (carrito.length > 0) {
        alert('Compra realizada!');
        carrito = [];
        actualizarCarrito();
        toggleCarrito();
    } else {
        alert('El carrito está vacío');
    }
});

// Cargar todo al iniciar página
window.addEventListener('load', () => {
    // Cargar usuario si ya estaba registrado
    const usuarioGuardado = localStorage.getItem('usuarioActual');
    if (usuarioGuardado) {
        usuarioActual = JSON.parse(usuarioGuardado);
        document.getElementById('registro').style.display = 'none';
        document.getElementById('panel-usuario').style.display = 'block';
        document.getElementById('usuario-nombre').textContent = usuarioActual.nombre;
    }
    
    // Cargar productos
    cargarProductos();
});
