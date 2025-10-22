'use client';

interface Props {
  onClose: () => void;
}

export default function IMEIHelper({ onClose }: Props) {
  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Comment vérifier le déverrouillage ?</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="alert alert-info">
              <strong>Bon à savoir:</strong> Un téléphone déverrouillé peut fonctionner avec n'importe quelle carte SIM d'opérateur.
            </div>

            <h6 className="fw-bold mt-4">Pour iPhone:</h6>
            <ol>
              <li>Allez dans <strong>Réglages</strong> &gt; <strong>Général</strong> &gt; <strong>Informations</strong></li>
              <li>Faites défiler jusqu'à <strong>Verrouillage de l'opérateur</strong></li>
              <li>Si vous voyez "Aucune restriction SIM", votre téléphone est déverrouillé</li>
            </ol>

            <h6 className="fw-bold mt-4">Pour Android:</h6>
            <ol>
              <li>Allez dans <strong>Paramètres</strong> &gt; <strong>À propos du téléphone</strong></li>
              <li>Recherchez <strong>État de la carte SIM</strong></li>
              <li>Si "Verrouillage réseau" indique "Non verrouillé", votre téléphone est déverrouillé</li>
            </ol>

            <div className="alert alert-warning mt-4">
              <strong>Note:</strong> Si votre téléphone est encore verrouillé à Orange et que vous avez fini votre engagement, vous pouvez demander le déverrouillage gratuitement depuis votre espace client.
            </div>

            <h6 className="fw-bold mt-4">Trouver votre IMEI (si nécessaire):</h6>
            <p>Composez <code>*#06#</code> sur votre téléphone pour afficher votre numéro IMEI (15 chiffres).</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              J'ai compris
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
