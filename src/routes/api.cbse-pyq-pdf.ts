import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/api/cbse-pyq-pdf')({server:{handlers:{GET:async({request})=>{const {serveOfficialPdf}=await import('@/lib/cbse-pyq-pdf.server');return serveOfficialPdf(request);}}}});
