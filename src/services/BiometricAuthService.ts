
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

  static async hasBiometricCredentials(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_biometric_credentials')
        .select('id')
        .eq('user_id', userId)
        .eq('active', true)
        .limit(1);

      return !error && data && data.length > 0;
    } catch (error) {
      console.error('Error checking biometric credentials:', error);
      return false;
    }
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

      // Properly cast the response to get access to getPublicKey method
      const attestationResponse = credential.response as AuthenticatorAttestationResponse;
      
      // Get the public key using the getPublicKey method
      const publicKeyBuffer = attestationResponse.getPublicKey();
      
      if (!publicKeyBuffer) {
        return { success: false, error: 'Failed to retrieve public key from credential' };
      }

      // Store credential in Supabase
      const { error } = await supabase
        .from('user_biometric_credentials')
        .insert({
          user_id: userId,
          credential_id: credential.id,
          public_key: btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer))),
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
      if (error instanceof Error && error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric authentication was cancelled or not allowed' };
      }
      return { success: false, error: 'Failed to register biometric authentication' };
    }
  }

  static async authenticateWithBiometric(userEmail: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      if (!await this.isSupported()) {
        return { success: false, error: 'Biometric authentication is not supported on this device' };
      }

      // First get the user ID from profiles table using email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (profileError || !profileData) {
        console.error('Profile lookup error:', profileError);
        return { success: false, error: 'User not found. Please sign in with password first to set up biometric authentication.' };
      }

      const userId = profileData.id;

      // Now get user's biometric credentials
      const { data: credentials, error: fetchError } = await supabase
        .from('user_biometric_credentials')
        .select('credential_id, user_id, public_key, counter')
        .eq('user_id', userId)
        .eq('active', true);

      if (fetchError) {
        console.error('Database error checking credentials:', fetchError);
        return { success: false, error: 'Unable to check biometric credentials' };
      }

      if (!credentials || credentials.length === 0) {
        return { success: false, error: 'No biometric credentials found for this user. Please set up biometric authentication first by signing in with your password and enabling it in Settings.' };
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
      if (error instanceof Error && error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric authentication was cancelled or not allowed' };
      }
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
