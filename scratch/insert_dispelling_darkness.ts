import prisma from '../src/lib/prisma';

async function main() {
  const printEditions = await prisma.printEdition.findMany();
  const vol1 = printEditions.find(p => p.title.includes('Volume 1') || p.title.includes('Vol. 1') || p.title.includes('VOL. 1'));
  
  if (!vol1) {
    console.log('Could not find Volume 1 print edition.');
    return;
  }
  
  // Find author "Ian Farris" or create him
  let author = await prisma.user.findFirst({
    where: { name: { contains: 'Ian Farris' } }
  });
  
  if (!author) {
    // If we can't find Ian, use the first ADMIN or EDITOR just to get it in, and set customAuthor
    author = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  }

  const content = `
<p><strong>Ian is a recent graduate from Brigham Young University in Political Science. He is an avid watcher of BYU sports, even when his blood pressure spikes through the roof as a result.</strong></p>

<p>After Christ’s triumph over death, monotheism became synonymous with religion in the Western world. Through this religious transformation, the idea of worshipping stone idols is enigmatic, so far beyond our conception that it’s completely laughable.</p>

<p>However, if human nature does not truly change, as the Fall of Adam teaches, then it is abundantly clear that idols, by their very definition, must still permeate beneath our modern society. Perhaps to answer this question, namely the role of idols in personal and public life, the answer is to look backward and parse the motivations of characters who have fallen victim to the clutches of idolatry.</p>

<p>The Old Testament provides ample sourcing for religious leaders who struggled with idolatry and pride. Often, a pattern emerges regarding the Israelite kings in their devotion to God. First, a prophet assures that they will ascend to the throne. Then, they ascend, and over time, the pride cycle overtakes the vast majority of them, and it is through this lens of idolatry that the authors of the Old Testament judge the character of their kings. The prevalence of idolatry is why David, despite his sins of lust and murder, is exalted among all the kings, as he never faltered in his devotion to Yahweh (Jehovah).</p>

<p>However, his son Solomon began to fall into the trap of idolatrous tyranny by permitting his foreign wives to worship non-Israelite gods. He levied grievous taxes on the people, fermenting discontent among them, and upon his death, the people appealed to his son, Rehoboam, to relieve them of the heavy yoke. Rehoboam foolishly listened to his young advisors, who encouraged him to increase the grievous burdens on the people who would become the Northern Kingdom. To our modern sensibilities, it is challenging to fathom a society where the head of State is also the political and spiritual leader. However, in the annals of history, religion and political power were inseparable, leading to the question: How does one hold to the truth in light of wicked state and religious leaders?</p>

<p>Jeroboam, portrayed as the antagonist in the 1 Kings narrative, breaks away from Rehoboam’s grievous burdens. Within this narrative, Rehoboam is far more "godly," but he is not good or without fault, which draws sympathy with Jeroboam’s plight. While 1 Kings 12:24 reads, "Thus saith the Lord, Ye shall not go up, nor fight against your brethren the children of Israel: return every man to his house; for this thing is from me," the text is unclear if Jeroboam is informed of Rehoboam’s desire not only to make peace but to maintain it.</p>

<p>Despite Rehobam’s understandable grievances, his behavior is also out of line despite Jeroboam’s understandable reluctance to make peace with the instigator. Here, however, the Lord’s words become difficult to ascertain as He permits the split, and His divine knowledge, which sees the end of the beginning, permits this idolatry to prevail in the Northern Kingdom. Jeroboam was of the lineage of Ephraim, which only complicates the Israelite birthright system of antiquity. Genesis 48 shows Jacob intentionally giving the birthright, upon which rights of kings and stewardship were bestowed, to Ephraim on Joseph’s behalf. However, in Genesis 49, Jacob then promises Judah that he will rule until "Shiloh" (Christ) comes. How can one reconcile these two seemingly contradictory points of view?</p>

<p>Indeed, Jeroboam says in verse 26, "Now shall the kingdom return to the house of David," despite his assurance from the prophet Ahijah in chapter 11. Therefore, despite God’s reassurances, Jeroboam fears the power of men and devises a political scheme to maintain his religious and political influence over his subjects. Here, we see the beginnings of an idolatrous heart, turning away from the one true God because of the fear of men.</p>

<p>In verse 28, Jeroboam finalizes his golden idols in Dan and Beth-el, the northern and southern borders of the kingdom, saying, "Whereupon the king took counsel, and made two calves of gold, and said unto them, It is too much for you to go up to Jerusalem: behold thy gods, O Israel, which brought thee up out of the land of Egypt."</p>

<p>An astute observer will notice that Jeroboam directly quotes Aaron’s words after the construction of the golden calf. However, the text indicates Jeroboam was unrighteous before the Lord in his construction of idols, just as Aaron was. Given the known Israelite traditions at the time, why would Jeroboam so brazenly defy God? Better yet, why would God ordain a king who immediately instituted idol worship for those under his dominion?</p>

<p>The Iron Age Levant was a polytheistic society dealing with the conflicting political and, thus, religious powers of their day. Credible research suggests that even the righteous Israelites were monolatrous, meaning they acknowledged the existence of other gods, such as El, Asherah, Ba'al, Yam, and Anat, but believed Yahweh to be supreme and reserved their worship solely for Him.</p>

<p>Whether the Israelites were correct on this theological point is irrelevant. Understanding the cultural context in which they made their mistakes is paramount so we in our modern age can avoid the conflation of the pantheon of Christianity, with Christ as Lord and God as our Father, with the one in which we are unwilling servants to our passions—the one the world would have us serve.</p>

<p>The monolatrous background provided a plausible argument to convince the Northern Kingdom to follow the new gods. It is this religious intermixing that provides a cautionary tale. For Jeroboam, his idols were literal gods of the neighboring nations, relying on clever wordplay to justify his insecurities and lack of faith in his God to protect his throne and people.</p>

<p>It is best to shed the foolish notion that neutrality is attainable or desirable. If Jeroboam had done nothing, would he have still found favor with God? Alternatively, perhaps, it was his insecurities and inability to trust in God fully that led him down the path to the bloody destruction of his bloodline as punishment for his sins.</p>

<p>As our souls are torn between godliness and idolatry, neutrality is an impossibility, and that requires us to choose sides and prudently champion morality in public life; for a nation is not built upon private virtue alone but instead of virtuous people coming together for a common purpose.</p>

<p>Instead, what many in our liberal culture propose is a sense of indifference, suggesting that public life does not matter for one’s virtue or that one’s virtue is inconsequential to politics. This nonsensical idea cultivates an air of moral insecurity, unable to differentiate between good and evil. The very concept of godliness becomes obscured and murky, unable to stand out among the cacophony of voices from the world.</p>

<p>The tides of life continue to pull, requiring us to swim towards the island of hope. Indifference causes us to tread water as we are slowly pulled into the dark abyss of sin, where the siren call hinders our ability to listen to the still, small voice. However, idolatry, just like the siren’s call, is little more than a tantalizing illusion that leaves one emptier than when they found it. At least the sailor’s demise is merely temporal rather than spiritual.</p>

<p>Therefore, the choice becomes simple, at least in terms of substance, when we toss the supposed liberal virtue of neutrality. Instead, the choice becomes choosing between the light of virtue and godliness or rejecting it. What purpose does the nation serve if the citizens therein reject it? While American history is complex, there is no denying that, substantively, the Puritans of Massachusetts provided our nation’s animating cultural force. To become "a shining city on the hill," we must acknowledge that the light exists.</p>

<p>However, darkness is not idle, and even the brightest lights will cast a shadow in this mortal existence. Evil in the temporal sphere originates from Cain, the first Murderer and the first one to swear his allegiance to the Devil. Cain was a tiller of the ground, but Abel, his brother, was a keeper of the flocks. The restored account, found in the Book of Moses, signifies that the problem with Cain’s offering was not merely the lack of an animal– for fruit would have been the best of his labor. Instead, his offering was on command of the Devil, who was "pleased" at Cain’s response to God’s disapproval of his offering.</p>

<p>God’s response to his rebellious child holds true for us today. God invites Cain, saying in Moses 5:22-25:</p>

<blockquote><p>Why art thou wroth? Why is thy countenance fallen? If thou doest well, thou shalt be accepted. And if thou doest not well, sin lieth at the door, and Satan desireth to have thee; and except thou shalt hearken unto my commandments, I will deliver thee up, and it shall be unto thee according to his desire. And thou shalt rule over him; For from this time forth thou shalt be the father of his lies; thou shalt be called Perdition; for thou wast also before the world. And it shall be said in time to come—That these abominations were had from Cain; for he rejected the greater counsel which was had from God; and this is a cursing which I will put upon thee, except thou repent.</p></blockquote>

<p>The bargain between Cain and Satan was the first secret combination. Secret combinations can be defined as follows: an agreement, generally involving murder, for one’s personal gain at the cost of one’s soul. Secret combinations involve making a deal with the Devil, even if the Devil happens to be those around us who have fallen victim to the alluring temptation of darkness– where we believe we can hide our shame from God’s light.</p>

<p>Avoiding the temptation of the Devil is far easier said than done, as he is the craftiest manipulator we can ever face. To properly guard against his wiles, we must acknowledge his existence. Even to those who may reject the idea of a corporeal Satan, man’s fallen nature is a self-evident truth that cannot be ignored. As Baudelaire poignantly observed, "The greatest trick the Devil ever pulled was convincing the world he didn’t exist."</p>

<p>Apocryphal stories of Abraham, while not considered part of the scriptural canon, illustrate through narrative how even good intentions can lead us into deception. In some versions, the sacrifice of Isaac is a result of Abraham being deceived. The narrative revolves around Satan appearing as an angel of light, instructing Abraham to sacrifice Isaac. Confused but willing, Abraham seeks to retire to his tent and ask God through prayer for confirmation. However, on the way, he is interrupted by Satan, this time announcing his identity, chiding Abraham for believing such a foolish idea. "After all," said Satan. "How could God revoke his blessing of posterity by demanding the sacrifice of your only son?"</p>

<p>However, Abraham, being a righteous man, takes it as a sign that God did command him to sacrifice his son. If Satan is telling him that God is a fool, then a moral system based around "avoid evil" would dictate that Abraham is right in his initial assumption. Consequently, Abraham is deceived despite his righteous heart. He goes up to sacrifice Isaac, who also demonstrates tremendous faith, before God intervenes with the ram in the similitude of His Only Begotten.</p>

<p>To the theologians among us, it is easy to see the potential problems that arise from such a story, namely about using our presentist lens to judge the commandments of God to one of His holy prophets. However, the lesson remains even if we assume the story is false or at least little more than an interesting retelling of a biblical story. It is not enough to base ourselves against evil; when we do so, we risk relying on our adversary for moral guidance, creating an inverted morality of modernity. Instead of seeking to do good, we strive to avoid evil. While avoiding evil is half of the first tenet of the natural law, a morality based on negative principles is not self-sufficient.</p>

<p>So, too, has our post-modern conception of moral truth been corrupted, just as Satan’s silvery tongue deceived Abraham. Liberal modernity has banished God from the public square, allowing the Devil to run roughshod over us. Liberalism claims to possess no moral judgment, falling into the fallacy of neutrality that animates our public culture today. This axiom leads us to the exaltation of tolerance above all virtues because who can honestly and with certainty say what is right or wrong? Those who stand for nothing will find themselves swept away with the sands of time, marred as the spirit of the age fades into the annals of Ozymandias.</p>

<p>Instead, at the root of liberalism lies distancing ourselves from evils such as racism, sexism, and bigotry. Of course, modern-day prophets have urged us to abandon all prejudice and share the Gospel with the world, but even these principles become meaningless without foundation. As we have found, a moral system based upon simply fleeing from darkness will find itself bumbling around in the very force it seeks to flee.</p>

<p>Since World War Two, the modern era has found its incarnation of absolute evil in the person of Adolf Hitler. In the eighty years since the conclusion of the horrible conflict, accusations of impropriety nearly always revolve around Hitler or Hitler’s party. Anyone with a memory longer than thirty years can recall times when Reagan was Hitler, then Bush was Hitler, and then Trump was Hitler. This mythos of evil has prevented any discussion of the good, and our identity as a shining City on the Hill has become cloaked in an illusive, dark glass.</p>

<p>While there is undoubtedly a case to be made about secret cabalist behavior in the backrooms of the elites, their existence matters little regarding shining our light. The darkness of their combinations, should they exist, can only be dissipated by illumination. However, because of the insidious nature of a negative morality, we often find ourselves being sucked in, slowly drowning in the sea of which we navigate our society. In doing so, we unwittingly open ourselves to making these political bargains or secret combinations.</p>

<p>Nevertheless, even though the liberalism in which we swim is filled with the ravenous sharks of darkness, to withdraw from public life in pursuit of some post-political utopia is a fool’s endeavor. The option is tantalizing to many, especially if we view politics through the lens that society is genuinely irredeemable and the Gadianton robbers have triumphed. Perhaps, if this axiom is true, the Church should gather into safe enclaves and await the Second Coming.</p>

<p>On this point, scripture teaches that withdrawal is not the Lord’s expectation. Following Christ’s birth, Nephite society began to degrade, resulting in the people dividing themselves into factions. The Gadianton Robbers, the default name for Nephite dissidents who participated in secret combinations, are one of these factions. In 3 Nephi 3:7, Mormon relays a letter of recruitment sent out by the leader of the Robbers: "Or in other words, yield yourselves up unto us, and unite with us and become acquainted with our secret works, and become our brethren that ye may be like unto us—not our slaves, but our brethren and partners of all our substance."</p>

<p>Verse 9 continues with Giddianhi’s appeal: "And behold, I am Giddianhi; and I am the governor of this the secret society of Gadianton; which society and the works thereof I know to be good; and they are of ancient date and they have been handed down unto us."</p>

<p>However, the Nephites rejected Giddianhi’s proposal and armed themselves for battle. The ensuing battles were bloody, but the Nephites, standing for something, turned the tide by letting their light shine among the darkness of their enemies.</p>

<p>While prudence remains a political virtue, the conflation between docility and peacemaking risks members of the Church from falling onto a similar path, opening themselves up to complicity in the crimes of the Gadianton Robbers. In a world of two mutually exclusive ideas, docility is no longer an acceptable plea, and the liberating light must burn through the thickets that darken the eyes of the righteous. However, the ancient nature of these combinations is appealing to those who exalt tradition in the abstract above all normative concerns. To whom were the Gadianton Robbers appealing, and what similarities can be found elsewhere?</p>

<p>A record of the Jaredites, an ancient people who preceded them on the American continent, proliferated among Nephite culture. Their record, known to us as the Book of Ether, was delivered to King Mosiah II after its discovery during the period of the split Nephite kingdoms. It is from the Jaredites that the Gadianton Robbers claim their supposed authority.</p>

<p>The prophets foresaw the threat, though their vindication was little more than a bitter cup. Alma the Younger, in counseling his son Helaman, says this about the Jaredite record in Alma 37:</p>

<blockquote><p>Therefore ye shall keep these secret plans of their oaths and their covenants from this people, and only their wickedness and their murders and their abominations shall ye make known unto them; and ye shall teach them to abhor such wickedness and abominations and murders; and ye shall also teach them that these people were destroyed on account of their wickedness and abominations and their murders.</p></blockquote>

<p>Unfortunately, the Nephites were unsuccessful in preventing the secrets of the Jaredite wickedness from spreading among the people. It would be wise to discern the secrets now brought to light. From what exactly were the Gadianton Robbers deriving their authority? While we do not have the full text due to Moroni’s abridgment, the best example is found in Ether 8. For context, the Jaredite civilization has found the promised land and is growing in size and power. During the political struggle, the king, whom we know as Jared, loses his kingdom to a rival faction and finds himself in the depths of despair over his possessions. Jared’s daughters, upon seeing their father’s grief, propose the following plan: "And now, therefore, let my father send for Akish, the son of Kimnor; and behold, I am fair, and I will dance before him, and I will please him, that he will desire me to wife; wherefore if he shall desire of thee that ye shall give unto him me to wife, then shall ye say: I will give her if ye will bring unto me the head of my father, the king."</p>

<p>The remainder of the chapter consists of Moroni editorializing, saying, in Ether 8:23, "It is wisdom in God that these things should be shown unto you, that thereby ye may repent of your sins, and suffer not that these murderous combinations shall get above you, which are built up to get power and gain…"</p>

<p>Stories like these exist throughout the standard works, most famously the tale of Herod in Mark 6. Common motifs lie between the two stories, although Herod acts as Akish rather than Jared in this case. The biblical tale follows the same plot, with Herod being seduced by the daughter of Herodias, who, after gaining his oath, forces him to deliver the head of John the Baptist.</p>

<p>While the term "secret combinations" is often accompanied by murder in scripture, many of the themes persist in the modern era. While murder is not a severe temptation for most, Moroni also indicates that these combinations exist for the purpose "to get power and gain" (Ether 8:23). We open ourselves up to risk any time we enter into an agreement with another individual for this purpose. While the line between righteous, godly ambition and the dark secrets of the combinations can be a fine one at times, it is all the more reason to ensure that we are standing on positive principles of truth and light.</p>

<p>Instead, we must follow the council of Christ in Matthew 10:16 and be "wise as serpents and innocent as doves" as we attempt to navigate the treacherous waterways of mortality. Only through our reason, bestowed upon us as God’s pinnacle creation, can we discern the truth in any measure. However, for our reason to be effective, there must be a light from above illuminating the way forward, or else we find ourselves simply sprawling around in the mud like animals.</p>

<p>Can one create light without the Light-Giver? It is a question that secular liberalism has attempted to answer. While the political genius of liberalism is evident, history testifies that without supplemental light, the natural entropy toward negative morality is an unavoidable problem. We have the blind men of the age speaking to the deaf men of the past, and neither shall find themselves successful without the healing light, a light that we must be willing to stand for.</p>

<p>The foolish spirit seeks to build a mountain from clay, though his senses hide the anchor from which he fell. All light can find itself a heavenly source, and the lens through which we can interpret it darkens as we pollute the connection with our idols of the age. Mankind has, and always will, struggle with the false comfort of the idols that shroud us in darkness, but in so doing, our guiding light, which prevents us from slipping into destructive combinations, becomes indecipherable as we hide ourselves in the thicket.</p>

<p>The axiom of liberalism seeks us to build our mountains out of clay. Instead, we can use our divine gift of reason to make ourselves mountains of celestial glory, the only condition of which is following the commandments bestowed by the one who paid the ransom for our sins with His blood. Like the Israelites, we may be forced to withstand idolatrous pressures from wicked leaders, as Jeroboam did for his people, but as we cling to the divine anchor of God, the Spirit will work upon His people to bring about a great nation. We can find the courage to build our foundation on God’s anchor through faith.</p>

<p>As children of God, His divine love is etched into our hearts. We will stumble and fall, struggling from our foundation. However, despite the seemingly hopeless outlook, we can find solace by shining our light upon the world’s wickedness. The torches of many institutions are fading, allowing themselves to disappear into the shadows of modernity. The celestial anchor is always there for those who allow the Spirit to translate the language of the Divine into a symphonic chorus.</p>

<p>It is only through prudence that we can expect political change to happen. We face threats on all sides as the darkness encroaches upon us, but without prudence, we will find ourselves lost in the ultimate pursuit of perfection while forgetting to live in reality. Means and ends are intrinsically linked, so even if our ends are just, we must be reasonable and wise as we pursue them, but ceding the moral ground to the relativists is an unreasonable and unworkable proposition.</p>

<p>Political action and change are far more effective when wielded with a scalpel rather than a club. Therefore, we must use our divinely appointed gift of reason to ascertain the positive truths of both heaven and earth. We are flawed, and we will stumble countless times in our pursuit of goodness. Yet, as those who stand for something become bastions, the truth seekers who know only how to flee from darkness shall find the beacons necessary to dispel it.</p>
  `;

  await prisma.post.create({
    data: {
      title: 'Dispelling Darkness in a Blind Age',
      slug: 'dispelling-darkness-in-a-blind-age',
      content: content,
      category: 'opinion',
      state: 'PUBLISHED',
      authorId: author!.id,
      customAuthor: 'Ian Farris',
      printEditionId: vol1.id,
      printEditionOrder: 11,
      seoTitle: 'Dispelling Darkness in a Blind Age',
      seoDescription: 'A look at the nature of idols and secret combinations in our modern age.',
      seoKeywords: 'idolatry, secret combinations, liberal neutrality, Book of Mormon, Old Testament, Ian Farris',
      publishedAt: new Date()
    }
  });

  console.log('Successfully inserted "Dispelling Darkness" as Print Order #11!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
