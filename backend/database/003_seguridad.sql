-- MultiCatálogo — Migración 003: Seguridad, Hardening e Índices de Rendimiento

-- 1. Habilitamos extensión pgcrypto para hashing seguro en PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Índices de optimización en claves foráneas y columnas de filtro
CREATE INDEX IF NOT EXISTS idx_referidos_parent_id ON referidos(parent_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_email ON pedidos(cliente_email);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);

-- 3. Migración de contraseñas existentes a hashes bcrypt (factor de coste 12)
UPDATE usuarios 
   SET password = crypt(password, gen_salt('bf', 12))
 WHERE password NOT LIKE '$2a$%' AND password NOT LIKE '$2b$%';
