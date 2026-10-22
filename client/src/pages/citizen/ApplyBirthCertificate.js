import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const STEPS = ['Fill Application', 'Preview & Confirm', 'Submitted'];

const ApplyBirthCertificate = () => {
  const { user } = useAuth();
  const location = useLocation();
  const formTopRef = useRef(null);

  const hospitalRecordRef = useRef(null);
  const parentIdProofRef = useRef(null);
  const addressProofRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [finalConfirmationAccepted, setFinalConfirmationAccepted] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);

  const getInitialFormData = useCallback(() => ({
    // Child Details
    childName: '',
    gender: 'MALE',
    dateOfBirth: '',
    timeOfBirth: '',
    placeOfBirth: 'HOSPITAL',

    // Parent Details
    fatherName: '',
    motherName: '',
    fatherMobile: user?.mobile || '',
    motherMobile: '',

    // Birth Information
    hospitalName: '',
    district: user?.city || '',
    registrationDate: new Date().toISOString().split('T')[0],

    // Address
    permanentAddress: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    pincode: user?.pincode || '',

    // Declaration
    declarationAccepted: false,
  }), [user]);

  const [formData, setFormData] = useState(getInitialFormData);

  const [files, setFiles] = useState({
    hospitalRecord: null,
    parentIdProof: null,
    addressProof: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = useCallback(() => {
    setCurrentStep(1);
    setFinalConfirmationAccepted(false);
    setSubmittedApplication(null);
    setFormData(getInitialFormData());
    setFiles({
      hospitalRecord: null,
      parentIdProof: null,
      addressProof: null,
    });
    setError('');
    setLoading(false);

    if (hospitalRecordRef.current) hospitalRecordRef.current.value = '';
    if (parentIdProofRef.current) parentIdProofRef.current.value = '';
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
    if (error) setError('');
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      const file = selectedFiles[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('File "' + file.name + '" exceeds the 5MB size limit.');
        e.target.value = '';
        return;
      }
      setFiles((prev) => ({
        ...prev,
        [name]: file,
      }));
      if (error) setError('');
    }
  };

  const validateForm = () => {
    if (!formData.childName.trim()) return 'Child full name is required.';
    if (!formData.dateOfBirth) return 'Date of birth is required.';
    if (!formData.timeOfBirth) return 'Time of birth is required.';
    if (!formData.fatherName.trim()) return "Father's full name is required.";
    if (!formData.motherName.trim()) return "Mother's full name is required.";
    if (!formData.fatherMobile.trim()) return "Father's mobile number is required.";
    if (!formData.hospitalName.trim()) return 'Hospital / Institution name is required.';
    if (!formData.district.trim()) return 'Registration district is required.';
    if (!formData.permanentAddress.trim()) return 'Permanent residential address is required.';
    if (!formData.city.trim()) return 'City is required.';
    if (!formData.state.trim()) return 'State is required.';
    if (!formData.pincode.trim()) return 'PIN Code is required.';
    if (!files.hospitalRecord || !files.parentIdProof || !files.addressProof) {
      return 'Please upload all 3 mandatory supporting documents (Hospital record, Parent ID proof, Address proof).';
    }
    if (!formData.declarationAccepted) {
      return 'You must accept the legal declaration before proceeding to preview.';
    }
    return null;
  };

  const handleGoToPreview = (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      formTopRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
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
      setError('Please check the confirmation checkbox before submitting.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submissionData = new FormData();
      submissionData.append('certificateType', 'BIRTH');

      const applicantDetails = {
        name: user?.name,
        email: user?.email,
        mobile: user?.mobile,
        address: formData.permanentAddress,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      };
      submissionData.append('applicantDetails', JSON.stringify(applicantDetails));
      submissionData.append('certificateDetails', JSON.stringify(formData));

      if (files.hospitalRecord) submissionData.append('Hospital Birth Record', files.hospitalRecord);
      if (files.parentIdProof) submissionData.append('Parent ID Proof', files.parentIdProof);
      if (files.addressProof) submissionData.append('Address Proof', files.addressProof);

      const res = await api.post('/applications', submissionData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data && res.data.application) {
        setSubmittedApplication(res.data.application);
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('[Application Submission Error]:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit application.');
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const placeOfBirthMap = {
    HOSPITAL: 'Hospital / Nursing Home / Medical Institution',
    HOUSE: 'House / Residence',
    OTHER: 'Other Place',
  };

  const genderMap = {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other',
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

  // STEP 3: SUBMITTED SUCCESS VIEW
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
              <h3 className="fw-bold text-success mb-2">APPLICATION SUBMITTED SUCCESSFULLY</h3>
              <p className="text-muted mb-4">
                Your Birth Registration Application has been registered in the Municipal System.
              </p>

              <div className="bg-light rounded p-4 mb-4 text-start border">
                <div className="row g-3">
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Application Number</small>
                    <span className="fs-5 fw-bold text-primary">{submittedApplication.applicationNumber}</span>
                  </div>
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Status</small>
                    <span className="badge bg-warning text-dark fs-6 mt-1">
                      {submittedApplication.status || 'Submitted / Pending'}
                    </span>
                  </div>
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Child Full Name</small>
                    <span className="fw-semibold">{formData.childName}</span>
                  </div>
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Date of Birth</small>
                    <span className="fw-semibold">{fmtDate(formData.dateOfBirth)}</span>
                  </div>
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Father's Name</small>
                    <span className="fw-semibold">{formData.fatherName}</span>
                  </div>
                  <div className="col-sm-6">
                    <small className="text-muted d-block text-uppercase fw-semibold">Submission Date</small>
                    <span className="fw-semibold">{new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              </div>

              <div className="alert alert-info border-0 text-start small mb-4">
                <i className="bi bi-info-circle-fill me-2"></i>
                Your application has been assigned to a Municipal Verification Officer. You will receive updates as it is processed. Standard turnaround is 48 Hours.
              </div>

              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <button
                  type="button"
                  className="btn btn-outline-primary px-4 py-2 fw-semibold"
                  onClick={resetForm}
                >
                  <i className="bi bi-plus-circle me-2"></i>New Birth Certificate Application
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

  const PreviewSection = ({ id, title, icon, onEdit, children }) => (
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
          <i className="bi bi-pencil me-1"></i>{onEdit || ('Edit ' + title)}
        </button>
      </div>
      <div className="card-body py-3">{children}</div>
    </div>
  );

  // STEP 2: PREVIEW & CONFIRM VIEW
  if (currentStep === 2) {
    return (
      <div className="container py-4">
        {/* Navigation Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb small">
            <li className="breadcrumb-item">
              <Link to="/citizen/dashboard">Dashboard</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Preview Birth Application
            </li>
          </ol>
        </nav>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="d-flex align-items-center mb-3">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary me-3"
                onClick={() => setCurrentStep(1)}
              >
                <i className="bi bi-arrow-left me-1"></i>Back to Edit
              </button>
              <div>
                <h4 className="mb-0 fw-bold">BIRTH CERTIFICATE APPLICATION</h4>
                <small className="text-muted">Preview & Confirm details before final submission</small>
              </div>
            </div>

            <StepIndicator />

            {error && (
              <div className="alert alert-danger d-flex align-items-center mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </div>
            )}

            {/* 1. Child Information */}
            <PreviewSection id="section-child" title="Child Information" icon="bi-person-heart" onEdit="Edit Child Information">
              <PreviewRow label="Child Full Name" value={formData.childName} />
              <PreviewRow label="Gender" value={genderMap[formData.gender] || formData.gender} />
              <PreviewRow label="Date of Birth" value={fmtDate(formData.dateOfBirth)} />
              <PreviewRow label="Time of Birth" value={formData.timeOfBirth} />
              <PreviewRow label="Place of Birth Type" value={placeOfBirthMap[formData.placeOfBirth] || formData.placeOfBirth} />
            </PreviewSection>

            {/* 2. Parents Information */}
            <PreviewSection id="section-parents" title="Parents Information" icon="bi-people-fill" onEdit="Edit Parents Information">
              <PreviewRow label="Father's Full Name" value={formData.fatherName} />
              <PreviewRow label="Mother's Full Name" value={formData.motherName} />
              <PreviewRow label="Father's Mobile Number" value={formData.fatherMobile} />
              <PreviewRow label="Mother's Mobile Number" value={formData.motherMobile || '-'} />
            </PreviewSection>

            {/* 3. Hospital / Institutional Details */}
            <PreviewSection id="section-hospital" title="Hospital / Institutional Details" icon="bi-hospital" onEdit="Edit Hospital Details">
              <PreviewRow label="Hospital / Institution Name" value={formData.hospitalName} />
              <PreviewRow label="Registration District" value={formData.district} />
              <PreviewRow label="Registration Date" value={fmtDate(formData.registrationDate)} />
            </PreviewSection>

            {/* 4. Permanent Address */}
            <PreviewSection id="section-address" title="Permanent Address" icon="bi-geo-alt-fill" onEdit="Edit Address">
              <PreviewRow label="Street / Residential Address" value={formData.permanentAddress} />
              <PreviewRow label="City / Town" value={formData.city} />
              <PreviewRow label="State" value={formData.state} />
              <PreviewRow label="PIN Code" value={formData.pincode} />
            </PreviewSection>

            {/* 5. Supporting Documents */}
            <PreviewSection id="section-docs" title="Supporting Documents" icon="bi-file-earmark-arrow-up-fill" onEdit="Edit Documents">
              <PreviewRow
                label="Hospital Birth Record"
                value={files.hospitalRecord ? ('✓ ' + files.hospitalRecord.name + ' (' + formatFileSize(files.hospitalRecord.size) + ')') : '-'}
              />
              <PreviewRow
                label="Parent ID Proof"
                value={files.parentIdProof ? ('✓ ' + files.parentIdProof.name + ' (' + formatFileSize(files.parentIdProof.size) + ')') : '-'}
              />
              <PreviewRow
                label="Address Proof"
                value={files.addressProof ? ('✓ ' + files.addressProof.name + ' (' + formatFileSize(files.addressProof.size) + ')') : '-'}
              />
            </PreviewSection>

            {/* 6. Declaration */}
            <PreviewSection id="section-declaration" title="Declaration" icon="bi-shield-check" onEdit="Edit Declaration">
              <div className="small text-muted mb-2">
                "I hereby declare that the information provided is true and correct to the best of my knowledge. I understand that submitting false or misleading information is punishable under the Registration of Births and Deaths Act, 1969."
              </div>
              <div className="badge bg-success">Status: Accepted</div>
            </PreviewSection>

            {/* Final Confirmation Checkbox */}
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
                    I confirm that the information provided above is correct and I want to submit this application.
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="d-flex justify-content-between align-items-center mb-5">
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={() => setCurrentStep(1)}
              >
                <i className="bi bi-arrow-left me-1"></i> Back to Edit
              </button>
              <button
                type="button"
                className="btn btn-success px-5 py-2 fw-bold shadow-sm"
                disabled={loading || !finalConfirmationAccepted}
                onClick={handleFinalSubmit}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-check-fill me-2"></i> Confirm & Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: FORM VIEW
  return (
    <div className="container py-4" ref={formTopRef}>
      {/* Navigation Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/citizen/dashboard">Dashboard</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Apply Birth Certificate
          </li>
        </ol>
      </nav>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-dark text-white p-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <span className="badge bg-primary px-3 py-1 mb-2">Form No. 1 (Birth Registration)</span>
              <h3 className="fw-bold mb-1">Application for Registration of Birth</h3>
              <p className="small text-muted mb-0">
                Issued under Section 12/17 of Registration of Births and Deaths Act, 1969
              </p>
            </div>
            <div className="text-end d-none d-md-block">
              <span className="badge bg-light text-dark border p-2">
                <i className="bi bi-clock-history text-primary me-1"></i> Standard Turnaround: 48 Hours SLA
              </span>
            </div>
          </div>
        </div>

        <div className="card-body p-4 p-md-5 bg-white">
          <StepIndicator />

          {error && (
            <div className="alert alert-danger py-3 mb-4 d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleGoToPreview}>
            {/* Section 1: Child Details */}
            <div className="mb-4" id="section-child">
              <h5 className="text-primary fw-bold border-bottom pb-2 mb-3">
                <i className="bi bi-person-heart me-2"></i> 1. Child Information
              </h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">
                    Child Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="childName"
                    className="form-control"
                    placeholder="e.g. Aarav Kumar"
                    value={formData.childName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold small text-secondary">
                    Gender <span className="text-danger">*</span>
                  </label>
                  <select name="gender" className="form-select" value={formData.gender} onChange={handleChange} required>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-bold small text-secondary">
                    Date of Birth <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    className="form-control"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">
                    Time of Birth (Approx.) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="time"
                    name="timeOfBirth"
                    className="form-control"
                    value={formData.timeOfBirth}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">
                    Place of Birth Type <span className="text-danger">*</span>
                  </label>
                  <select name="placeOfBirth" className="form-select" value={formData.placeOfBirth} onChange={handleChange} required>
                    <option value="HOSPITAL">Hospital / Nursing Home / Medical Institution</option>
                    <option value="HOUSE">House / Residence</option>
                    <option value="OTHER">Other Place</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Parent Details */}
            <div className="mb-4" id="section-parents">
              <h5 className="text-primary fw-bold border-bottom pb-2 mb-3">
                <i className="bi bi-people-fill me-2"></i> 2. Parents Information
              </h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">
                    Father's Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="fatherName"
                    className="form-control"
                    placeholder="e.g. Rajesh Kumar"
                    value={formData.fatherName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">
                    Mother's Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="motherName"
                    className="form-control"
                    placeholder="e.g. Sunita Devi"
                    value={formData.motherName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">
                    Father's Mobile Number <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    name="fatherMobile"
                    className="form-control"
                    placeholder="e.g. 9876543210"
                    value={formData.fatherMobile}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">Mother's Mobile Number</label>
                  <input
                    type="tel"
                    name="motherMobile"
                    className="form-control"
                    placeholder="e.g. 9876543211 (Optional)"
                    value={formData.motherMobile}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Birth Location & Hospital Details */}
            <div className="mb-4" id="section-hospital">
              <h5 className="text-primary fw-bold border-bottom pb-2 mb-3">
                <i className="bi bi-hospital me-2"></i> 3. Hospital / Institutional Details
              </h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">
                    Hospital / Institution Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="hospitalName"
                    className="form-control"
                    placeholder="e.g. City Civil Hospital, Ward 4"
                    value={formData.hospitalName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold small text-secondary">
                    Registration District <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="district"
                    className="form-control"
                    placeholder="e.g. Metropolitan Municipal Corporation"
                    value={formData.district}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Permanent Residential Address */}
            <div className="mb-4" id="section-address">
              <h5 className="text-primary fw-bold border-bottom pb-2 mb-3">
                <i className="bi bi-geo-alt-fill me-2"></i> 4. Permanent Address of Parents
              </h5>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label fw-bold small text-secondary">
                    Street / Residential Address <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="permanentAddress"
                    className="form-control"
                    placeholder="House No., Street, Landmark"
                    value={formData.permanentAddress}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold small text-secondary">
                    City / Town <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    className="form-control"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold small text-secondary">
                    State <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    className="form-control"
                    value={formData.state}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-bold small text-secondary">
                    PIN Code <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    className="form-control"
                    value={formData.pincode}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Supporting Documents Upload */}
            <div className="mb-4" id="section-docs">
              <h5 className="text-primary fw-bold border-bottom pb-2 mb-3">
                <i className="bi bi-file-earmark-arrow-up-fill me-2"></i> 5. Supporting Documents (PDF, JPG, PNG &le; 5MB)
              </h5>
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="p-3 bg-light rounded border h-100">
                    <label className="form-label fw-bold small text-dark">
                      1. Hospital Birth Record <span className="text-danger">*</span>
                    </label>
                    <input
                      ref={hospitalRecordRef}
                      type="file"
                      name="hospitalRecord"
                      className="form-control form-control-sm"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    {files.hospitalRecord && (
                      <div className="form-text small text-success mt-1 fw-semibold">
                        ✓ {files.hospitalRecord.name} ({formatFileSize(files.hospitalRecord.size)})
                      </div>
                    )}
                    <div className="form-text small mt-1">Discharge summary or doctor birth slip</div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="p-3 bg-light rounded border h-100">
                    <label className="form-label fw-bold small text-dark">
                      2. Parent ID Proof <span className="text-danger">*</span>
                    </label>
                    <input
                      ref={parentIdProofRef}
                      type="file"
                      name="parentIdProof"
                      className="form-control form-control-sm"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    {files.parentIdProof && (
                      <div className="form-text small text-success mt-1 fw-semibold">
                        ✓ {files.parentIdProof.name} ({formatFileSize(files.parentIdProof.size)})
                      </div>
                    )}
                    <div className="form-text small mt-1">Aadhaar / Passport / Voter ID</div>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="p-3 bg-light rounded border h-100">
                    <label className="form-label fw-bold small text-dark">
                      3. Address Proof <span className="text-danger">*</span>
                    </label>
                    <input
                      ref={addressProofRef}
                      type="file"
                      name="addressProof"
                      className="form-control form-control-sm"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    {files.addressProof && (
                      <div className="form-text small text-success mt-1 fw-semibold">
                        ✓ {files.addressProof.name} ({formatFileSize(files.addressProof.size)})
                      </div>
                    )}
                    <div className="form-text small mt-1">Electricity bill / Gas bill / Ration card</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6: Legal Declaration */}
            <div className="p-3 bg-warning bg-opacity-10 border border-warning rounded mb-4" id="section-declaration">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="declarationCheck"
                  name="declarationAccepted"
                  checked={formData.declarationAccepted}
                  onChange={handleChange}
                />
                <label className="form-check-label fw-semibold text-dark small" htmlFor="declarationCheck">
                  I hereby declare that the information provided is true and correct to the best of my knowledge. I understand that submitting false or misleading information is punishable under the Registration of Births and Deaths Act, 1969.
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="d-flex justify-content-between align-items-center">
              <Link to="/citizen/dashboard" className="btn btn-outline-secondary">
                <i className="bi bi-arrow-left me-1"></i> Cancel
              </Link>
              <button type="submit" className="btn btn-primary btn-lg px-4 fw-bold shadow-sm">
                Preview Application <i className="bi bi-arrow-right ms-2"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyBirthCertificate;
