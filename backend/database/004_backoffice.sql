-- MultiCatálogo — Migración 004: Back-office, Registro, Gestión de Pedidos y Ledger de Comisiones (U2)

-- 1. Ampliación de la tabla usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre VARCHAR(150) NOT NULL DEFAULT 'Usuario';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referido_id INTEGER REFERENCES referidos(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Ampliación y secuencia de la tabla referidos
ALTER TABLE referidos ADD COLUMN IF NOT EXISTS codigo VARCHAR(50) UNIQUE;

CREATE SEQUENCE IF NOT EXISTS referidos_id_seq;
SELECT setval('referidos_id_seq', COALESCE((SELECT MAX(id) FROM referidos), 0) + 1, false);
ALTER TABLE referidos ALTER COLUMN id SET DEFAULT nextval('referidos_id_seq');

-- Semillas de códigos de referidos
UPDATE referidos SET codigo = 'TU' WHERE id = 0 AND codigo IS NULL;
UPDATE referidos SET codigo = 'ANA' WHERE id = 1 AND codigo IS NULL;
UPDATE referidos SET codigo = 'LUIS' WHERE id = 2 AND codigo IS NULL;
UPDATE referidos SET codigo = 'MARTA' WHERE id = 3 AND codigo IS NULL;
UPDATE referidos SET codigo = 'CARLOS' WHERE id = 4 AND codigo IS NULL;
UPDATE referidos SET codigo = 'SOFIA' WHERE id = 5 AND codigo IS NULL;
UPDATE referidos SET codigo = 'MARCO' WHERE id = 6 AND codigo IS NULL;
UPDATE referidos SET codigo = 'DIANA' WHERE id = 7 AND codigo IS NULL;

-- Enlazar usuarios del seed a sus respectivos nodos de referidos
UPDATE usuarios SET nombre = 'Administrador General', referido_id = 0 WHERE email = 'admin@upse.edu.ec';
UPDATE usuarios SET nombre = 'Luis Poveda (Cliente)', referido_id = 2 WHERE email = 'cliente@upse.edu.ec';

-- 3. Ampliación y secuencia de la tabla productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

CREATE SEQUENCE IF NOT EXISTS productos_id_seq;
SELECT setval('productos_id_seq', COALESCE((SELECT MAX(id) FROM productos), 0) + 1, false);
ALTER TABLE productos ALTER COLUMN id SET DEFAULT nextval('productos_id_seq');

-- 4. Ampliación de la tabla pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado VARCHAR(50) NOT NULL DEFAULT 'pendiente';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);

-- 5. Tabla liquidaciones (deuda y pagos a distribuidores)
CREATE TABLE IF NOT EXISTS liquidaciones (
    id          SERIAL PRIMARY KEY,
    referido_id INTEGER NOT NULL REFERENCES referidos(id),
    total       NUMERIC(10, 2) NOT NULL,
    estado      VARCHAR(50) NOT NULL DEFAULT 'pagada',
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pagada_en   TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla comisiones (Ledger auditable del negocio multinivel)
CREATE TABLE IF NOT EXISTS comisiones (
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

CREATE INDEX IF NOT EXISTS idx_comisiones_referido_pedido ON comisiones(referido_id, pedido_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_estado ON comisiones(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
