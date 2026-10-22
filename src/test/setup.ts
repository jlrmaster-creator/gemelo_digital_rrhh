/**
 * Configuracion global de las pruebas unitarias.
 *
 * Se carga antes que cada archivo de prueba (ver `vitest.config.ts`).
 * Aporta los matchers de `@testing-library/jest-dom` y stubs minimos del
 * entorno de navegador que jsPDF necesita.
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsPDF trabaja con el sistema de medidas de texto del navegador: en jsdom no
// existe, asi que se sustituye por una aproximacion suficiente para validar
// la estructura de los informes.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  }

  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(() => 'blob:mock') as unknown as typeof window.URL.createObjectURL;
    window.URL.revokeObjectURL = vi.fn() as unknown as typeof window.URL.revokeObjectURL;
  }
}
