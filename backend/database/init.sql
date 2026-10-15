-- MultiCatálogo — PostgreSQL 16 initialization script.
-- Mounted at /docker-entrypoint-initdb.d/ by docker-compose.yml, so it runs
-- automatically on the first boot of the pgdata volume.
-- Re-running it manually is safe: it drops and recreates everything in the
-- correct FK order (referidos has a self-reference).

DROP TABLE IF EXISTS pedido_items CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS referidos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ---------------------------------------------------------------------------
-- usuarios: the two accounts from the notebook.
-- NOTE: passwords are stored in plaintext on purpose (temporary, per task).
-- ---------------------------------------------------------------------------
CREATE TABLE usuarios (
    id       SERIAL PRIMARY KEY,
    email    TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    rol      TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- productos: catalog seeded from frontend/src/data/productos.ts so the UI
-- keeps rendering identical data. `galeria` is JSONB (array of image URLs).
-- id = 1 MUST stay the "Serum Revitalizante" at 45.00 (notebook validation
-- runs: UPDATE productos SET precio = 99.99 WHERE id = 1).
-- ---------------------------------------------------------------------------
CREATE TABLE productos (
    id          INTEGER PRIMARY KEY,
    nombre      TEXT        NOT NULL,
    descripcion TEXT        NOT NULL,
    precio      NUMERIC(10, 2) NOT NULL,
    categoria   TEXT        NOT NULL,
    img         TEXT        NOT NULL,
    galeria     JSONB       NOT NULL DEFAULT '[]',
    stock       INTEGER     NOT NULL DEFAULT 50
);

-- ---------------------------------------------------------------------------
-- referidos: flat rows of the referral network; the tree is rebuilt in Go
-- (repository.construirArbol). parent_id is a self-reference: the root row
-- has NULL parent. Row order and tree shape mirror frontend/src/data/red.ts.
-- ---------------------------------------------------------------------------
CREATE TABLE referidos (
    id        INTEGER PRIMARY KEY,
    nombre    TEXT        NOT NULL,
    nivel     INTEGER     NOT NULL,
    ventas    NUMERIC(10, 2) NOT NULL,
    parent_id INTEGER REFERENCES referidos (id)
);

-- ---------------------------------------------------------------------------
-- Seed: usuarios
-- ---------------------------------------------------------------------------
INSERT INTO usuarios (email, password, rol) VALUES
    ('admin@upse.edu.ec', '123456', 'admin'),
    ('cliente@upse.edu.ec', '123456', 'cliente');

-- ---------------------------------------------------------------------------
-- Seed: productos (identical to frontend/src/data/productos.ts)
-- ---------------------------------------------------------------------------
INSERT INTO productos (id, nombre, descripcion, precio, categoria, img, galeria) VALUES
    (1, 'Serum Revitalizante',
        'Serum concentrado con vitamina C y ácido hialurónico. Ilumina la piel, reduce manchas y aporta hidratación profunda desde la primera aplicación.',
        45.00, 'Serum', 'https://picsum.photos/seed/serum/600',
        '["https://picsum.photos/seed/serum1/600","https://picsum.photos/seed/serum2/600","https://picsum.photos/seed/serum3/600"]'),
    (2, 'Crema Hidratante Pro',
        'Crema facial de textura ligera con niacinamida y manteca de karité. Hidratación de 24 horas y barrera cutánea fortalecida para todo tipo de piel.',
        32.50, 'Crema', 'https://picsum.photos/seed/crema/600',
        '["https://picsum.photos/seed/crema1/600","https://picsum.photos/seed/crema2/600","https://picsum.photos/seed/crema3/600"]'),
    (3, 'Tónico Purificante',
        'Tónico sin alcohol con hamamelis y agua de rosas. Limpia poros, equilibra el pH y prepara la piel para el resto de la rutina diaria.',
        28.00, 'Tónico', 'https://picsum.photos/seed/tonico/600',
        '["https://picsum.photos/seed/tonico1/600","https://picsum.photos/seed/tonico2/600","https://picsum.photos/seed/tonico3/600"]'),
    (4, 'Mascarilla Nocturna',
        'Mascarilla de noche con colágeno y vitamina E. Repara la piel mientras duermes y recupera la luminosidad al despertar.',
        50.00, 'Mascarilla', 'https://picsum.photos/seed/mascarilla/600',
        '["https://picsum.photos/seed/mascarilla1/600","https://picsum.photos/seed/mascarilla2/600","https://picsum.photos/seed/mascarilla3/600"]'),
    (5, 'Serum Anti-Edad Retinol',
        'Serum de retinol encapsulado que suaviza líneas de expresión y mejora la firmeza. Uso nocturno recomendado.',
        58.00, 'Serum', 'https://picsum.photos/seed/retinol/600',
        '["https://picsum.photos/seed/retinol1/600","https://picsum.photos/seed/retinol2/600","https://picsum.photos/seed/retinol3/600"]'),
    (6, 'Crema Contorno de Ojos',
        'Contorno de ojos con cafeína y péptidos. Reduce bolsas y ojeras, hidrata la zona más delicada del rostro.',
        26.00, 'Crema', 'https://picsum.photos/seed/ojos/600',
        '["https://picsum.photos/seed/ojos1/600","https://picsum.photos/seed/ojos2/600","https://picsum.photos/seed/ojos3/600"]'),
    (7, 'Tónico Exfoliante AHA-BHA',
        'Exfoliación química suave con ácidos AHA y BHA. Renueva la textura de la piel y desobstruye los poros.',
        34.00, 'Tónico', 'https://picsum.photos/seed/exfoliante/600',
        '["https://picsum.photos/seed/exfoliante1/600","https://picsum.photos/seed/exfoliante2/600","https://picsum.photos/seed/exfoliante3/600"]'),
    (8, 'Kit Rutina Completa',
        'Kit integral con serum, crema, tónico y mascarilla. La rutina perfecta para comenzar: limpieza, tratamiento e hidratación.',
        129.00, 'Kit', 'https://picsum.photos/seed/kit/600',
        '["https://picsum.photos/seed/kit1/600","https://picsum.photos/seed/kit2/600","https://picsum.photos/seed/kit3/600"]');

-- ---------------------------------------------------------------------------
-- Seed: referidos (flat form of the redInicial tree from red.ts)
-- ---------------------------------------------------------------------------
INSERT INTO referidos (id, nombre, nivel, ventas, parent_id) VALUES
    (0, 'Tú', 0, 2400.00, NULL),
    (1, 'Ana García', 1, 1200.00, 0),
    (2, 'Luis Poveda', 1, 850.00, 0),
    (3, 'Marta Sánchez', 1, 430.00, 0),
    (4, 'Carlos Ruiz', 2, 500.00, 1),
    (5, 'Sofía León', 2, 430.00, 1),
    (6, 'Marco Díaz', 2, 380.00, 2),
    (7, 'Diana Paz', 3, 300.00, 4);

-- ---------------------------------------------------------------------------
-- pedidos: almacena las transacciones principales de checkout (Fase 4).
-- ---------------------------------------------------------------------------
CREATE TABLE pedidos (
    id             SERIAL PRIMARY KEY,
    numero         VARCHAR(50) NOT NULL UNIQUE,
    cliente_nombre TEXT NOT NULL,
    cliente_email  TEXT NOT NULL,
    direccion      TEXT NOT NULL,
    ciudad         TEXT NOT NULL,
    telefono       TEXT NOT NULL,
    metodo_pago    TEXT NOT NULL,
    total          NUMERIC(10, 2) NOT NULL,
    fecha          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- pedido_items: detalle de productos comprados con integridad referencial.
-- producto_id hace referencia obligatoria a productos(id) para verificar ACID.
-- ---------------------------------------------------------------------------
CREATE TABLE pedido_items (
    id          SERIAL PRIMARY KEY,
    pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    nombre      TEXT NOT NULL,
    cantidad    INTEGER NOT NULL,
    precio      NUMERIC(10, 2) NOT NULL,
    subtotal    NUMERIC(10, 2) NOT NULL
);
