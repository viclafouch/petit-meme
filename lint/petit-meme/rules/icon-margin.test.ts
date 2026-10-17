import { testRule } from '../rule-tester.ts'
import { iconMargin } from './icon-margin.ts'

testRule({
  name: 'icon-margin',
  rule: iconMargin,
  tests: {
    valid: [
      'import { Play } from \'lucide-react\'\nconst Action = () => { return <Button><Play className="size-4" /></Button> }',
      'import { Play } from \'lucide-react\'\nconst Action = () => { return <div><Play className="mr-2" /></div> }'
    ],
    invalid: [
      {
        code: 'import { Play } from \'lucide-react\'\nconst Action = () => { return <Button><Play className="mr-2 size-4" /></Button> }',
        errors: [{ messageId: 'iconMargin' }]
      }
    ]
  }
})
