import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Regenerate the app icons with: npx pwa-assets-generator
export default defineConfig({
  preset: { ...minimal2023Preset, maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0A2342' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0A2342' } } },
  images: ['public/icon.svg'],
})
