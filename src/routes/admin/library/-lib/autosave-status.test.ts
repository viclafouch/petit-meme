import { describe, expect, it } from 'vitest'
import { MemeStatus } from '~/db/generated/prisma/enums'
import { resolveAutosaveStatus } from './autosave-status'

describe('resolveAutosaveStatus', () => {
  it('keeps a draft unpublished when Publié is only selected', () => {
    expect(
      resolveAutosaveStatus({
        savedStatus: MemeStatus.PENDING,
        selectedStatus: MemeStatus.PUBLISHED
      })
    ).toBe(MemeStatus.PENDING)
  })

  it('saves the selected status when the Meme leaves the site', () => {
    expect(
      resolveAutosaveStatus({
        savedStatus: MemeStatus.PUBLISHED,
        selectedStatus: MemeStatus.ARCHIVED
      })
    ).toBe(MemeStatus.ARCHIVED)
  })

  it('keeps a published Meme published', () => {
    expect(
      resolveAutosaveStatus({
        savedStatus: MemeStatus.PUBLISHED,
        selectedStatus: MemeStatus.PUBLISHED
      })
    ).toBe(MemeStatus.PUBLISHED)
  })
})
