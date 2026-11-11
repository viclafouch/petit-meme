import { createCn, validators } from 'cn/config'

export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: ['caption', 'banner'] }],
      leading: [{ leading: ['display', 'heading'] }],
      'max-h': [
        {
          'max-h': [
            'dialog',
            'sticky-aside',
            'banner',
            { dvh: [validators.isInteger], vh: [validators.isInteger] }
          ]
        }
      ],
      'max-w': [{ 'max-w': [{ vw: [validators.isInteger] }] }],
      w: [{ w: ['banner'] }],
      'grid-cols': [{ 'grid-cols': ['submit', 'meme-page'] }],
      rounded: [{ rounded: ['swatch'] }],
      'rounded-bl': [{ 'rounded-bl': ['banner'] }],
      'rounded-br': [{ 'rounded-br': ['banner'] }],
      pb: [{ pb: ['banner-safe'] }]
    }
  }
})
