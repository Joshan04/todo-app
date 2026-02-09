const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

// Helper function to draw a checkmark
function drawCheckmark(png, size) {
    const data = png.data;
    const width = png.width;

    // Background color #0b0f19
    const bgR = 11, bgG = 15, bgB = 25;

    // Fill background
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (width * y + x) << 2;
            data[idx] = bgR;
            data[idx + 1] = bgG;
            data[idx + 2] = bgB;
            data[idx + 3] = 255; // Alpha
        }
    }

    // Draw white checkmark
    const lineWidth = Math.floor(size / 12);
    const scale = size / 192; // Scale based on 192 as reference

    // Checkmark coordinates (scaled)
    const x1 = Math.floor(50 * scale);
    const y1 = Math.floor(96 * scale);
    const x2 = Math.floor(80 * scale);
    const y2 = Math.floor(126 * scale);
    const x3 = Math.floor(142 * scale);
    const y3 = Math.floor(64 * scale);

    // Draw line from (x1,y1) to (x2,y2)
    drawLine(data, width, x1, y1, x2, y2, lineWidth, 255, 255, 255);

    // Draw line from (x2,y2) to (x3,y3)
    drawLine(data, width, x2, y2, x3, y3, lineWidth, 255, 255, 255);
}

// Helper function to draw a thick line
function drawLine(data, width, x1, y1, x2, y2, thickness, r, g, b) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        // Draw thick point
        for (let ty = -thickness; ty <= thickness; ty++) {
            for (let tx = -thickness; tx <= thickness; tx++) {
                const px = x1 + tx;
                const py = y1 + ty;
                if (px >= 0 && py >= 0 && px < width && py < width) {
                    const idx = (width * py + px) << 2;
                    data[idx] = r;
                    data[idx + 1] = g;
                    data[idx + 2] = b;
                    data[idx + 3] = 255;
                }
            }
        }

        if (x1 === x2 && y1 === y2) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
    }
}

// Generate icon of specified size
function generateIcon(size, outputPath) {
    const png = new PNG({
        width: size,
        height: size,
        filterType: -1
    });

    drawCheckmark(png, size);

    const buffer = PNG.sync.write(png);
    fs.writeFileSync(outputPath, buffer);

    console.log(`✅ Created ${path.basename(outputPath)} (${size}x${size}) - ${buffer.length} bytes`);
    return buffer.length;
}

// Main execution
const iconsDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 Generating Taskflow PWA Icons...\n');

const size192 = generateIcon(192, path.join(iconsDir, 'icon-192.png'));
const size512 = generateIcon(512, path.join(iconsDir, 'icon-512.png'));

console.log('\n📊 Verification:');
console.log(`   icon-192.png: ${size192} bytes`);
console.log(`   icon-512.png: ${size512} bytes`);
console.log(`   Sizes different: ${size192 !== size512 ? '✅ YES' : '❌ NO'}`);

// Verify dimensions
const verify192 = PNG.sync.read(fs.readFileSync(path.join(iconsDir, 'icon-192.png')));
const verify512 = PNG.sync.read(fs.readFileSync(path.join(iconsDir, 'icon-512.png')));

console.log('\n🔍 Dimension Check:');
console.log(`   icon-192.png: ${verify192.width}x${verify192.height} ${verify192.width === 192 && verify192.height === 192 ? '✅' : '❌'}`);
console.log(`   icon-512.png: ${verify512.width}x${verify512.height} ${verify512.width === 512 && verify512.height === 512 ? '✅' : '❌'}`);

console.log('\n✨ Done! Icons are ready for PWA installation.');
