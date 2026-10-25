/* Hand-drawn 24px icons from the demo — one stroke weight, one grid, no emojis. */

const P = {
  back:   '<path d="M15 18l-6-6 6-6"/>',
  chev:   '<path d="M9 18l6-6-6-6"/>',
  mail:   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.6 7.5l7.3 5.2a2 2 0 0 0 2.2 0l7.3-5.2"/>',
  inbox:  '<path d="M3 13.5V7a2.5 2.5 0 0 1 2.5-2.5h13A2.5 2.5 0 0 1 21 7v6.5"/><path d="M3 13.5h4.6l1.4 2.6h6l1.4-2.6H21v3.9a2.6 2.6 0 0 1-2.6 2.6H5.6A2.6 2.6 0 0 1 3 17.4z"/>',
  cap:    '<path d="M2.5 8.5L12 4l9.5 4.5L12 13z"/><path d="M6.5 10.8V16c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-5.2"/><path d="M21 9v5"/>',
  board:  '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v3M8.5 20h7M8 9.5l2.2 2.2L16 8"/>',
  shield: '<path d="M12 3l7.5 3v5.4c0 4.3-3 8.1-7.5 9.6-4.5-1.5-7.5-5.3-7.5-9.6V6z"/><path d="M9.3 12l1.9 1.9 3.6-3.8"/>',
  people: '<circle cx="9" cy="8.5" r="3.3"/><path d="M2.8 19.2c.5-3.1 3.1-5 6.2-5s5.7 1.9 6.2 5"/><path d="M16.2 6.2a3.2 3.2 0 0 1 0 6.1"/><path d="M17.6 14.6c2 .6 3.4 2.2 3.7 4.6"/>',
  user:   '<circle cx="12" cy="8.4" r="3.7"/><path d="M4.6 20c.6-3.7 3.7-6 7.4-6s6.8 2.3 7.4 6"/>',
  cal:    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  calChk: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  clip:   '<path d="M16 4h1.5A2.5 2.5 0 0 1 20 6.5v12A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5v-12A2.5 2.5 0 0 1 6.5 4H8"/><rect x="8" y="2.5" width="8" height="3.6" rx="1.2"/><path d="M8.5 13l1.8 1.8 3.5-3.6"/>',
  wallet: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a2 2 0 0 1 2 2v1"/><rect x="3" y="8.5" width="18" height="11" rx="2.5"/><path d="M16.5 14h1.2"/>',
  doc:    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  upload: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 18v-6M9.5 14.5L12 12l2.5 2.5"/>',
  plus:   '<path d="M12 5v14M5 12h14"/>',
  check:  '<path d="M4 12.5l5 5L20 6.5"/>',
  star:   '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  x:      '<path d="M18 6L6 18M6 6l12 12"/>',
  alert:  '<path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 17h.01"/>',
  clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 1.9"/>',
  megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h3l6 4V5L7 9H4a1 1 0 0 0-1 1z"/><path d="M17 8.5a5 5 0 0 1 0 7M7 15l1.2 4.2a1 1 0 0 0 1 .8H11"/>',
  key:    '<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M17 6l2.5 2.5M14.5 8.5l2 2"/>',
  info:   '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
  sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5"/>',
  down:   '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7.5 10.5L12 15l4.5-4.5M12 15V3"/>',
  pin:    '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
  out:    '<path d="M15 4h2.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H15"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  home:   '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path d="M9.5 20.5V14h5v6.5"/>',
  book:   '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z"/>',
  bell:   '<path d="M6 9a6 6 0 1 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15.5 6 9z"/><path d="M10.2 20.5a2 2 0 0 0 3.6 0"/>',
  share:  '<path d="M12 3.5v11"/><path d="M8 7.5l4-4 4 4"/><path d="M6.5 11H6a1.5 1.5 0 0 0-1.5 1.5v6.5A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-6.5A1.5 1.5 0 0 0 18 11h-.5"/>',
  addsq:  '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8.5v7M8.5 12h7"/>',
  attach: '<path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/>',
  qr:     '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/><path d="M14 14h2.5v2.5M20.5 14v.01M14 20.5h.01M17.5 17.5h3v3M20.5 20.5h.01"/>',
  phone:  '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
} as const

export type IconName = keyof typeof P

export function Icon({ name, size = 22, stroke = 1.7 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: P[name] }} />
  )
}
