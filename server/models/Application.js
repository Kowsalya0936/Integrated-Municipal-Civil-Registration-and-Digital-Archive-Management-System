const mongoose = require('mongoose');

const documentSubSchema = new mongoose.Schema({
  documentType: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const applicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    certificateType: {
      type: String,
      enum: ['BIRTH', 'DEATH'],
      required: true,
      index: true,
    },
    applicantDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      mobile: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    certificateDetails: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    documents: [documentSubSchema],
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'RESUBMITTED', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    certificateNumber: {
      type: String,
      index: true,
      sparse: true,
    },
    certificateIssuedAt: {
      type: Date,
    },
    qrVerificationToken: {
      type: String,
      sparse: true,
    },
    certificateIntegrity: {
      algorithm: {
        type: String,
        default: 'SHA-256',
      },
      dataHash: {
        type: String,
        sparse: true,
        index: true,
      },
      generatedAt: {
        type: Date,
      },
    },
    slaDeadline: {
      type: Date,
      index: true,
    },
    isEscalated: {
      type: Boolean,
      default: false,
      index: true,
    },
    escalatedAt: {
      type: Date,
      index: true,
    },
    escalationReason: {
      type: String,
      trim: true,
    },
    escalationNotified: {
      type: Boolean,
      default: false,
    },
    escalationDescription: {
      type: String,
      trim: true,
    },
    escalationStatus: {
      type: String,
      enum: ['PENDING', 'IN_REVIEW', 'RESOLVED'],
    },
    duplicateSuspect: {
      isSuspect: { type: Boolean, default: false },
      matchedApplicationNumber: { type: String },
      matchReason: { type: String },
    },
    smartVerification: {
      overallRisk: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        default: 'LOW',
        index: true,
      },
      requiresAttention: {
        type: Boolean,
        default: false,
        index: true,
      },
      flagsCount: {
        type: Number,
        default: 0,
      },
      checks: [
        {
          code: { type: String, required: true },
          name: { type: String, required: true },
          status: { type: String, enum: ['PASS', 'WARNING', 'FAIL', 'FLAGGED'], required: true },
          message: { type: String, required: true },
          details: { type: mongoose.Schema.Types.Mixed },
        },
      ],
      checkedAt: {
        type: Date,
      },
    },
    // Certificate Versioning & Reissue Tracking
    certificateVersion: {
      type: Number,
      default: 1,
    },
    certificateStatus: {
      type: String,
      enum: ['ACTIVE', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    reissueHistory: [
      {
        previousCertificateNumber: { type: String },
        previousVersion: { type: Number },
        revokedAt: { type: Date },
        reissuedAt: { type: Date },
        reason: { type: String },
        reissuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        newCertificateNumber: { type: String },
        newVersion: { type: Number },
      },
    ],
    approvalEmailSent: {
      type: Boolean,
      default: false,
    },
    reissueEmailSent: {
      type: Boolean,
      default: false,
    },
    // Application Correction & Controlled Resubmission
    correctionRequest: {
      requested: {
        type: Boolean,
        default: false,
      },
      reason: {
        type: String,
        trim: true,
      },
      items: [
        {
          type: {
            type: String,
            enum: ['FIELD', 'DOCUMENT'],
            required: true,
          },
          field: {
            type: String,
            required: true,
          },
          label: {
            type: String,
            required: true,
          },
          instruction: {
            type: String,
            trim: true,
          },
        },
      ],
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      requestedAt: {
        type: Date,
      },
    },
    correctionHistory: [
      {
        requestId: {
          type: String,
        },
        requestedAt: {
          type: Date,
        },
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: {
          type: String,
        },
        items: [
          {
            type: {
              type: String,
            },
            field: {
              type: String,
            },
            label: {
              type: String,
            },
            instruction: {
              type: String,
            },
          },
        ],
        resubmittedAt: {
          type: Date,
        },
        resubmittedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        changedFields: {
          type: mongoose.Schema.Types.Mixed,
        },
        replacedDocuments: [
          {
            documentType: String,
            oldFileName: String,
            newFileName: String,
            newOriginalName: String,
            replacedAt: Date,
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Helper method to compute SLA remaining time
applicationSchema.methods.getSlaStatus = function () {
  if (this.status === 'APPROVED' || this.status === 'REJECTED') {
    return { status: 'COMPLETED', isOverdue: false, remainingHours: 0 };
  }
  if (!this.slaDeadline) {
    return { status: 'NORMAL', isOverdue: false, remainingHours: 48 };
  }
  const now = new Date();
  const diffMs = this.slaDeadline - now;
  const remainingHours = Math.round(diffMs / (1000 * 60 * 60));
  const isOverdue = diffMs < 0;
  return {
    status: isOverdue ? 'ESCALATED' : remainingHours <= 12 ? 'CRITICAL' : 'ON_TRACK',
    isOverdue,
    remainingHours,
  };
};

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
