import React from 'react';
/** Local test identities use Firebase Auth Emulator and the same API authorization. */
export const StagingLogin:React.FC=()=>import.meta.env.DEV&&import.meta.env.VITE_FIREBASE_AUTH_EMULATOR?<p role="note" className="mt-4 text-sm">Local Firebase Auth Emulator is enabled. Use Google sign-in with a provisioned test identity.</p>:null;
