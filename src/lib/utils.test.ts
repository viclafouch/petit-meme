import { globSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { cn } from '~/lib/utils'

const SOURCE_DIRECTORY = path.resolve(import.meta.dirname, '..')
const CN_SOURCE_FILE = path.join('lib', 'utils.ts')
const CN_PACKAGE_IMPORT = /from\s+["']cn(?:\/[^"']*)?["']/u

const CONFLICTING_CLASSES = [
  ['text-caption', 'text-sm'],
  ['text-banner', 'text-xs'],
  ['leading-display', 'leading-none'],
  ['leading-heading', 'leading-tight'],
  ['max-h-dialog', 'max-h-40'],
  ['max-h-sticky-aside', 'max-h-screen'],
  ['max-h-banner', 'max-h-full'],
  ['max-h-dvh-80', 'max-h-40'],
  ['max-h-vh-50', 'max-h-40'],
  ['max-w-vw-90', 'max-w-sm'],
  ['w-banner', 'w-full'],
  ['grid-cols-submit', 'grid-cols-2'],
  ['grid-cols-meme-page', 'grid-cols-1'],
  ['rounded-swatch', 'rounded-md'],
  ['rounded-bl-banner', 'rounded-bl-lg'],
  ['rounded-br-banner', 'rounded-br-lg'],
  ['pb-banner-safe', 'pb-4']
] as const satisfies readonly (readonly [string, string])[]

describe('cn', () => {
  it.each(CONFLICTING_CLASSES)(
    'lets %s override an earlier %s',
    (customClass, tailwindClass) => {
      const merged = cn(tailwindClass, customClass)

      expect(merged).toBe(customClass)
    }
  )

  it.each(CONFLICTING_CLASSES)(
    'lets a later Tailwind class override %s with %s',
    (customClass, tailwindClass) => {
      const merged = cn(customClass, tailwindClass)

      expect(merged).toBe(tailwindClass)
    }
  )

  it.each(['text-caption', 'text-banner'])(
    'keeps %s when a text color follows it',
    (fontSizeClass) => {
      const merged = cn(fontSizeClass, 'text-white')

      expect(merged).toBe(`${fontSizeClass} text-white`)
    }
  )
})

describe('cn imports', () => {
  it('go through ~/lib/utils in every file, so a shadcn add keeps the project classes', () => {
    const sourceFiles = globSync('**/*.{ts,tsx}', {
      cwd: SOURCE_DIRECTORY,
      exclude: [CN_SOURCE_FILE]
    })

    const filesImportingCnPackage = sourceFiles.filter((sourceFile) => {
      return CN_PACKAGE_IMPORT.test(
        readFileSync(path.join(SOURCE_DIRECTORY, sourceFile), 'utf8')
      )
    })

    expect(filesImportingCnPackage).toStrictEqual([])
  })
})
