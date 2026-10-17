import { testRule } from '../rule-tester.ts'
import { hookFileName } from './hook-file-name.ts'

testRule({
  name: 'hook-file-name',
  rule: hookFileName,
  tests: {
    valid: [
      {
        code: 'export const useTheme = () => { return React.useContext(ThemeContext) }',
        filename: '/repo/src/hooks/use-theme.ts'
      },
      {
        code: 'export const getTheme = () => { return theme }',
        filename: '/repo/src/lib/theme.ts'
      }
    ],
    invalid: [
      {
        code: 'export const useTheme = () => { return React.useContext(ThemeContext) }',
        filename: '/repo/src/lib/theme.ts',
        errors: [{ messageId: 'hookFile' }]
      },
      {
        code: 'export function useTheme() { return React.useContext(ThemeContext) }',
        filename: '/repo/src/lib/theme.ts',
        errors: [{ messageId: 'hookFile' }]
      }
    ]
  }
})
