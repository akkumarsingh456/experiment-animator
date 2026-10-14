type SourceVideo={channelId?:string;source:string};

/** Identity is based on checked YouTube channel IDs, never a title claiming "official". */
export function experimentVideoSource(video:SourceVideo) {
  if(video.channelId==='UCT0s92hGjqLX6p7qY9BBrSA')return {
    priority:0,institution:true,label:'NCERT · government institution',
    detail:'Published by the NCERT Official channel linked by CIET, a constituent unit of NCERT.',
    evidence:'https://www.ciet.ncert.gov.in/activity/doce',
  };
  if(video.channelId==='UCBsy7f40NzuWOhP3YdyyBjA')return video.source==='MeitY OLabs'?{
    priority:1,institution:true,label:'OLabs · government-funded project',
    detail:'Published by Amrita CREATE for OLabs, developed with C-DAC Mumbai and funded by MeitY / Ministry of Education. This is an institutional project channel, not a government-owned YouTube channel.',
    evidence:'https://www.amrita.edu/project/olabs/',
  }:{
    priority:2,institution:true,label:'University channel · Amrita CREATE',
    detail:'Published by Amrita CREATE, the university centre behind OLabs. This individual demonstration is labelled as university content.',
    evidence:'https://www.amrita.edu/project/online-labs/',
  };
  return {priority:3,institution:false,label:'Supplementary educational source',
    detail:'Additional teaching reference. Government affiliation, laboratory-officer status and individual professional credentials have not been established for this video.',evidence:undefined};
}
