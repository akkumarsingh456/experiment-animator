import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/api/med-easy-pdf')({server:{handlers:{
 GET:async({request})=>{const {streamManualPdf}=await import('@/lib/manual-pdf-stream.server');return streamManualPdf(request);},
 HEAD:async({request})=>{const {streamManualPdf}=await import('@/lib/manual-pdf-stream.server');return streamManualPdf(request);},
}}});
