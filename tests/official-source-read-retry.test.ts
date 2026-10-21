import {it,expect,vi} from 'vitest';
import {readAttentionSource} from '@/lib/attention-source-read.server';
import {trustedChapterHtmlText} from '@/lib/trusted-chapter-source.server';
it('retries a temporary official source failure before reading its chapter text',async()=>{
 const source={url:'https://ncert.nic.in/textbook/recovery-retry-fixture.html',title:'Fixture',sourceClass:'10',provider:'NCERT'};
 const spy=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(new Response(`<main>${'<p>A readable source explanation for the selected chapter.</p>'.repeat(8)}</main>`));
 try{expect((await readAttentionSource(source))?.text).toContain('readable source explanation');expect(spy).toHaveBeenCalledTimes(2);}finally{spy.mockRestore();}
});
it('rejects unofficial source hosts before making a network request',async()=>{
 const spy=vi.spyOn(globalThis,'fetch');
 try{expect(await readAttentionSource({url:'https://untrusted.example/notes',title:'Not official',sourceClass:'10',provider:'Unknown'})).toBeNull();expect(spy).not.toHaveBeenCalled();}finally{spy.mockRestore();}
});
it('reads current unquoted NCERT mirror content wrappers',()=>{
 expect(trustedChapterHtmlText('<article class=content-wrapper><h2>Physical properties</h2><p>A source explanation.</p></article>')).toContain('A source explanation.');
});
