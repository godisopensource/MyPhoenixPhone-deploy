"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

 interface ShippingLabel {
   tracking_number: string;
   pdf_url: string;
   label_base64?: string;
   expiry_date: string;
   carrier: string;
 }

 export default function ShipPage() {
   const params = useParams();
   const leadId = Array.isArray(params?.id) ? (params.id as string[])[0] : ((params?.id as string) || '');
   const [label, setLabel] = useState<ShippingLabel | null>(null);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const generate = async () => {
     setLoading(true);
     setError(null);
     try {
       const apiUrl = typeof window !== 'undefined'
         ? (window.location.origin.includes('localhost') ? 'http://localhost:3003' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003')
         : 'http://localhost:3003';
       const res = await fetch(`${apiUrl}/handover/ship`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ lead_id: leadId }),
       });
       const txt = await res.text();
       if (!res.ok) throw new Error(txt || 'Échec de génération');
       const body = JSON.parse(txt || '{}');
       setLabel(body.data || null);
     } catch (e: any) {
       setError(e?.message || 'Erreur');
     } finally {
       setLoading(false);
     }
   };

   const downloadPdf = () => {
     if (!label?.label_base64) {
       alert('Aucune étiquette disponible');
       return;
     }
     try {
       // Créer un blob à partir du base64
       const byteCharacters = atob(label.label_base64);
       const byteNumbers = new Array(byteCharacters.length);
       for (let i = 0; i < byteCharacters.length; i++) {
         byteNumbers[i] = byteCharacters.charCodeAt(i);
       }
       const byteArray = new Uint8Array(byteNumbers);
       const blob = new Blob([byteArray], { type: 'application/pdf' });
       
       // Créer un lien de téléchargement
       const url = window.URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `colissimo-${label.tracking_number}.pdf`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       window.URL.revokeObjectURL(url);
     } catch (err) {
       console.error('Erreur lors du téléchargement:', err);
       alert('Erreur lors du téléchargement du PDF');
     }
   };

   return (
     <main className="container py-5 bg-white">
      <div className="text-center mb-4">
          <h1 className="h2">
            <i className="bi bi-truck me-2" aria-hidden="true"></i>
            Envoi gratuit
          </h1>
          <p className="text-muted">Recevez une étiquette Colissimo prépayée</p>
        </div>

       {error && <div className="alert alert-danger"><strong>Erreur :</strong> {error}</div>}

       {!label ? (
         <section className="mx-auto" style={{ maxWidth: 680 }}>
           <h2 className="h5">Comment procéder</h2>
           <ol className="list-group list-group-numbered">
             <li className="list-group-item">Générez votre étiquette</li>
             <li className="list-group-item">Imprimez l'étiquette (A4)</li>
             <li className="list-group-item">Fixez-la sur le colis</li>
             <li className="list-group-item">Déposez en point Colissimo</li>
           </ol>
           <div className="mt-3 d-grid">
             <button className="btn btn-primary btn-lg" onClick={generate} disabled={loading || !leadId}>
               {loading ? 'Génération…' : 'Générer mon étiquette'}
             </button>
           </div>
         </section>
       ) : (
         <section className="mx-auto" style={{ maxWidth: 680 }}>
           <div className="alert alert-success" role="alert">
             <i className="bi bi-check-circle-fill me-2" aria-hidden="true"></i>
             Étiquette générée avec succès
           </div>
           <p><strong>Numéro de suivi :</strong> <code className="text-warning" style={{ color: 'inherit' }}>{label.tracking_number}</code></p>
           <p className="text-muted small">Valide jusqu’au : {new Date(label.expiry_date).toLocaleDateString('fr-FR')}</p>

           {label.label_base64 && (
             <div className="border rounded p-2 mb-3 bg-white">
               <iframe
                 src={`data:application/pdf;base64,${label.label_base64}`}
                 style={{ width: '100%', height: 420, border: 'none' }}
                 title="Étiquette Colissimo"
               />
               <p className="text-muted small mt-2 mb-0">
                 Si l’aperçu ne s’affiche pas, utilisez « Télécharger PDF ».
               </p>
             </div>
           )}

           <div className="mt-3 d-flex gap-2">
             <button className="btn btn-primary" onClick={() => window.print()}>
               <i className="bi bi-printer me-2" aria-hidden="true"></i>
               Imprimer
             </button>
             <button className="btn btn-outline-secondary" onClick={downloadPdf}>
               <i className="bi bi-download me-2" aria-hidden="true"></i>
               Télécharger PDF
             </button>
           </div>
         </section>
       )}

       <div className="text-center mt-4">
         <Link href={`/lead/${leadId}`} className="btn btn-link">
           <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
           Retour
         </Link>
       </div>
     </main>
   );
 }
