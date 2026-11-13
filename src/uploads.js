import { api } from './api'

const MAX = 8 * 1024 * 1024

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',', 2)[1])
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/** Upload images for a prompt; returns their ids. The server checks the real file type. */
export async function uploadImages(files) {
  const ids = []
  for (const f of files) {
    if (f.size > MAX) throw new Error(`${f.name}: images up to 8 MB`)
    const res = await api('/tasks/uploads', { method: 'POST', body: { filename: f.name, data_b64: await toBase64(f) } })
    ids.push(res.id)
  }
  return ids
}

export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
