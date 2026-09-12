const MAX_WIDTH = 1200
const MAX_HEIGHT = 1200
const JPEG_QUALITY = 0.7

const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

const resizeImage = (dataUrl) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => {
    let { width, height } = img
    if (width <= MAX_WIDTH && height <= MAX_HEIGHT) {
      resolve(dataUrl)
      return
    }
    if (width > height) {
      if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH }
    } else {
      if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT }
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width)
    canvas.height = Math.round(height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
  }
  img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
  img.src = dataUrl
})

export const readAndCompressImage = async (file) => {
  const dataUrl = await readFileAsDataURL(file)
  const compressed = await resizeImage(dataUrl)
  return compressed.split(',')[1]
}
