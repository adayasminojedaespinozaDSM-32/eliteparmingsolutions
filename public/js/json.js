document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/usuarios') // Ruta para obtener todos los usuarios
        .then(response => response.json())
        .then(usuarios => {
            // Construir HTML para mostrar la información de todos los usuarios
            const usuarioInfo = document.getElementById('usuario-info');
            usuarioInfo.innerHTML = '';

            usuarios.forEach(usuario => {
                const usuarioHtml = `
                    <div class="usuario">
                        <p><strong>ID:</strong> ${usuario.id}</p>
                        <p><strong>Nombre:</strong> <span class="usuario-nombre" data-id="${usuario.id}">${usuario.nombre}</span></p>
                        <p><strong>Email:</strong> ${usuario.correo}</p>
                        <p><strong>Password:</strong> ${usuario.password}</p>
                        <!-- Puedes agregar más campos aquí según tus necesidades -->
                    </div>
                `;
                usuarioInfo.innerHTML += usuarioHtml;
            });

            // Agregar evento click a los nombres de usuario
            const nombresUsuarios = document.querySelectorAll('.usuario-nombre');
            nombresUsuarios.forEach(nombreUsuario => {
                nombreUsuario.addEventListener('click', () => {
                    const usuarioId = nombreUsuario.dataset.id;
                    fetch(`/api/usuarios/${usuarioId}`) // Ruta para obtener los detalles del usuario por ID
                        .then(response => response.json())
                        .then(usuario => {
                            mostrarDetalleUsuario(usuario);
                        })
                        .catch(error => console.error('Error al obtener los detalles del usuario:', error));
                });
            });
        })
        .catch(error => console.error('Error al obtener los usuarios:', error));

    // Función para mostrar los detalles completos del usuario
    function mostrarDetalleUsuario(usuario) {
        const usuarioInfo = document.getElementById('usuario-info');
        usuarioInfo.innerHTML = `
            <div class="usuario">
                <p><strong>ID:</strong> ${usuario.id}</p>
                <p><strong>Nombre:</strong> ${usuario.nombre}</p>
                <p><strong>Email:</strong> ${usuario.correo}</p>
                <p><strong>Password:</strong> ${usuario.password}</p>
                <!-- Puedes agregar más campos aquí según tus necesidades -->
            </div>
        `;
    }
});
