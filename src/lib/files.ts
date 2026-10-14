/* Phone photos are often 5–10 MB. Shrink them before uploading so they go up fast on
   mobile data and stay well under the 10 MB limit. PDFs are sent as they are. */

const MAX_SIDE = 2200

export async function prepareUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < 1_500_000) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file   // e.g. HEIC on a browser that can't read it; let the server decide
  }
}

export const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export const fileExt = (f: File) =>
  f.type === 'application/pdf' ? 'pdf' : f.type === 'image/png' ? 'png' : f.type === 'image/webp' ? 'webp' : 'jpg'

export const fSize = (bytes: number) =>
  bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`

/* Files that can go on a message: PDFs, photos, Office documents, plain text. */
const ATTACH: Record<string, string> = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  txt: 'text/plain', csv: 'text/csv',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}
export const ATTACH_ACCEPT = Object.keys(ATTACH).map(e => '.' + e).join(',') + ',image/*'

/* The file's real type, from the browser or (some phones leave it blank) from its name. */
export function attachType(f: File): { ext: string; type: string } | null {
  const ext = (f.name.split('.').pop() ?? '').toLowerCase()
  if (ext in ATTACH) return { ext, type: ATTACH[ext] }
  const byType = Object.entries(ATTACH).find(([, t]) => t === f.type)
  return byType ? { ext: byType[0], type: byType[1] } : null
}
