import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="gov-footer pt-5 pb-3 mt-auto">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4 col-md-6" id="footer-about">
            <h6 className="text-white fw-bold mb-3 d-flex align-items-center">
              <i className="bi bi-bank2 text-warning me-2 fs-5"></i>
              MUNICIPAL CIVIL REGISTRATION
            </h6>

            <p className="small footer-text mb-3">
              Official e-Governance portal for digital registration, tracking,
              verification, and archive management of Birth and Death records in
              accordance with the Registration of Births and Deaths Act.
            </p>

            <div className="small footer-text">
              <i className="bi bi-shield-lock-fill text-warning me-1"></i>
              End-to-End Encrypted & 256-bit SSL Protected
            </div>
          </div>

          <div className="col-lg-2 col-md-6">
          <h6 className="text-white fw-bold mb-3">Services</h6>

          <ul className="list-unstyled small">
            <li className="mb-2">
              <Link className="footer-link" to="/citizen/apply/birth">
                Birth Certificate
              </Link>
            </li>
            <li className="mb-2">
              <Link className="footer-link" to="/citizen/apply/death">
                Death Certificate
              </Link>
            </li>
            <li className="mb-2">
              <Link className="footer-link" to="/verify">
                QR Verification
              </Link>
            </li>
            <li className="mb-2">
              <Link className="footer-link" to="/login">
                Officer Portal
              </Link>
            </li>
          </ul>
        </div>

          <div className="col-lg-3 col-md-6" id="footer-contact">
            <h6 className="text-white fw-bold mb-3 d-flex align-items-center">
              <i className="bi bi-headset text-warning me-2"></i>
              Contact Us &amp; Support
            </h6>
            <ul className="list-unstyled small citizen-support-text">
              <li className="mb-2">
                <i className="bi bi-telephone-fill text-warning me-2"></i>
                Toll Free: 1800-111-2026
              </li>
              <li className="mb-2">
                <i className="bi bi-envelope-fill text-warning me-2"></i>
                helpdesk@municipal.gov
              </li>
              <li className="mb-2">
                <i className="bi bi-clock-fill text-warning me-2"></i>
                Mon - Sat: 9:00 AM - 6:00 PM
              </li>
              <li>
                <i className="bi bi-geo-alt-fill text-warning me-2"></i>
                Civil Lines, Municipal Corporation HQ
              </li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h6 className="text-white fw-bold mb-3">Standards & SLA</h6>
            <p className="small footer-text mb-3">
              Citizen Charter guaranteed processing within <strong>48 Hours</strong> for complete applications with valid supporting records.
            </p>
            {/* <div className="p-2 bg-dark rounded small border border-secondary text-secondary">
              <i className="bi bi-award-fill text-warning me-1"></i> ISO 27001 Certified Municipal Digital Archive
            </div> */}
          </div>
        </div>

        <hr className="border-secondary my-4" />

        <div className="row align-items-center small text-secondary">
          <div className="col-md-6 text-center text-md-start">
            &copy; {new Date().getFullYear()} Municipal Civil Registration System. All Rights Reserved.
          </div>
          <div className="col-md-6 text-center text-md-end mt-2 mt-md-0">
            <span className="me-3">Privacy Policy</span>
            <span className="me-3">Terms of Service</span>
            <span>Hyperlink Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
