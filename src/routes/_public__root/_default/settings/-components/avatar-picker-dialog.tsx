import type { WithDialog } from '~/@types/dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '~/components/animate-ui/radix/dialog'
import { Separator } from '~/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import {
  AVATAR_CATALOG,
  AVATAR_PROVIDER_SELECTION,
  type AvatarSelection
} from '~/constants/avatar'
import { SELECTED_TILE_RING_CLASS_NAME } from '~/constants/ui'
import { resolveAvatarPath } from '~/helpers/avatar'
import { useUpdateAvatar } from '~/hooks/use-update-avatar'
import type { SessionUser } from '~/lib/role'
import { cn } from '~/lib/utils'
import { m } from '~/paraglide/messages.js'

const AVATAR_TILE_CLASS_NAME = cn(
  'size-auto aspect-square min-w-11 flex-none rounded-full p-0 first:rounded-full last:rounded-full',
  SELECTED_TILE_RING_CLASS_NAME
)

const AVATAR_GRID_CLASS_NAME = 'grid grid-cols-4 gap-3 sm:grid-cols-6'

type AvatarTileParams = {
  selection: AvatarSelection
  image: string
  label: string
  isSelected: boolean
}

const AvatarTile = ({
  selection,
  image,
  label,
  isSelected
}: AvatarTileParams) => {
  return (
    <ToggleGroupItem
      value={selection}
      aria-label={label}
      data-active={isSelected || undefined}
      className={AVATAR_TILE_CLASS_NAME}
    >
      <img
        src={image}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        className="size-full rounded-full object-cover"
      />
    </ToggleGroupItem>
  )
}

type AvatarPickerDialogParams = WithDialog<{ user: SessionUser }>

export const AvatarPickerDialog = ({
  open,
  onOpenChange,
  user
}: AvatarPickerDialogParams) => {
  const updateAvatarMutation = useUpdateAvatar()

  const providerAvatar = user.providerAvatar ?? null
  const selectedSlot = AVATAR_CATALOG.find((slot) => {
    return resolveAvatarPath(slot.id) === user.image
  })

  const resolveCurrentSelection = () => {
    if (selectedSlot) {
      return selectedSlot.id
    }

    return user.image === providerAvatar ? AVATAR_PROVIDER_SELECTION : undefined
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.settings_avatar_change()}</DialogTitle>
          <DialogDescription>
            {m.settings_avatar_description()}
          </DialogDescription>
        </DialogHeader>
        <ToggleGroup
          type="single"
          value={resolveCurrentSelection()}
          onValueChange={(selection: AvatarSelection | '') => {
            if (selection !== '') {
              updateAvatarMutation.mutate(selection)
            }
          }}
          aria-label={m.settings_avatar_change()}
          aria-busy={updateAvatarMutation.isPending}
          className="flex max-h-[60dvh] w-full flex-col items-stretch gap-4 overflow-y-auto p-1"
        >
          {providerAvatar ? (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs">
                  {m.settings_avatar_provider_label()}
                </p>
                <div className={AVATAR_GRID_CLASS_NAME}>
                  <AvatarTile
                    selection={AVATAR_PROVIDER_SELECTION}
                    image={providerAvatar}
                    label={m.settings_avatar_provider_label()}
                    isSelected={user.image === providerAvatar}
                  />
                </div>
              </div>
              <Separator />
            </>
          ) : null}
          <div className={AVATAR_GRID_CLASS_NAME}>
            {AVATAR_CATALOG.map((slot, index) => {
              const image = resolveAvatarPath(slot.id)

              return (
                <AvatarTile
                  key={slot.id}
                  selection={slot.id}
                  image={image}
                  label={m.settings_avatar_slot_label({
                    number: String(index + 1)
                  })}
                  isSelected={user.image === image}
                />
              )
            })}
          </div>
        </ToggleGroup>
      </DialogContent>
    </Dialog>
  )
}
