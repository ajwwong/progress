import { Button } from '@mantine/core';
import { useEffect } from 'react';

export interface GoogleCredentialResponse {
  clientId: string;
  credential: string;
  select_by: string;
}

interface GoogleButtonProps {
  googleClientId: string;
  handleGoogleCredential: (response: GoogleCredentialResponse) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

export function GoogleButton(props: GoogleButtonProps): JSX.Element {
  useEffect(() => {
    // Load the Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: props.googleClientId,
        callback: props.handleGoogleCredential,
      });

      const buttonDiv = document.getElementById('googleButton');
      if (buttonDiv) {
        window.google?.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signup_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, [props.googleClientId]);

  return <div id="googleButton"></div>;
}
