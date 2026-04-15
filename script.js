const productosIniciales = [];

let productos = [];
let productosOriginales = []; // Para trackear cambios
let carrito = [];
let categoriaActual = 'todos';
let usuarioActual = null;
const numeroEmpresa = '5491164521118';
let historialBusquedas = JSON.parse(localStorage.getItem('historialBusquedas') || '[]');
let ventas = JSON.parse(localStorage.getItem('ventas') || '[]');

async function cargarProductos() {
    try {
        const response = await fetch('productos.json');
        if (!response.ok) throw new Error('No se pudieron cargar los productos locales.');
        productos = await response.json();
        productosOriginales = [...productos]; // Copia de los productos originales
    } catch (error) {
        console.error('Error cargando productos locales:', error);
        productos = productosIniciales.map((p, i) => ({ id: i + 1, ...p }));
        productosOriginales = [...productos];
    }
    mostrarProductos();
    renderDestacados();
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

let productosDestacados = [];
let currentSlide = 0;
let carouselInterval;

function renderDestacados() {
    const container = document.querySelector('.carousel-container');
    if (!container) return;

    // Detener carrusel anterior si existe
    stopCarousel();

    const destacados = productos.filter(p => p.destacado).slice(0, 6);
    productosDestacados = destacados.length > 0 ? destacados : productos.slice(0, 6);

    if (productosDestacados.length === 0) return;

    const carousel = document.querySelector('.carousel');
    const indicators = document.querySelector('.carousel-indicators');

    // Limpiar indicadores existentes
    indicators.innerHTML = '';

    // Crear indicadores
    productosDestacados.forEach((_, index) => {
        const indicator = document.createElement('div');
        indicator.className = `carousel-indicator ${index === 0 ? 'active' : ''}`;
        indicator.onclick = () => goToSlide(index);
        indicators.appendChild(indicator);
    });

    // Mostrar primera slide
    showSlide(0);

    // Iniciar carrusel automático
    startCarousel();
}

function showSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.carousel-indicator');

    // Ocultar todas las slides
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    // Mostrar slide actual
    if (slides[index]) {
        slides[index].classList.add('active');
    }
    if (indicators[index]) {
        indicators[index].classList.add('active');
    }

    // Actualizar información del producto
    const producto = productosDestacados[index];
    if (producto) {
        const image = document.querySelector('.carousel-image');
        const title = document.querySelector('.carousel-title');
        const price = document.querySelector('.carousel-price');
        const whatsappLink = document.querySelector('.carousel-actions .whatsapp-btn');

        image.src = producto.imagen;
        image.alt = producto.nombre;
        title.textContent = producto.nombre;
        price.textContent = `$${producto.precio}`;
        whatsappLink.href = `https://wa.me/${producto.whatsapp}?text=Hola,%20estoy%20interesado%20en%20${encodeURIComponent(producto.nombre)}.%20Precio:%20$${producto.precio}.%20Vendedor:%20${producto.whatsapp}.%20Empresa:%20${numeroEmpresa}`;

        // Guardar ID del producto actual para el botón de carrito
        document.querySelector('.carousel').dataset.currentProductId = producto.id;
    }
}

function goToSlide(index) {
    currentSlide = index;
    showSlide(currentSlide);
    resetCarouselTimer();
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % productosDestacados.length;
    showSlide(currentSlide);
}

function startCarousel() {
    if (carouselInterval) {
        clearInterval(carouselInterval);
    }
    carouselInterval = setInterval(nextSlide, 3000);
}

function resetCarouselTimer() {
    if (carouselInterval) {
        clearInterval(carouselInterval);
        startCarousel();
    }
}

function stopCarousel() {
    if (carouselInterval) {
        clearInterval(carouselInterval);
        carouselInterval = null;
    }
}

function agregarAlCarritoDesdeCarrusel() {
    const carousel = document.querySelector('.carousel');
    const productId = carousel.dataset.currentProductId;
    if (productId) {
        agregarAlCarrito(productId);
    }
}

function filtrarCategoria(categoria) {
    categoriaActual = categoria;
    const filtrados = categoria === 'todos' ? productos : productos.filter(p => p.categoria === categoria);
    mostrarProductos(filtrados);
}

function buscarProductos() {
    const query = document.getElementById('busqueda').value.toLowerCase().trim();
    
    if (query) {
        // Agregar al historial solo si no es muy corto
        if (query.length > 2) {
            historialBusquedas.push(query);
            localStorage.setItem('historialBusquedas', JSON.stringify(historialBusquedas));
        }
    }
    
    let filtrados = productos;
    
    if (query) {
        filtrados = productos.filter(p => 
            p.nombre.toLowerCase().includes(query) || 
            p.descripcion.toLowerCase().includes(query) ||
            p.categoria.toLowerCase().includes(query)
        );
    }
    
    // Aplicar filtro de categoría si está activo
    if (categoriaActual !== 'todos') {
        filtrados = filtrados.filter(p => p.categoria === categoriaActual);
    }
    
    mostrarProductos(filtrados);
    
    // Mostrar recomendaciones si hay búsqueda
    if (query && query.length > 1) {
        mostrarRecomendaciones(query);
    }
}

function mostrarRecomendaciones(queryActual = '') {
    const lista = document.getElementById('lista-productos');
    
    // Limpiar recomendaciones anteriores
    const recomendacionesAnteriores = lista.querySelector('.recomendaciones');
    if (recomendacionesAnteriores) {
        recomendacionesAnteriores.remove();
    }
    
    if (!queryActual || queryActual.length < 2) return;
    
    // Buscar productos relacionados por categoría o palabras similares
    const productosRelacionados = productos.filter(p => {
        const queryLower = queryActual.toLowerCase();
        const nombreLower = p.nombre.toLowerCase();
        const descLower = p.descripcion.toLowerCase();
        
        // No incluir productos que ya están en los resultados de búsqueda
        const yaMostrado = nombreLower.includes(queryLower) || descLower.includes(queryLower);
        if (yaMostrado) return false;
        
        // Buscar por categoría o palabras relacionadas
        const palabrasQuery = queryLower.split(' ');
        return palabrasQuery.some(palabra => 
            p.categoria.toLowerCase().includes(palabra) ||
            nombreLower.includes(palabra) ||
            descLower.includes(palabra)
        );
    }).slice(0, 6); // Máximo 6 recomendaciones
    
    if (productosRelacionados.length > 0) {
        const recDiv = document.createElement('div');
        recDiv.className = 'recomendaciones';
        recDiv.innerHTML = '<h3>🔍 Productos relacionados</h3>';
        
        productosRelacionados.forEach(prod => {
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

function hideAllSections() {
    document.getElementById('registro').style.display = 'none';
    document.getElementById('panel-usuario').style.display = 'none';
    document.getElementById('mis-productos').style.display = 'none';
    document.getElementById('mis-ventas').style.display = 'none';
    document.getElementById('productos').style.display = 'none';
}

function mostrarRegistro() {
    hideAllSections();
    document.getElementById('registro').style.display = 'block';
}

function irAlInicio() {
    hideAllSections();
    document.getElementById('productos').style.display = 'block';
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
    
    actualizarInterfazUsuario();
    document.getElementById('form-registro').reset();
}

document.getElementById('form-registro').addEventListener('submit', registrarUsuario);

// Cargar usuario si ya estaba registrado
window.addEventListener('load', () => {
    // Cargar usuario si ya estaba registrado
    const usuarioGuardado = localStorage.getItem('usuarioActual');
    if (usuarioGuardado) {
        usuarioActual = JSON.parse(usuarioGuardado);
    }
    
    // Cargar ventas si ya existen
    const ventasGuardadas = localStorage.getItem('ventas');
    if (ventasGuardadas) {
        ventas = JSON.parse(ventasGuardadas);
    }
    
    // Cargar anuncios guardados
    cargarAnuncios();
    
    // Actualizar interfaz de usuario
    actualizarInterfazUsuario();
    
    // Cargar productos
    cargarProductos();
});

function actualizarInterfazUsuario() {
    if (usuarioActual) {
        // Mostrar usuario logueado en header
        document.getElementById('usuario-logueado').style.display = 'flex';
        document.getElementById('usuario-info').textContent = `👤 ${usuarioActual.nombre}`;
        document.getElementById('acciones-no-logueado').style.display = 'none';
        
        // Mostrar panel de usuario
        document.getElementById('registro').style.display = 'none';
        document.getElementById('panel-usuario').style.display = 'block';
        document.getElementById('usuario-nombre').textContent = usuarioActual.nombre;
        
        // Mostrar/ocultar botones de edición de anuncios
        if (esAdministrador()) {
            mostrarBotonesEdicion();
        } else {
            ocultarBotonesEdicion();
        }
    } else {
        // Mostrar acciones para no logueados
        document.getElementById('usuario-logueado').style.display = 'none';
        document.getElementById('acciones-no-logueado').style.display = 'flex';
        
        // Ocultar panel de usuario
        document.getElementById('registro').style.display = 'none';
        document.getElementById('panel-usuario').style.display = 'none';
        
        // Ocultar botones de edición de anuncios
        ocultarBotonesEdicion();
    }
}

function toggleMenu() {
    const menu = document.getElementById('menu-dropdown');
    menu.classList.toggle('show');
}

function cerrarMenu() {
    const menu = document.getElementById('menu-dropdown');
    if (menu.classList.contains('show')) {
        menu.classList.remove('show');
    }
}

function mostrarPanelUsuario() {
    cerrarMenu();
    hideAllSections();
    document.getElementById('panel-usuario').style.display = 'block';
    document.getElementById('panel-usuario').scrollIntoView({ behavior: 'smooth' });
}

function mostrarMisProductos() {
    cerrarMenu();
    hideAllSections();
    document.getElementById('mis-productos').style.display = 'block';
    renderMisProductos();
    document.getElementById('mis-productos').scrollIntoView({ behavior: 'smooth' });
}

function mostrarMisVentas() {
    cerrarMenu();
    hideAllSections();
    document.getElementById('mis-ventas').style.display = 'block';
    renderMisVentas();
    document.getElementById('mis-ventas').scrollIntoView({ behavior: 'smooth' });
}

function renderMisProductos() {
    const lista = document.getElementById('mis-productos-list');
    lista.innerHTML = '';
    if (!usuarioActual) {
        lista.innerHTML = '<p>Debes iniciar sesión para ver tus productos.</p>';
        return;
    }
    const misProductos = productos.filter(p => p.usuario === usuarioActual.nombre);
    if (misProductos.length === 0) {
        lista.innerHTML = '<p>No tienes productos cargados todavía.</p>';
        return;
    }
    const productosHtml = misProductos.map(prod => `
        <div class="producto">
            <img src="${prod.imagen}" alt="${prod.nombre}">
            <h3>${prod.nombre}</h3>
            <p>${prod.descripcion}</p>
            <p class="price">$${prod.precio}</p>
            <p class="producto-usuario">Categoría: ${prod.categoria}</p>
        </div>
    `).join('');
    lista.innerHTML = productosHtml;
}

function renderMisVentas() {
    const container = document.getElementById('mis-ventas-list');
    container.innerHTML = '';
    if (!usuarioActual) {
        container.innerHTML = '<p>Debes iniciar sesión para ver tus ventas.</p>';
        return;
    }
    const ventasUsuario = ventas.filter(venta => venta.usuario === usuarioActual.nombre);
    if (ventasUsuario.length === 0) {
        container.innerHTML = '<p>No tienes ventas registradas todavía.</p>';
        return;
    }
    ventasUsuario.forEach(venta => {
        const div = document.createElement('div');
        div.className = 'venta-card';
        const itemsHtml = venta.items.map(item => `<li>${item.nombre} x${item.cantidad} - $${item.precio * item.cantidad}</li>`).join('');
        div.innerHTML = `
            <h3>Venta #${venta.id}</h3>
            <p><strong>Fecha:</strong> ${venta.fecha}</p>
            <p><strong>Total:</strong> $${venta.total}</p>
            <p><strong>Productos:</strong></p>
            <ul>${itemsHtml}</ul>
        `;
        container.appendChild(div);
    });
}

function registrarVenta() {
    if (!usuarioActual) return;
    const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const venta = {
        id: Date.now(),
        usuario: usuarioActual.nombre,
        fecha: new Date().toLocaleString(),
        total,
        items: carrito.map(item => ({ id: item.id, nombre: item.nombre, cantidad: item.cantidad, precio: item.precio }))
    };
    ventas.push(venta);
    localStorage.setItem('ventas', JSON.stringify(ventas));
}

function cerrarSesion() {
    localStorage.removeItem('usuarioActual');
    usuarioActual = null;
    actualizarInterfazUsuario();
    cerrarMenu();
    alert('Sesión cerrada.');
}

document.addEventListener('click', (event) => {
    const menu = document.getElementById('menu-dropdown');
    const toggle = document.getElementById('menu-toggle');
    if (!menu || !toggle) return;
    if (!event.target.closest('#usuario-logueado')) {
        menu.classList.remove('show');
    }
});

function descargarJSONActualizado() {
    // Verificar si hay cambios reales
    if (productos.length === productosOriginales.length) {
        const hayCambios = productos.some((prod, index) => {
            const original = productosOriginales[index];
            return !original || 
                   prod.nombre !== original.nombre || 
                   prod.precio !== original.precio || 
                   prod.categoria !== original.categoria;
        });
        
        if (!hayCambios) {
            console.log('No hay cambios para guardar.');
            return;
        }
    }
    
    if (productos.length === 0) {
        alert('No hay productos para guardar.');
        return;
    }
    
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
    
    console.log('Archivo productos_actualizado.json descargado.');
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
        
        // Descargar JSON actualizado automáticamente
        descargarJSONActualizado();
        
        alert('Producto agregado localmente. Se descargó el archivo productos_actualizado.json para guardar los cambios permanentemente en GitHub.');
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
document.getElementById('busqueda').addEventListener('input', buscarProductos); // Búsqueda dinámica
document.getElementById('busqueda').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') buscarProductos();
});

document.querySelector('.user-actions a[href="#carrito"]').addEventListener('click', toggleCarrito);
document.getElementById('cerrar-carrito').addEventListener('click', toggleCarrito);
document.getElementById('comprar').addEventListener('click', () => {
    if (carrito.length > 0) {
        registrarVenta();
        alert('Compra realizada! La venta se registró en Mis Ventas.');
        carrito = [];
        actualizarCarrito();
        toggleCarrito();
    } else {
        alert('El carrito está vacío');
    }
});

// Funciones para anuncios editables
function esAdministrador() {
    return usuarioActual && (usuarioActual.email === 'admin@sypsy.com' || usuarioActual.email === 'admin@sypmarket.com');
}

function mostrarBotonesEdicion() {
    if (esAdministrador()) {
        document.querySelectorAll('.edit-ad-btn').forEach(btn => {
            btn.style.display = 'block';
        });
    }
}

function ocultarBotonesEdicion() {
    document.querySelectorAll('.edit-ad-btn').forEach(btn => {
        btn.style.display = 'none';
    });
}

function editarAnuncio(adId) {
    const adSlot = document.querySelector(`[data-ad-id="${adId}"]`);
    const adContent = adSlot.querySelector('.ad-content');
    
    const tituloActual = adContent.querySelector('h3').textContent;
    const descripcionActual = adContent.querySelector('p').textContent;
    
    const nuevoTitulo = prompt('Nuevo título del anuncio:', tituloActual);
    if (nuevoTitulo === null) return;
    
    const nuevaDescripcion = prompt('Nueva descripción del anuncio:', descripcionActual);
    if (nuevaDescripcion === null) return;
    
    // Actualizar contenido
    adContent.querySelector('h3').textContent = nuevoTitulo;
    adContent.querySelector('p').textContent = nuevaDescripcion;
    
    // Guardar en localStorage
    guardarAnuncios();
    
    alert('Anuncio actualizado correctamente!');
}

function guardarAnuncios() {
    const anuncios = {};
    document.querySelectorAll('.ad-slot').forEach(slot => {
        const adId = slot.dataset.adId;
        const titulo = slot.querySelector('h3').textContent;
        const descripcion = slot.querySelector('p').textContent;
        anuncios[adId] = { titulo, descripcion };
    });
    localStorage.setItem('anuncios', JSON.stringify(anuncios));
}

function cargarAnuncios() {
    const anunciosGuardados = localStorage.getItem('anuncios');
    if (anunciosGuardados) {
        const anuncios = JSON.parse(anunciosGuardados);
        Object.keys(anuncios).forEach(adId => {
            const slot = document.querySelector(`[data-ad-id="${adId}"]`);
            if (slot) {
                const adContent = slot.querySelector('.ad-content');
                adContent.querySelector('h3').textContent = anuncios[adId].titulo;
                adContent.querySelector('p').textContent = anuncios[adId].descripcion;
            }
        });
    }
}
