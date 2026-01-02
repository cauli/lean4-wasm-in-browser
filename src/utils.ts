// Simple tar parser for extracting files
export function parseTar(data: Uint8Array): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>()
  let offset = 0
  
  while (offset < data.length - 512) {
    // Read header
    const header = data.subarray(offset, offset + 512)
    
    // Check for empty block (end of archive)
    if (header.every(b => b === 0)) break
    
    // Extract filename (first 100 bytes, null-terminated)
    let nameEnd = 0
    while (nameEnd < 100 && header[nameEnd] !== 0) nameEnd++
    const name = new TextDecoder().decode(header.subarray(0, nameEnd))
    
    // Extract file size (bytes 124-135, octal string)
    let sizeStr = ''
    for (let i = 124; i < 136; i++) {
      if (header[i] === 0 || header[i] === 32) break
      sizeStr += String.fromCharCode(header[i])
    }
    const size = parseInt(sizeStr, 8) || 0
    
    // Extract type flag (byte 156)
    const typeFlag = header[156]
    
    offset += 512
    
    // Type 0 or null = regular file
    if ((typeFlag === 0 || typeFlag === 48) && size > 0 && name) {
      const fileData = data.subarray(offset, offset + size)
      files.set(name, new Uint8Array(fileData))
    }
    
    // Move to next header (512-byte aligned)
    offset += Math.ceil(size / 512) * 512
  }
  
  return files
}

// Convert Map to array for postMessage transfer
export function filesToTransferable(files: Map<string, Uint8Array>): Array<{name: string, data: ArrayBuffer}> {
  const result: Array<{name: string, data: ArrayBuffer}> = []
  files.forEach((data, name) => {
    // Copy to a new ArrayBuffer to ensure it's transferable
    const copy = new ArrayBuffer(data.byteLength)
    new Uint8Array(copy).set(data)
    result.push({ name, data: copy })
  })
  return result
}

