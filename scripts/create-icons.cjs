// Creates minimal valid PNG icons for the extension
const { writeFileSync } = require('fs');

// Minimal 1x1 blue PNG, then we'll just use it for all sizes
// In production you'd use proper icons - these are dev placeholders
function createMinimalPNG(size) {
  // Create a simple BMP-like structure embedded in PNG
  // This creates a solid blue square PNG
  const { createCanvas } = (() => {
    try { return require('canvas'); } catch { return { createCanvas: null }; }
  })();

  // Fallback: create a minimal valid PNG manually
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(size, 8); // width
  ihdr.writeUInt32BE(size, 12); // height
  ihdr.writeUInt8(8, 16); // bit depth
  ihdr.writeUInt8(2, 17); // color type (RGB)
  ihdr.writeUInt8(0, 18); // compression
  ihdr.writeUInt8(0, 19); // filter
  ihdr.writeUInt8(0, 20); // interlace
  
  const { crc32 } = (() => {
    // Simple CRC32 implementation
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    return {
      crc32: (buf, start, len) => {
        let crc = 0xFFFFFFFF;
        for (let i = start; i < start + len; i++) {
          crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
      }
    };
  })();
  
  const ihdrCrc = crc32(ihdr, 4, 17);
  ihdr.writeUInt32BE(ihdrCrc, 21);
  
  // IDAT chunk - raw image data (blue pixels)
  const rawRow = Buffer.alloc(1 + size * 3); // filter byte + RGB
  rawRow[0] = 0; // no filter
  for (let x = 0; x < size; x++) {
    rawRow[1 + x * 3] = 0x19;     // R
    rawRow[1 + x * 3 + 1] = 0x76; // G
    rawRow[1 + x * 3 + 2] = 0xD2; // B
  }
  
  // Build raw data for all rows
  const rawData = Buffer.concat(Array(size).fill(rawRow));
  
  // Compress with zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);
  
  const idatLen = compressed.length;
  const idat = Buffer.alloc(12 + idatLen);
  idat.writeUInt32BE(idatLen, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = crc32(idat, 4, 4 + idatLen);
  idat.writeUInt32BE(idatCrc, 8 + idatLen);
  
  // IEND chunk
  const iend = Buffer.from([0,0,0,0, 73,69,78,68, 0xAE,0x42,0x60,0x82]);
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

for (const size of [16, 48, 128]) {
  const png = createMinimalPNG(size);
  writeFileSync(`public/icons/icon${size}.png`, png);
  console.log(`Created icon${size}.png (${png.length} bytes)`);
}
