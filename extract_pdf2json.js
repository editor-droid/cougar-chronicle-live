const fs = require('fs');
const PDFParser = require("pdf2json");

const articles = [
  { title: "BYU Mission Alignment and Culture Wars", author: "Professor Ralph Hancock" },
  { title: "Embracing Our Particularity – Against the ‘Civility Trap’", author: "Jacob Christensen" },
  { title: "Authentic Propaganda", author: "Jax McKinney" },
  { title: "False Compromise: Liberalism’s Broken Understanding of Religious Freedom", author: "James Haymore" },
  { title: "Defying The Spiral Of Silence", author: "Greg Matsen" },
  { title: "The Plague of Systemic Mediocrity", author: "Logan R. Spears" },
  { title: "BYU’s Tempest-Tossed Men", author: "Kimball Call" },
  { title: "The Hollowness of ‘Free Choice’: Why Modern Womanhood Needs Tradition", author: "Mia Curry" },
  { title: "Reclaiming the Family: The Quiet Collapse We Can’t Ignore", author: "Reagan Sumrall" },
  { title: "Whose Land Is It Anyway?", author: "Emma Marcois Wilson" },
  { title: "AI: Virtue or Vice?", author: "Adam Blake" },
  { title: "Looking Back, Why I Stood Up", author: "Thomas Stevenson" },
  { title: "Are Latter-day Saints Really Pro-Life?", author: "Luke Hanson" },
  { title: "The Tragedy of The Rings of Power", author: "Joseph Addington" },
  { title: "Review of Conservatism: A Rediscovery", author: "Jacob Fisher" },
  { title: "Where Will We Go?", author: "Jacob Hansen" },
  { title: "Testimonies", author: "Various" }
];

let pdfParser = new PDFParser(this, 1);

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", async pdfData => {
  let text = pdfParser.getRawTextContent();
  
  // Clean up headers and footers
  text = text.replace(/VOL\. 1\s+THE COUGAR CHRONICLE\s+\d+/g, '');
  text = text.replace(/\d+\s+THE COUGAR CHRONICLE/g, '');
  
  let extracted = [];

  for (let i = 0; i < articles.length - 1; i++) {
    const currentArticle = articles[i];
    const nextArticle = articles[i+1];
    
    let startTitle = currentArticle.title.substring(0, 15);
    let endTitle = nextArticle.title.substring(0, 15);
    
    let startIndex = text.indexOf(startTitle);
    let endIndex = text.indexOf(endTitle, startIndex + 50);
    
    let content = "";
    if (startIndex !== -1 && endIndex !== -1) {
      content = text.substring(startIndex, endIndex);
    } else if (startIndex !== -1) {
      content = text.substring(startIndex);
    }
    
    // Clean up content
    content = content.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    content = `<p>${content}</p>`;

    const slug = currentArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    extracted.push({
      title: currentArticle.title,
      slug: slug,
      category: 'Opinion',
      content: content,
      customAuthor: currentArticle.author,
      isPremium: true,
      state: 'DRAFT'
    });
    console.log(`Extracted: ${currentArticle.title}`);
  }
  
  fs.writeFileSync('articles.json', JSON.stringify(extracted, null, 2));
  console.log("All articles extracted to articles.json!");
});

pdfParser.loadPDF("C:\\Users\\carte\\Downloads\\Final_with_covers.pdf");
