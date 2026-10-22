import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const STEPS = ['Fill Application', 'Preview & Confirm', 'Submitted'];

const ApplyDeathCertificate = () => {
  const { user } = useAuth();
  const location = useLocation();
  const formTopRef = useRef(null);

  const deathRecordRef = useRef(null);
  const informantIdProofRef = useRef(null);
  const addressProofRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [finalConfirmationAccepted, setFinalConfirmationAccepted] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);

  const getInitialFormData = useCallback(() => ({
    deceasedName: '',
    gender: 'MALE',
    dateOfBirth: '',
    age: '',
    dateOfDeath: '',
    timeOfDeath: '',
    placeOfDeath: 'HOSPITAL',
    hospitalName: '',
    placeAddress: '',
    causeOfDeath: 'Natural / Age related',
    district: '',
    state: '',
    fatherName: '',
    motherName: '',
    spouseName: '',
    informantName: user?.name || '',
    informantRelation: '',
    informantMobile: user?.phone || user?.mobile || '',
    informantAddress: user?.address || '',
    declarationAccepted: false,
  }), [user]);

  const [formData, setFormData] = useState(getInitialFormData);

  const [files, setFiles] = useState({
    deathRecord: null,
    informantIdProof: null,
    addressProof: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step1Errors, setStep1Errors] = useState({});

  const resetForm = useCallback(() => {
    setCurrentStep(1);
    setFinalConfirmationAccepted(false);
    setSubmittedApplication(null);
    setFormData(getInitialFormData());
    setFiles({
      deathRecord: null,
      informantIdProof: null,
      addressProof: null,
    });
    setStep1Errors({});
    setError('');
    setLoading(false);

    if (deathRecordRef.current) deathRecordRef.current.value = '';
    if (informantIdProofRef.current) informantIdProofRef.current.value = '';
    if (addressProofRef.current) addressProofRef.current.value = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [getInitialFormData]);

  useEffect(() => {
    resetForm();
  }, [location.key, resetForm]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (step1Errors[name]) {
      setStep1Errors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      const file = selectedFiles[0];
      if (file.size > 5 * 1024 * 1024) {
        setStep1Errors((prev) => ({ ...prev, [name]: 'File size must be 5 MB or less.' }));
        return;
      }
      setFiles((prev) => ({ ...prev, [name]: file }));
      if (step1Errors[name]) {
        setStep1Errors((prev) => ({ ...prev, [name]: '' }));
      }
      if (error) setError('');
    }
  };

  const validateStep1 = () => {
    const errs = {};
    const todayStr = new Date().toISOString().split('T')[0];

    if (!formData.deceasedName.trim()) errs.deceasedName = 'Deceased person name is required.';
    if (!formData.dateOfDeath) {
      errs.dateOfDeath = 'Date of death is required.';
    } else if (formData.dateOfDeath > todayStr) {
      errs.dateOfDeath = 'Date of death cannot be in the future.';
    }
    if (!formData.causeOfDeath.trim()) errs.causeOfDeath = 'Cause of death is required.';
    if (formData.placeOfDeath === 'HOSPITAL' && !formData.hospitalName.trim()) {
      errs.hospitalName = 'Hospital name is required when place of death is Hospital.';
    }
    if (formData.placeOfDeath !== 'HOSPITAL' && !formData.placeAddress.trim()) {
      errs.placeAddress = 'Address of death is required when place of death is Home/Other.';
    }
    if (!formData.fatherName.trim()) errs.fatherName = "Father's name is required.";
    if (!formData.informantName.trim()) errs.informantName = 'Informant name is required.';
    if (!formData.informantRelation.trim()) errs.informantRelation = 'Relationship with deceased is required.';
    if (!formData.informantMobile.trim()) {
      errs.informantMobile = 'Mobile number is required.';
    } else if (!/^\d{10}$/.test(formData.informantMobile.trim())) {
      errs.informantMobile = 'Please enter a valid 10-digit mobile number.';
    }
    if (!formData.informantAddress.trim()) errs.informantAddress = 'Informant address is required.';
    if (!files.deathRecord) errs.deathRecord = 'Hospital / Medical Death Record document is required.';
    if (!files.informantIdProof) errs.informantIdProof = 'Informant ID Proof document is required.';
    if (!formData.declarationAccepted) errs.declarationAccepted = 'You must accept the declaration to proceed.';

    return errs;
  };

  const handleGoToPreview = (e) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) {
      setStep1Errors(errs);
      setError('Please resolve all errors highlighted below before reviewing.');
      formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setStep1Errors({});
    setError('');
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSection = (sectionId) => {
    setCurrentStep(1);
    setFinalConfirmationAccepted(false);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleFinalSubmit = async () => {
    if (!finalConfirmationAccepted) {
      setError('Please check the final confirmation checkbox before submitting.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const certificateDetails = {
        deceasedName: formData.deceasedName,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        age: formData.age,
        dateOfDeath: formData.dateOfDeath,
        timeOfDeath: formData.timeOfDeath,
        placeOfDeath: formData.placeOfDeath,
        hospitalName: formData.placeOfDeath === 'HOSPITAL' ? formData.hospitalName : '',
        placeAddress: formData.placeAddress,
        causeOfDeath: formData.causeOfDeath,
        district: formData.district,
        state: formData.state,
        fatherName: formData.fatherName,
        motherName: formData.motherName,
        spouseName: formData.spouseName,
        informantName: formData.informantName,
        informantRelation: formData.informantRelation,
        informantMobile: formData.informantMobile,
        informantAddress: formData.informantAddress,
        declarationAccepted: formData.declarationAccepted,
      };

      const applicantDetails = {
        name: user?.name || formData.informantName,
        email: user?.email || '',
        mobile: formData.informantMobile,
        address: formData.informantAddress,
      };

      const data = new FormData();
      data.append('certificateType', 'DEATH');
      data.append('applicantDetails', JSON.stringify(applicantDetails));
      data.append('certificateDetails', JSON.stringify(certificateDetails));

      if (files.deathRecord) data.append('Death / Hospital Record', files.deathRecord);
      if (files.informantIdProof) data.append('Informant ID Proof', files.informantIdProof);
      if (files.addressProof) data.append('Address Proof', files.addressProof);

      const res = await api.post('/applications', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmittedApplication(res.data.application);
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Submission failed. Please check your data and try again.';
      setError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d) => {
    if (!d) return '-';
    try {
      const parts = d.split('-');
      if (parts.length === 3) {
        return parts[2] + '/' + parts[1] + '/' + parts[0];
      }
      return d;
    } catch {
      return d;
    }
  };

  const fmtLabel = (val, map) => map[val] || val || '-';

  const placeMap = {
    HOSPITAL: 'Hospital / Medical Institution',
    HOME: 'Home',
    OTHER: 'Other',
  };

  const genderMap = {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other',
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const StepIndicator = () => (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center position-relative">
        <div
          className="position-absolute top-50 start-0 end-0 bg-secondary-subtle"
          style={{ height: '3px', zIndex: 0, transform: 'translateY(-50%)' }}
        ></div>
        <div
          className="position-absolute top-50 start-0 bg-primary"
          style={{
            height: '3px',
            zIndex: 0,
            transform: 'translateY(-50%)',
            width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
            transition: 'width 0.3s ease',
          }}
        ></div>

        {STEPS.map((stepLabel, idx) => {
          const stepNum = idx + 1;
          const isDone = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;
          return (
            <div
              key={stepLabel}
              className="d-flex flex-column align-items-center position-relative"
              style={{ zIndex: 1 }}
            >
              <div
                className={
                  'rounded-circle d-flex align-items-center justify-content-center fw-bold ' +
                  (isDone
                    ? 'bg-success text-white'
                    : isCurrent
                    ? 'bg-primary text-white shadow'
                    : 'bg-light text-muted border')
                }
                style={{ width: '38px', height: '38px', fontSize: '14px' }}
              >
                {isDone ? <i className="bi bi-check-lg"></i> : stepNum}
              </div>
              <small
                className={
                  'mt-2 fw-semibold ' +
                  (isCurrent ? 'text-primary' : isDone ? 'text-success' : 'text-muted')
                }
              >
                {stepLabel}
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (currentStep === 3 && submittedApplication) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <StepIndicator />
            <div className="card border-0 shadow-sm text-center p-4 p-md-5">
              <div
                className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center mx-auto mb-4"
                style={{ width: '80px', height: '80px', fontSize: '40px' }}
              >
                <i className="bi bi-check-lg"></i>
              </div>
              <h3 className="fw-bold text-success mb-2">Application Submitted Successfully!</h3>
              <p className="text-muted mb-4">
                Your Death Certificate Application has been logged in the Municipal System.
              </p>

              <div className="bg-light rounded p-4 mb-4 text-start border">
                <div className="row g-3">
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Application Number</small>
                    <span className="fs-5 fw-bold text-primary">{submittedApplication.applicationNumber}</span>
                  </div>
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Status</small>
                    <span className="badge bg-warning text-dark fs-6 mt-1">Submitted / Pending</span>
                  </div>
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Deceased Name</small>
                    <span className="fw-semibold">{formData.deceasedName}</span>
                  </div>
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Date of Death</small>
                    <span className="fw-semibold">{fmtDate(formData.dateOfDeath)}</span>
                  </div>
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Informant Name</small>
                    <span className="fw-semibold">{formData.informantName}</span>
                  </div>
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Submission Date</small>
                    <span className="fw-semibold">{new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              </div>

              <div className="alert alert-info border-0 text-start small mb-4">
                <i className="bi bi-info-circle-fill me-2"></i>
                Your application has been assigned to a Municipal Verification Officer. You will receive updates as it is processed.
              </div>

              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <button
                  type="button"
                  className="btn btn-outline-primary px-4 py-2 fw-semibold"
                  onClick={resetForm}
                >
                  <i className="bi bi-plus-circle me-2"></i>New Death Certificate Application
                </button>
                <Link
                  to={'/citizen/track-application/' + submittedApplication.applicationNumber}
                  className="btn btn-primary px-4 py-2"
                >
                  <i className="bi bi-search me-2"></i>Track Application
                </Link>
                <Link to="/citizen/dashboard" className="btn btn-outline-secondary px-4 py-2">
                  <i className="bi bi-house-door me-2"></i>Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const PreviewRow = ({ label, value }) => (
    <div className="row mb-2">
      <div className="col-5 col-md-4 text-muted small">{label}</div>
      <div className="col-7 col-md-8 fw-semibold small">{value || '-'}</div>
    </div>
  );

  const PreviewSection = ({ id, title, icon, children }) => (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3">
        <h6 className="mb-0 fw-semibold text-primary">
          <i className={'bi ' + icon + ' me-2'}></i>
          {title}
        </h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => handleEditSection(id)}
        >
          <i className="bi bi-pencil me-1"></i>Edit
        </button>
      </div>
      <div className="card-body py-3">{children}</div>
    </div>
  );

  if (currentStep === 2) {
    return (
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="d-flex align-items-center mb-3">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary me-3"
                onClick={() => setCurrentStep(1)}
              >
                <i className="bi bi-arrow-left me-1"></i>Back to Form
              </button>
              <div>
                <h4 className="mb-0 fw-bold">Preview Application</h4>
                <small className="text-muted">
                  Review all entered details before final submission
                </small>
              </div>
            </div>

            <StepIndicator />

            {error && (
              <div className="alert alert-danger d-flex align-items-center mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </div>
            )}

            <PreviewSection id="section-deceased" title="Deceased Information" icon="bi-person-fill">
              <PreviewRow label="Full Name of Deceased" value={formData.deceasedName} />
              <PreviewRow label="Gender" value={fmtLabel(formData.gender, genderMap)} />
              <PreviewRow label="Date of Birth" value={fmtDate(formData.dateOfBirth)} />
              <PreviewRow label="Age at Death" value={formData.age ? formData.age + ' years' : '-'} />
            </PreviewSection>

            <PreviewSection id="section-death" title="Death Information" icon="bi-file-medical">
              <PreviewRow label="Date of Death" value={fmtDate(formData.dateOfDeath)} />
              <PreviewRow label="Time of Death" value={formData.timeOfDeath || '-'} />
              <PreviewRow label="Place of Death" value={fmtLabel(formData.placeOfDeath, placeMap)} />
              {formData.placeOfDeath === 'HOSPITAL' ? (
                <PreviewRow label="Hospital Name" value={formData.hospitalName} />
              ) : (
                <PreviewRow label="Death Address" value={formData.placeAddress} />
              )}
              <PreviewRow label="Cause of Death" value={formData.causeOfDeath} />
              <PreviewRow label="District" value={formData.district} />
              <PreviewRow label="State" value={formData.state} />
            </PreviewSection>

            <PreviewSection id="section-family" title="Family Information" icon="bi-people-fill">
              <PreviewRow label="Father's Name" value={formData.fatherName} />
              <PreviewRow label="Mother's Name" value={formData.motherName} />
              <PreviewRow label="Spouse's Name" value={formData.spouseName} />
            </PreviewSection>

            <PreviewSection id="section-informant" title="Informant Details" icon="bi-person-badge">
              <PreviewRow label="Informant Name" value={formData.informantName} />
              <PreviewRow label="Relationship to Deceased" value={formData.informantRelation} />
              <PreviewRow label="Mobile Number" value={formData.informantMobile} />
              <PreviewRow label="Address" value={formData.informantAddress} />
            </PreviewSection>

            <PreviewSection id="section-docs" title="Supporting Documents" icon="bi-file-earmark-arrow-up">
              <PreviewRow
                label="Death / Hospital Record"
                value={files.deathRecord ? files.deathRecord.name + ' (' + formatFileSize(files.deathRecord.size) + ')' : '-'}
              />
              <PreviewRow
                label="Informant ID Proof"
                value={files.informantIdProof ? files.informantIdProof.name + ' (' + formatFileSize(files.informantIdProof.size) + ')' : '-'}
              />
              <PreviewRow
                label="Address Proof"
                value={files.addressProof ? files.addressProof.name + ' (' + formatFileSize(files.addressProof.size) + ')' : '-'}
              />
            </PreviewSection>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-bottom py-3">
                <h6 className="mb-0 fw-semibold text-primary">
                  <i className="bi bi-check-square me-2"></i>Final Confirmation
                </h6>
              </div>
              <div className="card-body">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="finalConfirmationCheck"
                    checked={finalConfirmationAccepted}
                    onChange={(e) => {
                      setFinalConfirmationAccepted(e.target.checked);
                      if (error) setError('');
                    }}
                  />
                  <label className="form-check-label text-dark fw-semibold" htmlFor="finalConfirmationCheck">
                    I confirm that all the details provided above are accurate and verified to the best of my knowledge.
                  </label>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-5">
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={() => setCurrentStep(1)}
              >
                <i className="bi bi-pencil me-1"></i>Edit Application
              </button>
              <button
                type="button"
                className="btn btn-success px-5 py-2 fw-semibold"
                disabled={loading || !finalConfirmationAccepted}
                onClick={handleFinalSubmit}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i>Submit Application
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const FieldError = ({ name }) =>
    step1Errors[name] ? (
      <div className="invalid-feedback d-block">{step1Errors[name]}</div>
    ) : null;

  const isInvalid = (name) => !!step1Errors[name];

  return (
    <div className="container py-4" ref={formTopRef}>
      <div className="row justify-content-center">
        <div className="col-lg-9">
          <div className="d-flex align-items-center mb-3">
            <Link to="/citizen/dashboard" className="btn btn-sm btn-outline-secondary me-3">
              <i className="bi bi-arrow-left me-1"></i>Cancel
            </Link>
            <div>
              <h4 className="mb-0 fw-bold">Apply for Death Certificate</h4>
              <small className="text-muted">Fill out the death registration details</small>
            </div>
          </div>

          <StepIndicator />

          {error && (
            <div className="alert alert-danger d-flex align-items-center mb-3">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleGoToPreview} noValidate>
            <div className="card border-0 shadow-sm mb-3" id="section-deceased">
              <div className="card-header bg-primary text-white py-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="bi bi-person-fill me-2"></i>A. Deceased Information
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label fw-semibold">
                      Full Name of Deceased <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={'form-control ' + (isInvalid('deceasedName') ? 'is-invalid' : '')}
                      name="deceasedName"
                      value={formData.deceasedName}
                      onChange={handleChange}
                      placeholder="Enter full name of deceased person"
                    />
                    <FieldError name="deceasedName" />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Gender</label>
                    <select
                      className="form-select"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Date of Birth</label>
                    <input
                      type="date"
                      className="form-control"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                    />
                    <div className="form-text">Leave blank if unknown</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Age at Death (Years)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      placeholder="e.g. 65"
                      min="0"
                      max="150"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-3" id="section-death">
              <div className="card-header bg-primary text-white py-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="bi bi-file-medical me-2"></i>B. Death Information
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Date of Death <span className="text-danger">*</span>
                    </label>
                    <input
                      type="date"
                      className={'form-control ' + (isInvalid('dateOfDeath') ? 'is-invalid' : '')}
                      name="dateOfDeath"
                      value={formData.dateOfDeath}
                      onChange={handleChange}
                    />
                    <FieldError name="dateOfDeath" />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Time of Death</label>
                    <input
                      type="time"
                      className="form-control"
                      name="timeOfDeath"
                      value={formData.timeOfDeath}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Place of Death</label>
                    <select
                      className="form-select"
                      name="placeOfDeath"
                      value={formData.placeOfDeath}
                      onChange={handleChange}
                    >
                      <option value="HOSPITAL">Hospital / Medical Institution</option>
                      <option value="HOME">Home</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {formData.placeOfDeath === 'HOSPITAL' ? (
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Hospital Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={'form-control ' + (isInvalid('hospitalName') ? 'is-invalid' : '')}
                        name="hospitalName"
                        value={formData.hospitalName}
                        onChange={handleChange}
                        placeholder="Enter hospital name"
                      />
                      <FieldError name="hospitalName" />
                    </div>
                  ) : (
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Address / Location of Death <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={'form-control ' + (isInvalid('placeAddress') ? 'is-invalid' : '')}
                        name="placeAddress"
                        value={formData.placeAddress}
                        onChange={handleChange}
                        placeholder="Enter complete address where death occurred"
                      />
                      <FieldError name="placeAddress" />
                    </div>
                  )}

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Cause of Death <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={'form-control ' + (isInvalid('causeOfDeath') ? 'is-invalid' : '')}
                      name="causeOfDeath"
                      value={formData.causeOfDeath}
                      onChange={handleChange}
                      placeholder="e.g. Cardiac Arrest, Natural Causes"
                    />
                    <FieldError name="causeOfDeath" />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-semibold">District</label>
                    <input
                      type="text"
                      className="form-control"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      placeholder="e.g. Central"
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label fw-semibold">State</label>
                    <input
                      type="text"
                      className="form-control"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="e.g. Delhi"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-3" id="section-family">
              <div className="card-header bg-primary text-white py-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="bi bi-people-fill me-2"></i>C. Family Information
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">
                      Father's Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={'form-control ' + (isInvalid('fatherName') ? 'is-invalid' : '')}
                      name="fatherName"
                      value={formData.fatherName}
                      onChange={handleChange}
                      placeholder="Father's full name"
                    />
                    <FieldError name="fatherName" />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Mother's Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="motherName"
                      value={formData.motherName}
                      onChange={handleChange}
                      placeholder="Mother's full name (optional)"
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Spouse's Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="spouseName"
                      value={formData.spouseName}
                      onChange={handleChange}
                      placeholder="Spouse's full name (if married)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-3" id="section-informant">
              <div className="card-header bg-primary text-white py-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="bi bi-person-badge me-2"></i>D. Informant Information
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Informant Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={'form-control ' + (isInvalid('informantName') ? 'is-invalid' : '')}
                      name="informantName"
                      value={formData.informantName}
                      onChange={handleChange}
                      placeholder="Full name of person reporting"
                    />
                    <FieldError name="informantName" />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Relationship to Deceased <span className="text-danger">*</span>
                    </label>
                    <select
                      className={'form-select ' + (isInvalid('informantRelation') ? 'is-invalid' : '')}
                      name="informantRelation"
                      value={formData.informantRelation}
                      onChange={handleChange}
                    >
                      <option value="">-- Select Relationship --</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Other">Other</option>
                    </select>
                    <FieldError name="informantRelation" />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Mobile Number <span className="text-danger">*</span>
                    </label>
                    <input
                      type="tel"
                      className={'form-control ' + (isInvalid('informantMobile') ? 'is-invalid' : '')}
                      name="informantMobile"
                      value={formData.informantMobile}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                    />
                    <FieldError name="informantMobile" />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Informant Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={'form-control ' + (isInvalid('informantAddress') ? 'is-invalid' : '')}
                      name="informantAddress"
                      value={formData.informantAddress}
                      onChange={handleChange}
                      placeholder="Complete postal address"
                    />
                    <FieldError name="informantAddress" />
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-3" id="section-docs">
              <div className="card-header bg-primary text-white py-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="bi bi-file-earmark-arrow-up me-2"></i>E. Supporting Documents
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Death / Hospital Record <span className="text-danger">*</span>
                    </label>
                    <input
                      ref={deathRecordRef}
                      type="file"
                      className={'form-control ' + (isInvalid('deathRecord') ? 'is-invalid' : '')}
                      name="deathRecord"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    {files.deathRecord && (
                      <div className="form-text text-success">
                        <i className="bi bi-check-circle me-1"></i>
                        Selected: {files.deathRecord.name} ({formatFileSize(files.deathRecord.size)})
                      </div>
                    )}
                    <FieldError name="deathRecord" />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Informant ID Proof <span className="text-danger">*</span>
                    </label>
                    <input
                      ref={informantIdProofRef}
                      type="file"
                      className={'form-control ' + (isInvalid('informantIdProof') ? 'is-invalid' : '')}
                      name="informantIdProof"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    {files.informantIdProof && (
                      <div className="form-text text-success">
                        <i className="bi bi-check-circle me-1"></i>
                        Selected: {files.informantIdProof.name} ({formatFileSize(files.informantIdProof.size)})
                      </div>
                    )}
                    <FieldError name="informantIdProof" />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Address Proof (Optional)</label>
                    <input
                      ref={addressProofRef}
                      type="file"
                      className="form-control"
                      name="addressProof"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    {files.addressProof && (
                      <div className="form-text text-success">
                        <i className="bi bi-check-circle me-1"></i>
                        Selected: {files.addressProof.name} ({formatFileSize(files.addressProof.size)})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-primary text-white py-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="bi bi-check-circle me-2"></i>F. Declaration
                </h6>
              </div>
              <div className="card-body">
                <div className="form-check">
                  <input
                    className={'form-check-input ' + (isInvalid('declarationAccepted') ? 'is-invalid' : '')}
                    type="checkbox"
                    name="declarationAccepted"
                    id="declarationCheck"
                    checked={formData.declarationAccepted}
                    onChange={handleChange}
                  />
                  <label className="form-check-label fw-semibold" htmlFor="declarationCheck">
                    I hereby declare that the particulars given above are true and correct to the best of my knowledge and belief.
                  </label>
                  <FieldError name="declarationAccepted" />
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-5">
              <Link to="/citizen/dashboard" className="btn btn-outline-secondary px-4">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary px-5 py-2 fw-semibold">
                Preview & Review Application <i className="bi bi-arrow-right ms-2"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyDeathCertificate;
