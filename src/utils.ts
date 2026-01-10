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
    let name = new TextDecoder().decode(header.subarray(0, nameEnd))
    
    // Check for USTAR format and handle prefix (bytes 345-499)
    const magic = new TextDecoder().decode(header.subarray(257, 262))
    if (magic === 'ustar') {
      let prefixEnd = 345
      while (prefixEnd < 500 && header[prefixEnd] !== 0) prefixEnd++
      if (prefixEnd > 345) {
        const prefix = new TextDecoder().decode(header.subarray(345, prefixEnd))
        name = prefix + '/' + name
      }
    }
    
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
    
    // Type 0 or null = regular file, skip directories (5) and pax headers (x, g)
    if ((typeFlag === 0 || typeFlag === 48) && size > 0 && name) {
      // Skip macOS AppleDouble files (._*)
      if (!name.includes('/._') && !name.startsWith('._')) {
        const fileData = data.slice(offset, offset + size)  // Use slice, not subarray
        files.set(name, fileData)
      }
    }
    
    // Move to next header (512-byte aligned)
    offset += Math.ceil(size / 512) * 512
  }
  
  console.log(`Parsed ${files.size} files from tar`)
  // Debug: check Init.olean size
  for (const [name, data] of files) {
    if (name.endsWith('Init.olean') && !name.includes('/')) {
      console.log(`Found root Init.olean: ${name}, size: ${data.byteLength}`)
    }
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

