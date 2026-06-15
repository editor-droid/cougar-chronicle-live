import * as cheerio from 'cheerio';

async function main() {
  try {
    const res = await fetch('http://localhost:3001');
    const html = await res.text();
    console.log('Contains googletagmanager:', html.includes('googletagmanager'));
    console.log('Contains fbq:', html.includes('fbq'));
    console.log('Contains fb-pixel:', html.includes('fb-pixel'));
    console.log('Contains gtag-init:', html.includes('gtag-init'));
  } catch (err) {
    console.error('Error fetching page:', err);
  }
}

main();
