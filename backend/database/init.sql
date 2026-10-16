-- MultiCatálogo — PostgreSQL 16 initialization script.
-- Mounted at /docker-entrypoint-initdb.d/ by docker-compose.yml.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS comisiones CASCADE;
DROP TABLE IF EXISTS liquidaciones CASCADE;
DROP TABLE IF EXISTS pedido_items CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS referidos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;

-- ---------------------------------------------------------------------------
-- referidos: red multinivel con auto-referencia y código único para enlaces
-- ---------------------------------------------------------------------------
CREATE TABLE referidos (
    id        SERIAL PRIMARY KEY,
    nombre    TEXT        NOT NULL,
    nivel     INTEGER     NOT NULL,
    ventas    NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    parent_id INTEGER REFERENCES referidos (id),
    codigo    VARCHAR(50) UNIQUE
);

-- ---------------------------------------------------------------------------
-- usuarios: cuentas con hash bcrypt, rol, estado y vínculo a la red
-- ---------------------------------------------------------------------------
CREATE TABLE usuarios (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL DEFAULT 'Usuario',
    email       TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    rol         TEXT NOT NULL DEFAULT 'cliente',
    activo      BOOLEAN NOT NULL DEFAULT true,
    referido_id INTEGER REFERENCES referidos(id),
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- productos: catálogo con galería JSONB, stock con control positivo y activo
-- ---------------------------------------------------------------------------
CREATE TABLE productos (
    id          SERIAL PRIMARY KEY,
    nombre      TEXT        NOT NULL,
    descripcion TEXT        NOT NULL,
    precio      NUMERIC(10, 2) NOT NULL,
    categoria   TEXT        NOT NULL,
    img         TEXT        NOT NULL,
    galeria     JSONB       NOT NULL DEFAULT '[]',
    stock       INTEGER     NOT NULL DEFAULT 50,
    activo      BOOLEAN     NOT NULL DEFAULT true,
    CONSTRAINT chk_stock_positivo CHECK (stock >= 0)
);

-- ---------------------------------------------------------------------------
-- pedidos: transacciones de compra con usuario_id y estado
-- ---------------------------------------------------------------------------
CREATE TABLE pedidos (
    id             SERIAL PRIMARY KEY,
    numero         VARCHAR(50) NOT NULL UNIQUE,
    usuario_id     INTEGER REFERENCES usuarios(id),
    cliente_nombre TEXT NOT NULL,
    cliente_email  TEXT NOT NULL,
    direccion      TEXT NOT NULL,
    ciudad         TEXT NOT NULL,
    telefono       TEXT NOT NULL,
    metodo_pago    TEXT NOT NULL,
    total          NUMERIC(10, 2) NOT NULL,
    estado         VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    fecha          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- pedido_items: detalle de productos comprados
-- ---------------------------------------------------------------------------
CREATE TABLE pedido_items (
    id          SERIAL PRIMARY KEY,
    pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    nombre      TEXT NOT NULL,
    cantidad    INTEGER NOT NULL CHECK (cantidad > 0),
    precio      NUMERIC(10, 2) NOT NULL,
    subtotal    NUMERIC(10, 2) NOT NULL
);

-- ---------------------------------------------------------------------------
-- liquidaciones: registros de pago de comisiones a distribuidores
-- ---------------------------------------------------------------------------
CREATE TABLE liquidaciones (
    id          SERIAL PRIMARY KEY,
    referido_id INTEGER NOT NULL REFERENCES referidos(id),
    total       NUMERIC(10, 2) NOT NULL,
    estado      VARCHAR(50) NOT NULL DEFAULT 'pagada',
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pagada_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- comisiones: ledger auditable del multinivel (10% N1, 5% N2, 2% N3)
-- ---------------------------------------------------------------------------
CREATE TABLE comisiones (
    id             SERIAL PRIMARY KEY,
    pedido_id      INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    referido_id    INTEGER NOT NULL REFERENCES referidos(id),
    nivel          INTEGER NOT NULL,
    porcentaje     NUMERIC(5, 2) NOT NULL,
    monto          NUMERIC(10, 2) NOT NULL,
    estado         VARCHAR(50) NOT NULL DEFAULT 'pendiente',
    liquidacion_id INTEGER REFERENCES liquidaciones(id),
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
CREATE INDEX idx_referidos_parent_id ON referidos(parent_id);
CREATE INDEX idx_pedidos_cliente_email ON pedidos(cliente_email);
CREATE INDEX idx_pedidos_usuario_id ON pedidos(usuario_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedido_items_pedido_id ON pedido_items(pedido_id);
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_comisiones_referido_pedido ON comisiones(referido_id, pedido_id);
CREATE INDEX idx_comisiones_estado ON comisiones(estado);

-- ---------------------------------------------------------------------------
-- Seed: referidos iniciales
-- ---------------------------------------------------------------------------
INSERT INTO referidos (id, nombre, nivel, ventas, parent_id, codigo) VALUES
    (0, 'Tú', 0, 2400.00, NULL, 'TU'),
    (1, 'Ana García', 1, 1200.00, 0, 'ANA'),
    (2, 'Luis Poveda', 1, 850.00, 0, 'LUIS'),
    (3, 'Marta Sánchez', 1, 430.00, 0, 'MARTA'),
    (4, 'Carlos Ruiz', 2, 500.00, 1, 'CARLOS'),
    (5, 'Sofía León', 2, 430.00, 1, 'SOFIA'),
    (6, 'Marco Díaz', 2, 380.00, 2, 'MARCO'),
    (7, 'Diana Paz', 3, 300.00, 4, 'DIANA');

SELECT setval('referidos_id_seq', 8, true);

-- ---------------------------------------------------------------------------
-- Seed: usuarios iniciales
-- ---------------------------------------------------------------------------
INSERT INTO usuarios (id, nombre, email, password, rol, activo, referido_id) VALUES
    (1, 'Administrador General', 'admin@upse.edu.ec', crypt('123456', gen_salt('bf', 12)), 'admin', true, 0),
    (2, 'Luis Poveda (Cliente)', 'cliente@upse.edu.ec', crypt('123456', gen_salt('bf', 12)), 'cliente', true, 2);

SELECT setval('usuarios_id_seq', 3, true);

-- ---------------------------------------------------------------------------
-- Seed: productos
-- ---------------------------------------------------------------------------
INSERT INTO productos (id, nombre, descripcion, precio, categoria, img, galeria, stock, activo) VALUES
    (1, 'Serum Revitalizante',
        'Serum concentrado con vitamina C y ácido hialurónico. Ilumina la piel, reduce manchas y aporta hidratación profunda desde la primera aplicación.',
        45.00, 'Serum', 'https://picsum.photos/seed/serum/600',
        '["https://picsum.photos/seed/serum1/600","https://picsum.photos/seed/serum2/600","https://picsum.photos/seed/serum3/600"]', 50, true),
    (2, 'Crema Hidratante Pro',
        'Crema facial de textura ligera con niacinamida y manteca de karité. Hidratación de 24 horas y barrera cutánea fortalecida para todo tipo de piel.',
        32.50, 'Crema', 'https://picsum.photos/seed/crema/600',
        '["https://picsum.photos/seed/crema1/600","https://picsum.photos/seed/crema2/600","https://picsum.photos/seed/crema3/600"]', 50, true),
    (3, 'Tónico Purificante',
        'Tónico sin alcohol con hamamelis y agua de rosas. Limpia poros, equilibra el pH y prepara la piel para el resto de la rutina diaria.',
        28.00, 'Tónico', 'https://picsum.photos/seed/tonico/600',
        '["https://picsum.photos/seed/tonico1/600","https://picsum.photos/seed/tonico2/600","https://picsum.photos/seed/tonico3/600"]', 50, true),
    (4, 'Mascarilla Nocturna',
        'Mascarilla de noche con colágeno y vitamina E. Repara la piel mientras duermes y recupera la luminosidad al despertar.',
        50.00, 'Mascarilla', 'https://picsum.photos/seed/mascarilla/600',
        '["https://picsum.photos/seed/mascarilla1/600","https://picsum.photos/seed/mascarilla2/600","https://picsum.photos/seed/mascarilla3/600"]', 50, true),
    (5, 'Serum Anti-Edad Retinol',
        'Serum de retinol encapsulado que suaviza líneas de expresión y mejora la firmeza. Uso nocturno recomendado.',
        58.00, 'Serum', 'https://picsum.photos/seed/retinol/600',
        '["https://picsum.photos/seed/retinol1/600","https://picsum.photos/seed/retinol2/600","https://picsum.photos/seed/retinol3/600"]', 50, true),
    (6, 'Crema Contorno de Ojos',
        'Contorno de ojos con cafeína y péptidos. Reduce bolsas y ojeras, hidrata la zona más delicada del rostro.',
        26.00, 'Crema', 'https://picsum.photos/seed/ojos/600',
        '["https://picsum.photos/seed/ojos1/600","https://picsum.photos/seed/ojos2/600","https://picsum.photos/seed/ojos3/600"]', 50, true),
    (7, 'Tónico Exfoliante AHA-BHA',
        'Exfoliación química suave con ácidos AHA y BHA. Renueva la textura de la piel y desobstruye los poros.',
        34.00, 'Tónico', 'https://picsum.photos/seed/exfoliante/600',
        '["https://picsum.photos/seed/exfoliante1/600","https://picsum.photos/seed/exfoliante2/600","https://picsum.photos/seed/exfoliante3/600"]', 50, true),
    (8, 'Kit Rutina Completa',
        'Kit integral con serum, crema, tónico y mascarilla. La rutina perfecta para comenzar: limpieza, tratamiento e hidratación.',
        129.00, 'Kit', 'https://picsum.photos/seed/kit/600',
        '["https://picsum.photos/seed/kit1/600","https://picsum.photos/seed/kit2/600","https://picsum.photos/seed/kit3/600"]', 50, true);

SELECT setval('productos_id_seq', 9, true);
