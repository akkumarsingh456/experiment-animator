import {readFileSync,writeFileSync} from 'node:fs';
const html=readFileSync('outputs/cbse-pyq-source.html','utf8');
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const papers=[];
for(const section of html.matchAll(/<h2\b[^>]*>(Question Paper[^<]*)<\/h2>([\s\S]*?)<\/table>/gi)){
 const heading=clean(section[1]),year=Number(heading.match(/20\d{2}/)?.[0]),klass=/Class XII\b/i.test(heading)?'12':/Class X\b/i.test(heading)?'10':'';
 if(!klass||!year)continue;
 for(const row of section[2].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
  const href=row[1].match(/href\s*=\s*["']([^"']+)["']/i)?.[1];if(!cells.length||!href)continue;
  const url=new URL(href.replace(/&amp;/g,'&'),'https://www.cbse.gov.in/cbsenew/question-paper.html');
  if(url.hostname!=='www.cbse.gov.in'||url.protocol!=='https:')continue;
  papers.push({klass,year,exam:/Compartment/i.test(heading)?'Compartment':/Second Board/i.test(heading)?'Second board':'Main',subject:clean(cells[0]),url:url.href,format:/\.zip$/i.test(url.pathname)?'ZIP':'PDF'});
 }
}
if(papers.length<100)throw Error('Official archive layout needs review');
const unique=[...new Map(papers.map(paper=>[JSON.stringify([paper.klass,paper.year,paper.url]),paper])).values()];
writeFileSync('src/lib/cbse-pyq-catalogue.json',JSON.stringify({source:'https://www.cbse.gov.in/cbsenew/question-paper.html',checkedAt:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),papers:unique},null,2)+'\n');
console.log(unique.length+' official paper links indexed');
