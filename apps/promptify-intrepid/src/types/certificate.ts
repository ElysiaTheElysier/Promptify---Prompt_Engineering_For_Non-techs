export interface CertificateData {
  recipientName: string;
  courseName: string;
  certificateTitle: string;
  issuedAt: string;
  certificateId: string;
  score?: number;
  issuerName: string;
  verificationUrl?: string;
  kind?: 'certificate' | 'badge';
}
