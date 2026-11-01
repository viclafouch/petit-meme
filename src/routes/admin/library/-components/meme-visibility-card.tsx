import { Badge } from '~/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader
} from '~/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle
} from '~/components/ui/field'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { MemeStatusMeta } from '~/constants/meme'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { MemeSectionTitle } from './meme-section-title'
import type { MemeFormApi } from './use-meme-form'

const STATUS_ORDER = [
  MemeStatus.PUBLISHED,
  MemeStatus.PENDING,
  MemeStatus.ARCHIVED,
  MemeStatus.REJECTED
] as const satisfies readonly MemeStatus[]

const matchIsMemeStatus = (value: unknown): value is MemeStatus => {
  return STATUS_ORDER.some((status) => {
    return status === value
  })
}

type MemeVisibilityCardProps = {
  index: number
  form: MemeFormApi
  className?: string
}

export const MemeVisibilityCard = ({
  index,
  form,
  className
}: MemeVisibilityCardProps) => {
  return (
    <Card className={className}>
      <CardHeader>
        <MemeSectionTitle index={index}>Visibilité</MemeSectionTitle>
        <CardDescription>Qui voit ce Meme sur le site.</CardDescription>
      </CardHeader>
      <CardContent>
        <form.Field
          name="status"
          children={(field) => {
            return (
              <FieldSet>
                <FieldLegend className="sr-only">Statut</FieldLegend>
                <RadioGroup
                  name={field.name}
                  className="gap-2"
                  value={field.state.value}
                  onValueChange={(value) => {
                    if (matchIsMemeStatus(value)) {
                      field.handleChange(value)
                    }
                  }}
                >
                  {STATUS_ORDER.map((status) => {
                    const optionId = `meme-status-${status}`

                    return (
                      <FieldLabel key={status} htmlFor={optionId}>
                        <Field orientation="horizontal">
                          <RadioGroupItem id={optionId} value={status} />
                          <FieldContent>
                            <FieldTitle>
                              <Badge
                                variant={MemeStatusMeta[status].badgeVariant}
                                size="md"
                              >
                                {MemeStatusMeta[status].label}
                              </Badge>
                            </FieldTitle>
                            <FieldDescription>
                              {MemeStatusMeta[status].description}
                            </FieldDescription>
                          </FieldContent>
                        </Field>
                      </FieldLabel>
                    )
                  })}
                </RadioGroup>
              </FieldSet>
            )
          }}
        />
      </CardContent>
    </Card>
  )
}
