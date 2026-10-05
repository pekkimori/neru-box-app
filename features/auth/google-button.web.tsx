import { useEffect, useRef } from 'react';
import type { GoogleButtonProps } from './google-button';
import { errorMessage } from '@/lib/api/client';

type GoogleIdentity = {
  initialize(options: { client_id: string; callback: (response: { credential: string }) => void; auto_select: boolean }): void;
  renderButton(element: HTMLElement, options: { theme: string; size: string; text: string }): void;
};
let sdk: Promise<GoogleIdentity> | null = null;
function loadGoogle(): Promise<GoogleIdentity> {
  if (sdk) return sdk;
  sdk = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => fail(), 15_000);
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error('Google sign-in could not load. Retry or use your email.'));
    };
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      const identity = (window as Window & { google?: { accounts: { id: GoogleIdentity } } }).google?.accounts.id;
      if (identity) resolve(identity);
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  void sdk.catch(() => { sdk = null; });
  return sdk;
}

export function GoogleButton(props: GoogleButtonProps) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  useEffect(() => {
    if (!clientId) return;
    let active = true;
    void loadGoogle().then(identity => {
      if (!active || !container.current) return;
      identity.initialize({
        client_id: clientId,
        auto_select: false,
        callback: response => {
          if (!active || latest.current.busy) return;
          latest.current.onBusy(true);
          latest.current.onError(null);
          void latest.current.onToken(response.credential)
            .catch(error => { if (active) latest.current.onError(errorMessage(error)); })
            .finally(() => { if (active) latest.current.onBusy(false); });
        },
      });
      identity.renderButton(container.current, { theme: 'outline', size: 'large', text: 'continue_with' });
    }).catch(error => { if (active) latest.current.onError(errorMessage(error)); });
    return () => { active = false; };
  }, [clientId]);
  if (!clientId) return null;
  return <div ref={container} aria-disabled={props.busy} inert={props.busy}
    style={{ marginTop: 16, minHeight: 44, pointerEvents: props.busy ? 'none' : 'auto', opacity: props.busy ? 0.6 : 1 }} />;
}
