const fs = require('fs');
const pdf = require('pdf-parse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const articles = [
  { title: "BYU Mission Alignment and Culture Wars", author: "Professor Ralph Hancock" },
  { title: "Embracing Our Particularity – Against the ‘Civility Trap’", author: "Jacob Christensen" },
  { title: "Authentic Propaganda", author: "Jax McKinney" },
  { title: "False Compromise: Liberalism’s Broken Understanding of Religious Freedom", author: "James Haymore" },
  { title: "Defying The Spiral Of Silence", author: "Greg Matsen" },
  { title: "The Plague of Systemic Mediocrity", author: "Logan R. Spears" },
  { title: "BYU’s Tempest-Tossed Men And How To Rescue Them", author: "Kimball Call" },
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

async function extract() {
  const dataBuffer = fs.readFileSync('C:\\Users\\carte\\Downloads\\Final_with_covers.pdf');
  const data = await pdf(dataBuffer);
  
  let text = data.text;
  
  // Clean up headers and footers
  text = text.replace(/VOL\. 1 THE COUGAR CHRONICLE \d+/g, '');
  text = text.replace(/\d+ THE COUGAR CHRONICLE/g, '');
  
  // Find a default author ID to associate with the posts
  const defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    console.log("No user found in DB to associate posts with.");
    return;
  }

  // Create articles
  for (let i = 0; i < articles.length - 1; i++) {
    const currentArticle = articles[i];
    const nextArticle = articles[i+1];
    
    // We can use simple substring to get the text between titles
    // But since titles might be split across lines, we will just do a rough index search.
    // To make it robust, we'll just split using the Title strings (or parts of them).
    
    // For now, let's just insert empty drafts with the correct titles, authors, and premium flags.
    // This allows the admin to populate the text later or we can try extracting it.
    // Wait, the user specifically asked: "help me break it down by article so they can purchase individual articles..."
    
    // Let's extract the actual content using indexOf
    let startTitle = currentArticle.title.substring(0, 20); // First 20 chars
    let endTitle = nextArticle.title.substring(0, 20);
    
    // Because pdf-parse might format things weirdly, it's safer to just grab text between indices.
    let startIndex = text.indexOf(startTitle);
    let endIndex = text.indexOf(endTitle, startIndex + 100);
    
    let content = "";
    if (startIndex !== -1 && endIndex !== -1) {
      content = text.substring(startIndex, endIndex);
    } else if (startIndex !== -1) {
      content = text.substring(startIndex);
    }
    
    // Clean up content
    content = content.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    // Wrap in <p> tags for the rich text editor
    content = `<p>${content}</p>`;

    // Generate slug
    const slug = currentArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    await prisma.post.upsert({
      where: { slug: slug },
      update: {},
      create: {
        title: currentArticle.title,
        slug: slug,
        category: 'Opinion',
        content: content,
        customAuthor: currentArticle.author,
        isPremium: true,
        state: 'DRAFT',
        authorId: defaultUser.id,
      }
    });
    console.log(`Created: ${currentArticle.title}`);
  }
  
  console.log("All articles extracted and added to DB as Premium Drafts!");
}

extract().catch(console.error);
