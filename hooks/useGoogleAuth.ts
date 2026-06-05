import { useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { exchangeCodeAsync } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { signInWithGoogle, signInWithGoogleCredential } from '../lib/auth';

WebBrowser.maybeCompleteAuthSession();

type GoogleResult = { isNewUser: boolean } | { error: string };

export function useGoogleAuth(onResult: (result: GoogleResult) => void) {
  const [loading, setLoading] = useState(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const [request, , promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  const trigger = useCallback(async () => {
    setLoading(true);

    // ── Native (iOS/Android) ──────────────────────────────────────────────────
    if (Platform.OS !== 'web') {
      try {
        const response = await promptAsync();
        if (response.type === 'success') {
          // Exchange the authorization code for tokens (PKCE, no client secret needed)
          const tokenResponse = await exchangeCodeAsync(
            {
              clientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!,
              code: response.params.code,
              redirectUri: request!.redirectUri,
              extraParams: request?.codeVerifier
                ? { code_verifier: request.codeVerifier }
                : {},
            },
            { tokenEndpoint: 'https://oauth2.googleapis.com/token' }
          );
          const idToken = tokenResponse.idToken;
          if (!idToken) {
            onResultRef.current({ error: 'Google sign-in failed. Try again.' });
            return;
          }
          const result = await signInWithGoogleCredential(idToken);
          onResultRef.current(result);
        } else if (response.type === 'error') {
          onResultRef.current({ error: 'Google sign-in failed. Try again.' });
        }
        // 'dismiss' / 'cancel' — user backed out, do nothing
      } catch (err: unknown) {
        console.error('[GoogleAuth] native error:', err);
        const code = (err as { code?: string }).code ?? '';
        const msg =
          code === 'auth/account-exists-with-different-credential'
            ? 'This email is registered with a password. Sign in with email instead.'
            : 'Google sign-in failed. Try again.';
        onResultRef.current({ error: msg });
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Web — signInWithPopup / signInWithRedirect ─────────────────────────────
    try {
      const result = await signInWithGoogle();
      onResultRef.current(result);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        const msg =
          code === 'auth/account-exists-with-different-credential'
            ? 'This email is registered with a password. Sign in with email instead.'
            : 'Google sign-in failed. Try again.';
        onResultRef.current({ error: msg });
      }
    } finally {
      setLoading(false);
    }
  }, [promptAsync, request]);

  return { trigger, loading };
}
