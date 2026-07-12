const sharp = require('sharp');
const path = require('path');

const inputImagePath = path.join(__dirname, '../public/logo-square.png');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    await sharp(inputImagePath)
      .resize(192, 192)
      .toFile(path.join(outputDir, 'icon-192x192.png'));
    console.log('Generated icon-192x192.png');

    await sharp(inputImagePath)
      .resize(512, 512)
      .toFile(path.join(outputDir, 'icon-512x512.png'));
    console.log('Generated icon-512x512.png');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
