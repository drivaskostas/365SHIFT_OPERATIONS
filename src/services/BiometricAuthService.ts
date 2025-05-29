
import { supabase } from '@/lib/supabase';

export interface BiometricCredential {
  id: string;
  publicKey: string;
  counter: number;
}

export class BiometricAuthService {
  private static readonly RP_NAME = 'Sentinel Guard';
  private static readonly RP_ID = window.location.hostname;

  static async isSupported(): Promise<boolean> {
    return !!(window.PublicKeyCredential && 
              typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
              await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  }

  static async registerBiometric(userId: string, userEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!await this.isSupported()) {
        return { success: false, error: 'Biometric authentication is not supported on this device' };
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create credential creation options
      const credentialCreationOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: this.RP_NAME,
            id: this.RP_ID,
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: userEmail,
            displayName: userEmail,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: 'direct',
        },
      };

      // Create credential
      const credential = await navigator.credentials.create(credentialCreationOptions) as PublicKeyCredential;
      
      if (!credential) {
        return { success: false, error: 'Failed to create biometric credential' };
      }

      // Properly cast the response to get access to publicKey
      const attestationResponse = credential.response as AuthenticatorAttestationResponse;
      
      if (!attestationResponse.publicKey) {
        return { success: false, error: 'Failed to retrieve public key from credential' };
      }

      // Store credential in Supabase
      const { error } = await supabase
        .from('user_biometric_credentials')
        .insert({
          user_id: userId,
          credential_id: credential.id,
          public_key: btoa(String.fromCharCode(...new Uint8Array(attestationResponse.publicKey))),
          counter: 0,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to store biometric credential:', error);
        return { success: false, error: 'Failed to save biometric credential' };
      }

      return { success: true };
    } catch (error) {
      console.error('Biometric registration error:', error);
      return { success: false, error: 'Failed to register biometric authentication' };
    }
  }

  static async authenticateWithBiometric(userEmail: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      if (!await this.isSupported()) {
        return { success: false, error: 'Biometric authentication is not supported on this device' };
      }

      // Get user's credentials from database
      const { data: credentials, error: fetchError } = await supabase
        .from('user_biometric_credentials')
        .select('credential_id, user_id, public_key, counter')
        .eq('profiles.email', userEmail)
        .eq('active', true);

      if (fetchError || !credentials || credentials.length === 0) {
        return { success: false, error: 'No biometric credentials found for this user' };
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create authentication options
      const credentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          allowCredentials: credentials.map(cred => ({
            id: new TextEncoder().encode(cred.credential_id),
            type: 'public-key',
            transports: ['internal'],
          })),
          userVerification: 'required',
          timeout: 60000,
        },
      };

      // Get assertion
      const assertion = await navigator.credentials.get(credentialRequestOptions) as PublicKeyCredential;
      
      if (!assertion) {
        return { success: false, error: 'Biometric authentication failed' };
      }

      // Find matching credential
      const matchingCredential = credentials.find(cred => 
        cred.credential_id === assertion.id
      );

      if (!matchingCredential) {
        return { success: false, error: 'Invalid credential' };
      }

      // Update counter
      await supabase
        .from('user_biometric_credentials')
        .update({ 
          counter: (matchingCredential.counter || 0) + 1,
          last_used: new Date().toISOString()
        })
        .eq('credential_id', assertion.id);

      return { success: true, userId: matchingCredential.user_id };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { success: false, error: 'Biometric authentication failed' };
    }
  }

  static async removeBiometric(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_biometric_credentials')
        .update({ active: false })
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: 'Failed to remove biometric authentication' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing biometric:', error);
      return { success: false, error: 'Failed to remove biometric authentication' };
    }
  }
}
