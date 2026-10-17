import { testRule } from '../rule-tester.ts'
import { queryNaming } from './query-naming.ts'

testRule({
  name: 'query-naming',
  rule: queryNaming,
  tests: {
    valid: [
      'const memesQuery = useQuery(memesOptions)',
      'const saveMutation = useMutation(saveOptions)'
    ],
    invalid: [
      {
        code: 'const memes = useQuery(memesOptions)',
        errors: [{ messageId: 'queryName' }]
      },
      {
        code: 'const { data } = useSuspenseQuery(memesOptions)',
        errors: [{ messageId: 'destructuredQuery' }]
      },
      {
        code: 'const save = useMutation(saveOptions)',
        errors: [{ messageId: 'mutationName' }]
      },
      {
        code: 'const { mutate } = useMutation(saveOptions)',
        errors: [{ messageId: 'destructuredMutation' }]
      },
      {
        code: 'const memes = memesQuery.data',
        errors: [{ messageId: 'intermediateData' }]
      },
      {
        code: 'const { data } = memesQuery',
        errors: [{ messageId: 'destructuredResult' }]
      }
    ]
  }
})
