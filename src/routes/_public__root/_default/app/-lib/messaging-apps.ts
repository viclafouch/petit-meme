export const MESSAGING_APPS = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    tileClassName: 'bg-[#25d366] text-white'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    tileClassName:
      'bg-[linear-gradient(45deg,#feda75,#fa7e1e_25%,#d62976_50%,#962fbf_75%,#4f5bd5)] text-white'
  },
  {
    id: 'messenger',
    name: 'Messenger',
    tileClassName:
      'bg-[linear-gradient(45deg,#0695ff,#a334fa_60%,#ff6968)] text-white'
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    tileClassName: 'bg-[#fffc00] text-black'
  },
  {
    id: 'discord',
    name: 'Discord',
    tileClassName: 'bg-[#5865f2] text-white'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    tileClassName: 'bg-[#26a5e4] text-white'
  }
] as const

export type MessagingApp = (typeof MESSAGING_APPS)[number]
