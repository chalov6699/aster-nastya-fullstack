export function hasValidImageSignature(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') {
    const sig = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
    return sig.every((value, index) => buffer[index] === value);
  }
  if (mimeType === 'image/webp') {
    return buffer.subarray(0,4).toString('ascii') === 'RIFF' && buffer.subarray(8,12).toString('ascii') === 'WEBP';
  }
  return false;
}
