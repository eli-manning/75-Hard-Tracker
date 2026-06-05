import { useRef, useState, useCallback } from 'react';
// import { useEffect } from 'react';
// import { Platform } from 'react-native';
// import * as Google from 'expo-auth-session/providers/google';
// import * as WebBrowser from 'expo-web-browser';
import { signInWithGoogle } from '../lib/auth';

// WebBrowser.maybeCompleteAuthSession();

type GoogleResult = { isNewUser: boolean } | { error: string };

export function useGoogleAuth(onResult: (result: GoogleResult) => void) {
  const [loading, setLoading] = useState(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // ── Native path (expo-auth-session) — re-enable after project migration ──
  // const [, response, promptAsync] = Google.useAuthRequest({
  //   iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  //   androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  //   webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  // });
  //
  // useEffect(() => {
  //   if (Platform.OS === 'web' || !response) return;
  //   if (response.type === 'success') {
  //     const idToken = response.params.id_token;
  //     if (!idToken) {
  //       onResultRef.current({ error: 'Google sign-in failed. Try again.' });
  //       setLoading(false);
  //       return;
  //     }
  //     signInWithGoogleCredential(idToken)
  //       .then((r) => onResultRef.current(r))
  //       .catch((err: unknown) => {
  //         const code = (err as { code?: string }).code ?? '';
  //         const msg =
  //           code === 'auth/account-exists-with-different-credential'
  //             ? 'This email is registered with a password. Sign in with email instead.'
  //             : 'Google sign-in failed. Try again.';
  //         onResultRef.current({ error: msg });
  //       })
  //       .finally(() => setLoading(false));
  //   } else if (response.type === 'error') {
  //     onResultRef.current({ error: 'Google sign-in failed. Try again.' });
  //     setLoading(false);
  //   } else {
  //     setLoading(false);
  //   }
  // }, [response]);

  const trigger = useCallback(async () => {
    setLoading(true);
    console.log('[GoogleAuth] trigger called');
    try {
      const result = await signInWithGoogle();
      console.log('[GoogleAuth] signInWithGoogle returned', result);
      onResultRef.current(result);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      console.error('[GoogleAuth] trigger caught error, code=', code, err);
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
  }, []);

  return { trigger, loading };
}
