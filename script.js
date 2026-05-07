const productosIniciales = [];

let productos = [];
let productosOriginales = []; // Para trackear cambios
let categoriaActual = 'todos';
let usuarioActual = null;
const numeroEmpresa = '5491164521118';
let historialBusquedas = JSON.parse(localStorage.getItem('historialBusquedas') || '[]');
let ventas = JSON.parse(localStorage.getItem('ventas') || '[]');

// Firebase Auth
let auth;
let currentUser = null;

// Cargar carrito desde localStorage
let carrito = JSON.parse(localStorage.getItem('carrito') || '[]');

function obtenerImagenPrincipal(producto) {
    if (Array.isArray(producto.imagenes) && producto.imagenes.length > 0) {
        return producto.imagenes[0];
    }
    return producto.imagen || '';
}

async function cargarProductos() {
    try {
        // Intentar cargar desde el servidor primero
        const response = await fetch('/api/productos');
        if (response.ok) {
            let productosRaw = await response.json();

            // Limpiar y validar datos de Firestore
            productos = productosRaw.map(prod => ({
                id: prod.id || prod.nombre || Math.random().toString(36).substr(2, 9),
                nombre: (prod.nombre || 'Producto sin nombre').substring(0, 100), // Limitar longitud
                descripcion: (prod.descripcion || 'Sin descripción').substring(0, 500), // Limitar longitud
                precio: Number(prod.precio) || 0,
                categoria: prod.categoria || 'varios',
                imagen: prod.imagen || '',
                whatsapp: prod.whatsapp || '',
                usuario: prod.usuario || '',
                destacado: prod.destacado || false,
                imagenes: Array.isArray(prod.imagenes) ? prod.imagenes : [prod.imagen].filter(Boolean)
            }));

            productosOriginales = [...productos];
            console.log('Productos cargados desde el servidor:', productos.length);
        } else {
            throw new Error('Servidor no disponible');
        }
    } catch (error) {
        console.warn('Cargando productos desde archivo local:', error.message);
        // Fallback a productos.json local
        try {
            const response = await fetch('productos.json');
            if (!response.ok) throw new Error('No se pudieron cargar los productos locales.');
            productos = await response.json();
            productosOriginales = [...productos];
        } catch (localError) {
            console.error('Error cargando productos locales:', localError);
            productos = productosIniciales.map((p, i) => ({ id: i + 1, ...p }));
            productosOriginales = [...productos];
        }
    }
    mostrarProductos();
    renderDestacados();
}

function mostrarProductos(productosFiltrados = productos) {
    const lista = document.getElementById('lista-productos');
    lista.innerHTML = '';
    productosFiltrados.forEach(producto => {
        // Asegurar que los datos estén en el formato correcto
        const nombre = producto.nombre || 'Producto sin nombre';
        const descripcion = producto.descripcion || 'Sin descripción';
        const precio = producto.precio || 0;
        const imagen = obtenerImagenPrincipal(producto);
        const id = producto.id || producto.nombre;

        const div = document.createElement('div');
        div.className = 'producto';
        div.innerHTML = `
            <img src="${imagen}" alt="${nombre}" onclick="abrirModalProducto('${id}')" class="producto-thumb">
            <h3>${nombre}</h3>
            <p>${descripcion}</p>
            <p class="price">$${precio}</p>
            <div class="producto-actions">
                <button onclick="agregarAlCarrito('${id}')">Agregar al Carrito</button>
                <a href="https://wa.me/${producto.whatsapp || ''}?text=Hola,%20estoy%20interesado%20en%20${encodeURIComponent(nombre)}.%20Precio:%20$${precio}.%20Vendedor:%20${producto.whatsapp || ''}.%20Empresa:%20${numeroEmpresa}" target="_blank">
                    <button class="whatsapp-btn">Contactar por WhatsApp</button>
                </a>
            </div>
        `;
        lista.appendChild(div);
    });
}

let modalProductoSeleccionado = null;
let modalImages = [];
let modalCurrentImageIndex = 0;

function abrirModalProducto(id) {
    const producto = productos.find(p => p.id == id);
    if (!producto) return;

    modalProductoSeleccionado = producto;
    modalImages = Array.isArray(producto.imagenes)
        ? producto.imagenes.filter(Boolean)
        : [];

    if (modalImages.length === 0 && producto.imagen) {
        modalImages = [producto.imagen];
    }

    if (modalImages.length === 0) {
        modalImages = [''];
    }

    document.getElementById('modal-producto-nombre').textContent = producto.nombre;
    document.getElementById('modal-producto-descripcion').textContent = producto.descripcion;
    document.getElementById('modal-producto-precio').textContent = `$${producto.precio}`;
    document.getElementById('modal-whatsapp-link').href =
        `https://wa.me/${producto.whatsapp}?text=Hola,%20estoy%20interesado%20en%20${encodeURIComponent(producto.nombre)}.%20Precio:%20$${producto.precio}.%20Vendedor:%20${producto.whatsapp}.%20Empresa:%20${numeroEmpresa}`;
    document.getElementById('modal-add-carrito').onclick = () => agregarAlCarritoDesdeModal();

    modalCurrentImageIndex = 0;
    actualizarMiniaturasModal();
    mostrarImagenModal(0);

    const overlay = document.getElementById('producto-modal');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function mostrarImagenModal(index) {
    if (!modalImages || modalImages.length === 0) return;
    modalCurrentImageIndex = ((index % modalImages.length) + modalImages.length) % modalImages.length;
    const imagen = document.getElementById('modal-imagen-principal');
    imagen.src = modalImages[modalCurrentImageIndex];
    imagen.alt = modalProductoSeleccionado ? modalProductoSeleccionado.nombre : 'Imagen del producto';

    document.querySelectorAll('.modal-thumbnail').forEach((thumb, thumbIndex) => {
        thumb.classList.toggle('active', thumbIndex === modalCurrentImageIndex);
    });
}

function actualizarMiniaturasModal() {
    const thumbnails = document.getElementById('modal-thumbnails');
    thumbnails.innerHTML = '';

    modalImages.forEach((src, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `modal-thumbnail${index === modalCurrentImageIndex ? ' active' : ''}`;
        button.style.backgroundImage = `url('${src}')`;
        button.onclick = () => mostrarImagenModal(index);
        thumbnails.appendChild(button);
    });
}

function prevModalImage() {
    mostrarImagenModal(modalCurrentImageIndex - 1);
}

function nextModalImage() {
    mostrarImagenModal(modalCurrentImageIndex + 1);
}

function agregarAlCarritoDesdeModal() {
    if (modalProductoSeleccionado) {
        agregarAlCarrito(modalProductoSeleccionado.id);
    }
}

function cerrarModalProducto() {
    document.getElementById('producto-modal').style.display = 'none';
    document.body.style.overflow = '';
}

let productosDestacados = [];
let currentSlide = 0;
let carouselInterval;

function renderDestacados() {
    const carousel = document.getElementById('carousel-main');
    if (!carousel) return;

    // Detener carrusel anterior si existe
    stopCarousel();

    const destacados = productos.filter(p => p.destacado).slice(0, 6);
    productosDestacados = destacados.length > 0 ? destacados : productos.slice(0, 6);

    if (productosDestacados.length === 0) return;

    const indicators = document.getElementById('carousel-indicators');
    const container = document.getElementById('carousel-container');

    // Limpiar carousel y indicadores
    carousel.innerHTML = '';
    indicators.innerHTML = '';

    // Crear slides dinámicamente
    productosDestacados.forEach((producto, index) => {
        const imagen = obtenerImagenPrincipal(producto);
        const slide = document.createElement('div');
        slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
        slide.dataset.productId = producto.id;
        slide.innerHTML = `
            <img src="${imagen}" alt="${producto.nombre}" class="carousel-image">
            <div class="carousel-info">
                <h3 class="carousel-title">${producto.nombre}</h3>
                <p class="carousel-price">$${producto.precio}</p>
                <div class="carousel-actions">
                    <button class="carousel-btn" onclick="agregarAlCarritoDesdeCarrusel(${producto.id})">Agregar al Carrito</button>
                    <a href="https://wa.me/${producto.whatsapp}?text=Hola,%20estoy%20interesado%20en%20${encodeURIComponent(producto.nombre)}.%20Precio:%20$${producto.precio}.%20Vendedor:%20${producto.whatsapp}.%20Empresa:%20${numeroEmpresa}" target="_blank" class="carousel-btn whatsapp-btn">Contactar por WhatsApp</a>
                </div>
            </div>
        `;
        carousel.appendChild(slide);

        // Crear indicador
        const indicator = document.createElement('div');
        indicator.className = `carousel-indicator ${index === 0 ? 'active' : ''}`;
        indicator.onclick = () => goToSlide(index);
        indicators.appendChild(indicator);
    });

    // Mostrar carrusel
    container.style.display = 'block';
    
    // Iniciar carrusel automático
    startCarousel();
    setActiveCategoryLink(categoriaActual);
    updateCategorySectionTitle(categoriaActual);
}

function showSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.carousel-indicator');

    // Validar índice
    if (index < 0 || index >= slides.length) return;

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
}

function goToSlide(index) {
    currentSlide = index;
    showSlide(currentSlide);
    resetCarouselTimer();
}

function prevSlide() {
    currentSlide = (currentSlide - 1 + productosDestacados.length) % productosDestacados.length;
    showSlide(currentSlide);
    resetCarouselTimer();
}

function setActiveCategoryLink(categoria) {
    document.querySelectorAll('nav a.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.category === categoria);
    });
}

function updateCategorySectionTitle(categoria) {
    const label = document.getElementById('categoria-activa');
    if (!label) return;
    const nombre = categoria === 'todos' ? 'Todos los productos' : categoria.charAt(0).toUpperCase() + categoria.slice(1);
    label.textContent = `Categoría: ${nombre}`;
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

function agregarAlCarritoDesdeCarrusel(productId) {
    agregarAlCarrito(productId);
}

function filtrarCategoria(categoria) {
    categoriaActual = categoria;
    hideAllSections();
    document.getElementById('productos').style.display = 'block';
    const filtrados = categoria === 'todos' ? productos : productos.filter(p => p.categoria === categoria);
    mostrarProductos(filtrados);
    setActiveCategoryLink(categoria);
    updateCategorySectionTitle(categoria);
    document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });

    // Mostrar/ocultar carrusel
    if (categoria === 'todos') {
        document.getElementById('destacados').style.display = 'block';
    } else {
        document.getElementById('destacados').style.display = 'none';
    }
}

function buscarProductos() {
    const query = document.getElementById('busqueda').value.toLowerCase().trim();
    const carouselContainer = document.getElementById('carousel-container');
    
    if (query) {
        // Agregar al historial solo si no es muy corto
        if (query.length > 2) {
            historialBusquedas.push(query);
            localStorage.setItem('historialBusquedas', JSON.stringify(historialBusquedas));
        }
        // Ocultar carrusel cuando hay búsqueda
        if (carouselContainer) {
            carouselContainer.style.display = 'none';
        }
    } else {
        // Mostrar carrusel cuando no hay búsqueda
        if (carouselContainer) {
            carouselContainer.style.display = 'block';
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

    // Mostrar/ocultar carrusel
    if (categoriaActual !== 'todos' || query) {
        document.getElementById('destacados').style.display = 'none';
    } else {
        document.getElementById('destacados').style.display = 'block';
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
            const nombre = prod.nombre || 'Producto sin nombre';
            const descripcion = prod.descripcion || 'Sin descripción';
            const precio = prod.precio || 0;
            const imagen = obtenerImagenPrincipal(prod);
            const id = prod.id || prod.nombre;

            const div = document.createElement('div');
            div.className = 'producto';
            div.innerHTML = `
                <img src="${imagen}" alt="${nombre}" onclick="abrirModalProducto('${id}')" class="producto-thumb">
                <h3>${nombre}</h3>
                <p>${descripcion}</p>
                <p class="price">$${precio}</p>
                <div class="producto-actions">
                    <button onclick="agregarAlCarrito('${id}')">Agregar al Carrito</button>
                    <a href="https://wa.me/${prod.whatsapp || ''}?text=Hola,%20estoy%20interesado%20en%20${encodeURIComponent(nombre)}.%20Precio:%20$${precio}.%20Vendedor:%20${prod.whatsapp || ''}.%20Empresa:%20${numeroEmpresa}" target="_blank">
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
    document.getElementById('login').style.display = 'none';
    document.getElementById('panel-usuario').style.display = 'none';
    document.getElementById('mis-productos').style.display = 'none';
    document.getElementById('mis-ventas').style.display = 'none';
    document.getElementById('productos').style.display = 'none';
}

function mostrarRegistro() {
    hideAllSections();
    document.getElementById('registro').style.display = 'block';
}

function mostrarLogin() {
    hideAllSections();
    document.getElementById('login').style.display = 'block';
}

function irAlInicio() {
    categoriaActual = 'todos';
    hideAllSections();
    document.getElementById('productos').style.display = 'block';
    setActiveCategoryLink('todos');
    updateCategorySectionTitle('todos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('destacados').style.display = 'block';
}

async function registrarUsuario(event) {
    event.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const whatsapp = document.getElementById('reg-whatsapp').value;

    try {
        // Crear usuario en Firebase Auth primero
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        await updateProfile(currentUser, { displayName: nombre });
        localStorage.setItem('whatsapp', whatsapp);

        // Sincronizar datos de usuario con backend
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: currentUser.uid, nombre, email, whatsapp }),
        });
        if (!response.ok) {
            console.warn('No se pudo sincronizar el usuario con el backend:', await response.text());
        }

        actualizarInterfazUsuario();
        document.getElementById('form-registro').reset();
        alert('Usuario registrado y sesión iniciada.');
    } catch (error) {
        console.error('Error en registro:', error);
        if (error.code === 'auth/email-already-in-use') {
            alert('El email ya está registrado. Usa Iniciar Sesión o elige otro email.');
        } else {
            alert('Error al registrar usuario: ' + error.message);
        }
        return;
    }
}

document.getElementById('form-registro').addEventListener('submit', registrarUsuario);

async function loginUsuario(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        // Obtener datos adicionales de Firestore si es necesario
        actualizarInterfazUsuario();
        document.getElementById('form-login').reset();
        alert('Sesión iniciada correctamente.');
    } catch (error) {
        console.error('Error en login:', error);
        alert('Error al iniciar sesión: ' + error.message);
    }
}

document.getElementById('form-login').addEventListener('submit', loginUsuario);

// Cargar usuario si ya estaba registrado
window.addEventListener('load', () => {
    // Inicializar Firebase Auth
    auth = window.firebaseAuth;
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        actualizarInterfazUsuario();
    });

    // Cargar ventas si ya existen
    const ventasGuardadas = localStorage.getItem('ventas');
    if (ventasGuardadas) {
        ventas = JSON.parse(ventasGuardadas);
    }

    // Cargar anuncios guardados
    cargarAnuncios();

    // Cargar productos
    cargarProductos();
    setActiveCategoryLink('todos');
    updateCategorySectionTitle('todos');

    // Actualizar carrito al cargar la página
    actualizarCarrito();
});

function actualizarInterfazUsuario() {
    if (currentUser) {
        // Mostrar usuario logueado en header
        document.getElementById('usuario-logueado').style.display = 'flex';
        document.getElementById('usuario-info').textContent = `👤 ${currentUser.displayName || currentUser.email}`;
        document.getElementById('acciones-no-logueado').style.display = 'none';
        
        // Mostrar panel de usuario
        document.getElementById('registro').style.display = 'none';
        document.getElementById('login').style.display = 'none';
        document.getElementById('panel-usuario').style.display = 'block';
        document.getElementById('usuario-nombre').textContent = currentUser.displayName || currentUser.email;
        
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
        document.getElementById('login').style.display = 'none';
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
    if (!currentUser) {
        lista.innerHTML = '<p>Debes iniciar sesión para ver tus productos.</p>';
        return;
    }
    const misProductos = productos.filter(p => p.usuario === (currentUser.displayName || currentUser.email));
    if (misProductos.length === 0) {
        lista.innerHTML = '<p>No tienes productos cargados todavía.</p>';
        return;
    }
    const productosHtml = misProductos.map(prod => {
        const nombre = prod.nombre || 'Producto sin nombre';
        const descripcion = prod.descripcion || 'Sin descripción';
        const precio = prod.precio || 0;
        const imagen = obtenerImagenPrincipal(prod);
        const id = prod.id || prod.nombre;

        return `
        <div class="producto">
            <img src="${imagen}" alt="${nombre}" onclick="abrirModalProducto('${id}')" class="producto-thumb">
            <h3>${nombre}</h3>
            <p>${descripcion}</p>
            <p class="price">$${precio}</p>
            <p class="producto-usuario">Categoría: ${prod.categoria || 'Sin categoría'}</p>
        </div>
    `;}).join('');
    lista.innerHTML = productosHtml;
}

function renderMisVentas() {
    const container = document.getElementById('mis-ventas-list');
    container.innerHTML = '';
    if (!currentUser) {
        container.innerHTML = '<p>Debes iniciar sesión para ver tus ventas.</p>';
        return;
    }
    const ventasUsuario = ventas.filter(venta => venta.usuario === (currentUser.displayName || currentUser.email));
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
    if (!currentUser) return;
    const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    const venta = {
        id: Date.now(),
        usuario: currentUser.displayName || currentUser.email,
        fecha: new Date().toLocaleString(),
        total,
        items: carrito.map(item => ({ id: item.id, nombre: item.nombre, cantidad: item.cantidad, precio: item.precio }))
    };
    ventas.push(venta);
    localStorage.setItem('ventas', JSON.stringify(ventas));
}

function cerrarSesion() {
    signOut(auth).then(() => {
        currentUser = null;
        actualizarInterfazUsuario();
        cerrarMenu();
        alert('Sesión cerrada.');
    }).catch((error) => {
        console.error('Error cerrando sesión:', error);
        alert('Error al cerrar sesión.');
    });
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
    // Temporal: permitir subida sin login para testing
    // if (!currentUser) {
    //     alert('Debes iniciar sesión primero.');
    //     return;
    // }

    const nombre = document.getElementById('prod-nombre').value;
    const descripcion = document.getElementById('prod-desc').value;
    const precio = parseFloat(document.getElementById('prod-precio').value);
    const categoria = document.getElementById('prod-categoria').value;

    if (archivosSeleccionados.length === 0) {
        alert('Por favor selecciona al menos una imagen.');
        return;
    }

    const archivos = archivosSeleccionados;

    // Mostrar loading
    const submitBtn = document.querySelector('#form-producto button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Subiendo...';
    submitBtn.disabled = true;

    try {
        // Convertir imágenes a base64
        const imagenesBase64 = await Promise.all(archivos.map(convertirArchivoABase64));

        const nuevoProducto = {
            nombre,
            descripcion,
            precio,
            categoria,
            imagen: imagenesBase64[0] || '',
            imagenes: imagenesBase64,
            whatsapp: localStorage.getItem('whatsapp') || (currentUser && currentUser.email) || 'sin-whatsapp',
            usuario: (currentUser && (currentUser.displayName || currentUser.email)) || 'Anónimo',
        };

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
        console.log('Backend no disponible, agregando localmente');
        // Convertir imágenes a base64 para almacenamiento local
        const imagenesBase64 = await Promise.all(archivos.map(convertirArchivoABase64));

        const productoConId = {
            id: Math.max(...productos.map(p => p.id), 0) + 1,
            nombre,
            descripcion,
            precio,
            categoria,
            imagen: imagenesBase64[0] || '',
            imagenes: imagenesBase64,
            whatsapp: localStorage.getItem('whatsapp') || (currentUser && currentUser.email) || 'sin-whatsapp',
            usuario: (currentUser && (currentUser.displayName || currentUser.email)) || 'Anónimo',
        };
        productos.push(productoConId);

        // Descargar JSON actualizado automáticamente
        descargarJSONActualizado();

        alert('Producto agregado localmente. Se descargó el archivo productos_actualizado.json para guardar los cambios permanentemente en GitHub.');
    } finally {
        // Restaurar botón
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }

    mostrarProductos();
    document.getElementById('form-producto').reset();
    archivosSeleccionados = [];
    const preview = document.getElementById('imagen-preview');
    const previewImages = document.getElementById('preview-images');
    if (preview) preview.style.display = 'none';
    if (previewImages) previewImages.innerHTML = '';
}

// Función auxiliar para convertir archivo a base64
function convertirArchivoABase64(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
    });
}

// Array global para almacenar archivos seleccionados
let archivosSeleccionados = [];

// Función para mostrar vista previa de imagen
function mostrarVistaPreviaImagen() {
    const input = document.getElementById('prod-imagen');
    const preview = document.getElementById('imagen-preview');
    const previewImages = document.getElementById('preview-images');

    if (input.files && input.files.length > 0) {
        const nuevosArchivos = Array.from(input.files);
        
        // Validar y agregar nuevos archivos
        for (let archivo of nuevosArchivos) {
            if (!archivo.type.startsWith('image/')) {
                alert('Por favor selecciona solo archivos de imagen.');
                continue;
            }
            if (archivo.size > 5 * 1024 * 1024) {
                alert('Cada imagen no puede pesar más de 5MB.');
                continue;
            }
            // Evitar duplicados
            const yaExiste = archivosSeleccionados.some(a => a.name === archivo.name && a.size === archivo.size && a.lastModified === archivo.lastModified);
            if (!yaExiste && archivosSeleccionados.length < 8) {
                archivosSeleccionados.push(archivo);
            }
        }
        
        // Limpiar input
        input.value = '';
        
        // Renderizar preview
        renderizarPreview();
    }
}

function renderizarPreview() {
    const preview = document.getElementById('imagen-preview');
    const previewImages = document.getElementById('preview-images');
    
    previewImages.innerHTML = '';
    
    if (archivosSeleccionados.length === 0) {
        preview.style.display = 'none';
        return;
    }
    
    archivosSeleccionados.forEach((archivo, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.width = '100%';
            container.style.paddingBottom = '100%'; // Cuadrado
            container.style.overflow = 'hidden';
            container.style.borderRadius = '10px';
            container.style.backgroundColor = '#f0f0f0';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Miniatura ' + (index + 1);
            img.style.position = 'absolute';
            img.style.top = '0';
            img.style.left = '0';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '10px';
            img.style.border = '2px solid #ddd';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.innerHTML = '✕';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '2px';
            deleteBtn.style.right = '2px';
            deleteBtn.style.width = '24px';
            deleteBtn.style.height = '24px';
            deleteBtn.style.padding = '0';
            deleteBtn.style.backgroundColor = 'rgba(255,0,0,0.8)';
            deleteBtn.style.color = 'white';
            deleteBtn.style.border = 'none';
            deleteBtn.style.borderRadius = '50%';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.fontSize = '14px';
            deleteBtn.style.lineHeight = '1';
            deleteBtn.style.display = 'flex';
            deleteBtn.style.alignItems = 'center';
            deleteBtn.style.justifyContent = 'center';
            deleteBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                eliminarImagenSeleccionada(index);
            };
            
            container.appendChild(img);
            container.appendChild(deleteBtn);
            previewImages.appendChild(container);
        };
        reader.readAsDataURL(archivo);
    });
    
    preview.style.display = 'grid';
}

function eliminarImagenSeleccionada(index) {
    archivosSeleccionados.splice(index, 1);
    renderizarPreview();
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
    
    if (carrito.length === 0) {
        lista.innerHTML = '<p style="text-align: center; color: #999;">El carrito está vacío</p>';
    } else {
        carrito.forEach((item, index) => {
            const subtotal = item.precio * item.cantidad;
            total += subtotal;
            
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin: 1rem 0; padding: 1rem 0; border-bottom: 1px solid #eee; gap: 0.5rem;';
            
            div.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: #0f2d61;">${item.nombre}</div>
                    <div style="font-size: 0.9rem; color: #666;">$${item.precio} c/u</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <button onclick="cambiarCantidad(${index}, -1)" style="width: 30px; height: 30px; border: 1px solid #0f2d61; background: white; color: #0f2d61; border-radius: 4px; cursor: pointer; font-weight: 700;">−</button>
                    <span style="width: 30px; text-align: center; font-weight: 700;">${item.cantidad}</span>
                    <button onclick="cambiarCantidad(${index}, 1)" style="width: 30px; height: 30px; border: 1px solid #0f2d61; background: white; color: #0f2d61; border-radius: 4px; cursor: pointer; font-weight: 700;">+</button>
                    <button onclick="eliminarDelCarrito(${index})" style="width: 30px; height: 30px; border: 1px solid #e4007c; background: white; color: #e4007c; border-radius: 4px; cursor: pointer; font-weight: 700;">✕</button>
                </div>
                <div style="text-align: right; font-weight: 700; color: #0f2d61; min-width: 80px;">$${subtotal}</div>
            `;
            lista.appendChild(div);
        });
    }
    
    document.getElementById('total').textContent = total;
    
    // Actualizar contador de carrito en ambos lugares
    const cantidadTotal = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    document.getElementById('carrito-count').textContent = cantidadTotal;
    const carritoCountMenu = document.getElementById('carrito-count-menu');
    if (carritoCountMenu) {
        carritoCountMenu.textContent = cantidadTotal;
    }

    // Guardar carrito en localStorage
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function cambiarCantidad(index, cambio) {
    if (carrito[index]) {
        carrito[index].cantidad += cambio;
        if (carrito[index].cantidad <= 0) {
            eliminarDelCarrito(index);
        } else {
            actualizarCarrito();
        }
    }
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

function toggleCarrito() {
    const carritoEl = document.getElementById('carrito');
    carritoEl.style.display = carritoEl.style.display === 'none' ? 'block' : 'none';
}

const btnBuscar = document.getElementById('btn-buscar');
if (btnBuscar) {
    btnBuscar.addEventListener('click', buscarProductos);
}
const busquedaInput = document.getElementById('busqueda');
if (busquedaInput) {
    busquedaInput.addEventListener('input', buscarProductos); // Búsqueda dinámica
    busquedaInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') buscarProductos();
    });
}

// Event listener delegado para el carrito (funciona en ambos casos: logueado y no logueado)
document.addEventListener('click', (e) => {
    if (e.target.closest('a[href="#carrito"]')) {
        e.preventDefault();
        toggleCarrito();
    }
});

document.getElementById('cerrar-carrito').addEventListener('click', toggleCarrito);
document.getElementById('comprar').addEventListener('click', () => {
    if (carrito.length === 0) {
        alert('El carrito está vacío');
        return;
    }
    
    // Generar mensaje del pedido
    let mensajePedido = '🛒 *NUEVO PEDIDO SYPSY*\n\n';
    mensajePedido += '*Productos:*\n';
    let total = 0;
    
    carrito.forEach(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        mensajePedido += `• ${item.nombre}\n  Cantidad: ${item.cantidad}\n  Precio unitario: $${item.precio}\n  Subtotal: $${subtotal}\n\n`;
    });
    
    mensajePedido += `*TOTAL: $${total}*\n\n`;
    
    if (currentUser) {
        mensajePedido += `*Cliente:* ${currentUser.displayName || currentUser.email}\n`;
        mensajePedido += `*Email:* ${currentUser.email}\n\n`;
    } else {
        mensajePedido += '⚠️ Usuario no logueado\n\n';
    }
    
    mensajePedido += 'Por favor confirmar disponibilidad y proceder con el pedido.';
    
    // URL de WhatsApp con el mensaje
    const numeroCentro = '541164521118'; // Centro de atención
    const urlWhatsApp = `https://wa.me/${numeroCentro}?text=${encodeURIComponent(mensajePedido)}`;
    
    // Registrar la venta primero
    registrarVenta();
    
    // Abrir WhatsApp
    window.open(urlWhatsApp, '_blank');
    
    // Limpiar carrito y cerrar modal
    alert('Se abrirá WhatsApp para confirmar el pedido con el centro de atención.');
    carrito = [];
    actualizarCarrito();
    toggleCarrito();
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
