// Datos iniciales de respaldo si el backend no está disponible.
const productosIniciales = [
    { nombre: 'Camiseta Nike', precio: 50, categoria: 'indumentaria', imagen: 'https://picsum.photos/200/150?random=1', descripcion: 'Camiseta deportiva de alta calidad', whatsapp: '5491123456789' },
    { nombre: 'Smartphone Samsung', precio: 300, categoria: 'electro', imagen: 'https://picsum.photos/200/150?random=2', descripcion: 'Teléfono inteligente con cámara excelente', whatsapp: '5491123456790' },
    { nombre: 'Zapatos Adidas', precio: 100, categoria: 'calzado', imagen: 'https://picsum.photos/200/150?random=3', descripcion: 'Zapatos cómodos para running', whatsapp: '5491123456791' },
    { nombre: 'Servicio de Limpieza', precio: 80, categoria: 'servicios', imagen: 'https://picsum.photos/200/150?random=4', descripcion: 'Limpieza profunda de hogar', whatsapp: '5491123456792' },
    { nombre: 'Varios - Libro', precio: 20, categoria: 'varios', imagen: 'https://picsum.photos/200/150?random=5', descripcion: 'Libro de programación', whatsapp: '5491123456793' }
];

function generarProductosPrueba() {
    const categorias = ['indumentaria', 'electro', 'calzado', 'servicios', 'varios'];
    const nombres = {
        indumentaria: ['Camiseta', 'Pantalón', 'Chaqueta', 'Vestido', 'Short'],
        electro: ['Smartphone', 'Laptop', 'Tablet', 'Auriculares', 'Cargador'],
        calzado: ['Zapatos', 'Zapatillas', 'Botas', 'Sandalias', 'Tacones'],
        servicios: ['Limpieza', 'Reparación', 'Clases', 'Masaje', 'Jardinería'],
        varios: ['Libro', 'Juguete', 'Herramienta', 'Accesorio', 'Decoración']
    };
    const productosGenerados = [];
    for (const cat of categorias) {
        for (let i = 1; i <= 200; i += 1) {
            const nombreBase = nombres[cat][Math.floor(Math.random() * nombres[cat].length)];
            const nombre = `${nombreBase} ${cat.charAt(0).toUpperCase() + cat.slice(1)} ${i}`;
            const precio = Math.floor(Math.random() * 500) + 10;
            const imagen = `https://picsum.photos/200/150?random=${Math.floor(Math.random() * 10000)}`;
            const descripcion = `Descripción de ${nombre}`;
            const whatsapp = `54911${Math.floor(Math.random() * 90000000) + 10000000}`;
            productosGenerados.push({ nombre, precio, categoria: cat, imagen, descripcion, whatsapp });
        }
    }
    return productosGenerados;
}

let productos = [];
let carrito = [];
let categoriaActual = 'todos';
let usuarioActual = null;
const numeroEmpresa = '5491164521118';
let historialBusquedas = JSON.parse(localStorage.getItem('historialBusquedas') || '[]');

async function cargarProductos() {
    try {
        const response = await fetch('/api/productos');
        if (!response.ok) throw new Error('No se pudieron cargar los productos desde el servidor.');
        productos = await response.json();
        mostrarProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        productos = [...productosIniciales, ...generarProductosPrueba()].map((p, i) => ({ id: i + 1, ...p }));
        mostrarProductos();
    }
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

async function registrarUsuario(event) {
    event.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const whatsapp = document.getElementById('reg-whatsapp').value;

    try {
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password, whatsapp }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error registrando usuario');
        }
        usuarioActual = data;
        document.getElementById('registro').style.display = 'none';
        document.getElementById('panel-usuario').style.display = 'block';
        alert('Registrado exitosamente. Ahora puedes subir productos.');
    } catch (error) {
        alert('Error en registro: ' + error.message);
    }
}

document.getElementById('form-registro').addEventListener('submit', registrarUsuario);

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
        const response = await fetch('/api/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoProducto),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Error subiendo producto');
        }
        productos.push(data);
        mostrarProductos();
        document.getElementById('form-producto').reset();
        alert('Producto subido exitosamente.');
    } catch (error) {
        alert('Error subiendo producto: ' + error.message);
    }
}

document.getElementById('form-producto').addEventListener('submit', subirProducto);

function agregarAlCarrito(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    const existente = carrito.find(item => item.id === id);
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

window.addEventListener('load', cargarProductos);
