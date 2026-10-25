import {it,expect,vi} from 'vitest';
import {retryNotesTransport} from '@/lib/notes-chat-transport';
it('does not retry configuration or quota failures',async()=>{
 for(const message of ['Gemini rejected the key','Gemini usage limit reached']){
  const call=vi.fn().mockRejectedValue(new Error(message));
  await expect(retryNotesTransport(call,()=>true)).rejects.toThrow(message);expect(call).toHaveBeenCalledTimes(1);
 }
});
it('stops retries after a topic is changed',async()=>{
 let active=true;const call=vi.fn().mockImplementation(()=>{active=false;throw new TypeError('Failed to fetch');});
 await expect(retryNotesTransport(call,()=>active)).rejects.toThrow('Failed to fetch');expect(call).toHaveBeenCalledTimes(1);
});
it('bounds repeated transport failures to two attempts',async()=>{
 const call=vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
 await expect(retryNotesTransport(call,()=>true)).rejects.toThrow('Failed to fetch');expect(call).toHaveBeenCalledTimes(2);
});
