import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Tests del Web App Manifest.
 *
 * El manifest es un contrato con el sistema operativo: si un icono falta,
 * tiene el tamaño equivocado o la app declara un `start_url` vacío, la
 * instalación falla (o instala un ícono pixelado) sin que nada en el código
 * de la app se entere.
 *
 * Este test lee el manifest y los PNG del disco: es un test de Node (no de
 * DOM) que falla si alguien borra, renombra o redimensiona un icono.
 */

interface ManifestIcon {
  src: string
  sizes?: string
  type?: string
  purpose?: string
}

interface ManifestShortcut {
  name?: string
  short_name?: string
  url?: string
  icons?: ManifestIcon[]
}

interface WebManifest {
  name?: string
  short_name?: string
  start_url?: string
  scope?: string
  display?: string
  icons?: ManifestIcon[]
  shortcuts?: ManifestShortcut[]
}

const PUBLIC_DIR = process.env.PUBLIC_DIR ?? join(process.cwd(), 'public')
const MANIFEST_PATH = join(PUBLIC_DIR, 'manifest.webmanifest')

const readManifest = (): WebManifest =>
  JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) as WebManifest

/** Traduce el `src` del manifest (una URL pública) a una ruta en `public/`. */
const publicPathFor = (src: string): string => resolve(PUBLIC_DIR, src.replace(/^\/+/, ''))

/** Lee el tamaño real de un PNG desde su chunk IHDR (bytes 16..24). */
const readPngSize = (filePath: string): { width: number; height: number } => {
  const buffer = readFileSync(filePath)
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  if (!buffer.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`El archivo no es un PNG válido: ${filePath}`)
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

const manifest = readManifest()

const allIcons = (): ManifestIcon[] => {
  const shortcutsIcons = (manifest.shortcuts ?? []).flatMap((shortcut) => shortcut.icons ?? [])
  return [...(manifest.icons ?? []), ...shortcutsIcons]
}

describe('Web App Manifest', () => {
  it('es un JSON válido con los campos obligatorios', () => {
    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
    expect(manifest.start_url).toBeTruthy()
    expect(manifest.scope).toBeTruthy()
    expect(manifest.display).toBeTruthy()
  })

  it('declara íconos', () => {
    expect(manifest.icons?.length ?? 0).toBeGreaterThan(0)
  })

  it('cada ícono apunta a un archivo que existe dentro de public/', () => {
    for (const icon of allIcons()) {
      const filePath = publicPathFor(icon.src)

      // El ícono tiene que vivir DENTRO de `public/`: ni rutas hacia afuera
      // ni rutas absolutas.
      expect(filePath.startsWith(PUBLIC_DIR)).toBe(true)
      expect(existsSync(filePath)).toBe(true)
    }
  })

  it('cada ícono PNG declara el tamaño real de sus píxeles', () => {
    for (const icon of allIcons()) {
      if (icon.type !== 'image/png') {
        continue
      }

      const filePath = publicPathFor(icon.src)
      const real = readPngSize(filePath)
      const declared = icon.sizes ?? ''

      expect(declared).toBe(`${real.width}x${real.height}`)
    }
  })

  it('tiene un ícono "any" y uno "maskable", ambos de al menos 192x192', () => {
    const pngIcons = allIcons().filter((icon) => icon.type === 'image/png')

    const any = pngIcons.filter((icon) => (icon.purpose ?? 'any') === 'any')
    const maskable = pngIcons.filter((icon) => icon.purpose === 'maskable')

    expect(any.length).toBeGreaterThan(0)
    expect(maskable.length).toBeGreaterThan(0)

    for (const icon of [...any, ...maskable]) {
      const { width, height } = readPngSize(publicPathFor(icon.src))
      expect(width).toBeGreaterThanOrEqual(192)
      expect(height).toBeGreaterThanOrEqual(192)
    }
  })

  it('cada shortcut apunta a íconos existentes', () => {
    for (const shortcut of manifest.shortcuts ?? []) {
      expect(shortcut.icons?.length ?? 0).toBeGreaterThan(0)

      for (const icon of shortcut.icons ?? []) {
        expect(existsSync(publicPathFor(icon.src))).toBe(true)
      }
    }
  })
})
