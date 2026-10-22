import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DocumentViewerModal = ({ isOpen, onClose, document, applicationId }) => {
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let objectUrl = null;

    const fetchDocumentBlob = async () => {
      if (!isOpen || !document || !applicationId) return;

      setLoading(true);
      setError('');
      try {
        const docId = document._id || document.fileName;
        const res = await api.get(`/applications/${applicationId}/documents/${docId}`, {
          responseType: 'blob',
        });

        objectUrl = URL.createObjectURL(res.data);
        setFileUrl(objectUrl);
      } catch (err) {
        console.error('[Document Viewer Error]:', err);
        setError('Unable to load document. You may not have authorization to view this file.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentBlob();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, document, applicationId]);

  if (!isOpen || !document) return null;

  const isPdf = document.mimeType === 'application/pdf' || (document.fileName && document.fileName.endsWith('.pdf'));

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content shadow-lg border-0">
          <div className="modal-header bg-dark text-white py-2">
            <h6 className="modal-title d-flex align-items-center">
              <i className="bi bi-file-earmark-text text-warning me-2 fs-5"></i>
              <span>{document.documentType || 'Supporting Document'}: </span>
              <span className="text-muted ms-2 small">{document.originalName || document.fileName}</span>
            </h6>
            <div className="d-flex align-items-center gap-2">
              {fileUrl && (
                <a
                  href={fileUrl}
                  download={document.originalName || document.fileName}
                  className="btn btn-sm btn-outline-light"
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="bi bi-download me-1"></i> Download
                </a>
              )}
              <button type="button" className="btn-close btn-close-white" onClick={onClose} aria-label="Close"></button>
            </div>
          </div>

          <div className="modal-body p-0 text-center bg-light" style={{ minHeight: '65vh' }}>
            {loading && (
              <div className="d-flex justify-content-center align-items-center h-100 py-5">
                <div className="text-center">
                  <div className="spinner-border text-primary" role="status"></div>
                  <div className="mt-2 text-muted small">Loading document from secure storage...</div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 text-center">
                <div className="alert alert-danger d-inline-block">
                  <i className="bi bi-exclamation-octagon me-2"></i> {error}
                </div>
              </div>
            )}

            {!loading && !error && fileUrl && (
              <div className="w-100 h-100 p-2">
                {isPdf ? (
                  <iframe
                    src={fileUrl}
                    title="Document Preview"
                    className="w-100 border-0 rounded"
                    style={{ height: '70vh' }}
                  ></iframe>
                ) : (
                  <div className="p-3">
                    <img
                      src={fileUrl}
                      alt={document.originalName || 'Supporting document'}
                      className="img-fluid rounded shadow-sm"
                      style={{ maxHeight: '70vh', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer bg-light py-2">
            <div className="small text-muted me-auto">
              <i className="bi bi-shield-check text-success me-1"></i> Authorized Municipal Document Access Only
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;
