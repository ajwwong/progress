import React from 'react';
import { Container, Title, Text, Paper, Stack, Box } from '@mantine/core';

const PrivacyPolicy: React.FC = () => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Container size="lg" py="xl">
      <Paper shadow="sm" p="xl">
        <Stack gap="xl">
          <Box ta="center">
            <Title order={1}>PRIVACY POLICY</Title>
            <Text size="lg" mt="md">Last Updated: {currentDate}</Text>
          </Box>

          <Stack gap="lg">
            <Box>
              <Title order={2}>1. INTRODUCTION</Title>
              <Text mt="md">
                Progress Notes (www.progressnotes.com), a digital product of Somatopia, LLC ("we," "our," or "us"), is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our clinical documentation platform and related services (collectively, the "Services").
              </Text>
              <Text mt="md">
                We understand the sensitive nature of healthcare data and take our obligations to protect your privacy seriously. This Privacy Policy is designed to help you understand our practices and your rights regarding your information.
              </Text>
            </Box>

            <Box>
              <Title order={2}>2. INFORMATION WE COLLECT</Title>
              
              <Title order={3} mt="md">2.1 Information You Provide</Title>
              <Text mt="md">
                We collect information that you provide directly to us, including:
              </Text>
              <Text mt="md" component="ul" style={{ paddingLeft: '20px' }}>
                <li>Account registration information (name, email, professional credentials)</li>
                <li>Practice or organization information</li>
                <li>Patient health information and clinical documentation</li>
                <li>Audio recordings of clinical sessions (when using transcription features)</li>
                <li>Payment and billing information</li>
                <li>Communications with our support team</li>
              </Text>

              <Title order={3} mt="lg">2.2 Automatically Collected Information</Title>
              <Text mt="md">
                When you use our Services, we automatically collect certain information, including:
              </Text>
              <Text mt="md" component="ul" style={{ paddingLeft: '20px' }}>
                <li>Device and browser information</li>
                <li>IP address and location information</li>
                <li>Usage data and interaction with our Services</li>
                <li>Performance and error data</li>
              </Text>
            </Box>

            <Box>
              <Title order={2}>3. HOW WE USE YOUR INFORMATION</Title>
              <Text mt="md">
                We use the collected information for the following purposes:
              </Text>
              <Text mt="md" component="ul" style={{ paddingLeft: '20px' }}>
                <li>Providing and improving our Services</li>
                <li>Processing and generating clinical documentation</li>
                <li>Communicating with you about our Services</li>
                <li>Ensuring compliance with legal and regulatory requirements</li>
                <li>Detecting and preventing fraud or abuse</li>
              </Text>
            </Box>

            <Box>
              <Title order={2}>4. HIPAA COMPLIANCE</Title>
              <Text mt="md">
                As a provider of services to healthcare professionals, we understand and comply with the Health Insurance Portability and Accountability Act (HIPAA). We maintain appropriate physical, technical, and administrative safeguards to protect Protected Health Information (PHI).
              </Text>
              <Text mt="md">
                When you use our Services to process PHI, our relationship is governed by a Business Associate Agreement (BAA). We only use and disclose PHI as permitted by our BAA and applicable law.
              </Text>
            </Box>

            <Box>
              <Title order={2}>5. DATA RETENTION AND DELETION</Title>
              <Text mt="md">
                We retain your information for as long as necessary to provide our Services and comply with our legal obligations. For PHI, we follow HIPAA retention requirements and our BAA terms.
              </Text>
              <Text mt="md">
                You may request deletion of your account and associated data. However, we may retain certain information as required by law or for legitimate business purposes.
              </Text>
            </Box>

            <Box>
              <Title order={2}>6. DATA SECURITY</Title>
              <Text mt="md">
                We implement appropriate technical and organizational measures to protect your information, including:
              </Text>
              <Text mt="md" component="ul" style={{ paddingLeft: '20px' }}>
                <li>Encryption of data in transit and at rest</li>
                <li>Access controls and authentication requirements</li>
                <li>Regular security assessments and audits</li>
                <li>Employee training on privacy and security</li>
                <li>Incident response procedures</li>
              </Text>
            </Box>

            <Box>
              <Title order={2}>7. SHARING YOUR INFORMATION</Title>
              <Text mt="md">
                We do not sell your personal information or PHI. We may share your information in limited circumstances:
              </Text>
              <Text mt="md" component="ul" style={{ paddingLeft: '20px' }}>
                <li>With your consent or at your direction</li>
                <li>With our service providers who assist in providing the Services</li>
                <li>As required by law or to protect rights and safety</li>
                <li>In connection with a business transaction (e.g., merger or acquisition)</li>
              </Text>
            </Box>

            <Box>
              <Title order={2}>8. YOUR RIGHTS AND CHOICES</Title>
              <Text mt="md">
                Depending on your location, you may have certain rights regarding your information:
              </Text>
              <Text mt="md" component="ul" style={{ paddingLeft: '20px' }}>
                <li>Access and obtain a copy of your information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Restrict or object to certain processing</li>
                <li>Data portability</li>
              </Text>
            </Box>

            <Box>
              <Title order={2}>9. CHANGES TO THIS PRIVACY POLICY</Title>
              <Text mt="md">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated Privacy Policy on our website and, where required by law, seeking your consent.
              </Text>
            </Box>

            <Box>
              <Title order={2}>10. CONTACT US</Title>
              <Text mt="md">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
              </Text>
              <Text mt="md">
                Progress Notes
                <br />
                A digital product of Somatopia, LLC
                <br />
                1 H St #203
                <br />
                San Rafael, CA 94901
                <br />
                Email: privacy@progressnotes.com
              </Text>
            </Box>

            <Box ta="center">
              <Text size="lg">Effective Date: {currentDate}</Text>
            </Box>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy; 