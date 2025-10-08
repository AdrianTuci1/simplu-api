import { ACMClient, ListCertificatesCommand, RequestCertificateCommand } from '@aws-sdk/client-acm';

const acm = new ACMClient({ region: 'us-east-1' }); // CloudFront certificates must be in us-east-1

export const handler = async (event) => {
  const baseDomain = process.env.BASE_DOMAIN || 'simplu.io';

  // Try to find an existing certificate for base domain or wildcard
  const list = await acm.send(new ListCertificatesCommand({ CertificateStatuses: ['ISSUED', 'PENDING_VALIDATION'] }));
  const found = (list.CertificateSummaryList || []).find(
    (c) => c.DomainName === baseDomain || (c.SubjectAlternativeNameSummaries || []).includes(`*.${baseDomain}`)
  );
  if (found && found.CertificateArn) {
    return { certificateArn: found.CertificateArn, reused: true };
  }

  // Request a new one if none found (DNS validation)
  const req = await acm.send(new RequestCertificateCommand({
    DomainName: baseDomain,
    SubjectAlternativeNames: [`*.${baseDomain}`],
    ValidationMethod: 'DNS',
  }));

  return { certificateArn: req.CertificateArn, reused: false };
};


