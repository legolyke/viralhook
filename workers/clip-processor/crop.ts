export function buildCropFilter(cropX: number): string {
  return `crop=ih*9/16:ih:(iw-ih*9/16)*${cropX}:0,scale=1080:1920`
}
