-- MultiCatálogo — Migración 002: Motor Transaccional ACID (Checkout)

-- 1. Restricción de integridad para prevenir sobreventas y stock negativo
ALTER TABLE productos 
    DROP CONSTRAINT IF EXISTS chk_stock_positivo;

ALTER TABLE productos 
    ADD CONSTRAINT chk_stock_positivo CHECK (stock >= 0);

-- 2. Tabla pedidos para persistir la cabecera transaccional
CREATE TABLE IF NOT EXISTS pedidos (
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

-- 3. Tabla pedido_items con clave foránea e integridad referencial
CREATE TABLE IF NOT EXISTS pedido_items (
    id          SERIAL PRIMARY KEY,
    pedido_id   INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    nombre      TEXT NOT NULL,
    cantidad    INTEGER NOT NULL CHECK (cantidad > 0),
    precio      NUMERIC(10, 2) NOT NULL,
    subtotal    NUMERIC(10, 2) NOT NULL
);
