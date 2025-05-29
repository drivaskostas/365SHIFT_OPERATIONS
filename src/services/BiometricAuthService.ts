
import { supabase } from '@/lib/supabase';

export interface BiometricCredential {
  id: string;
  publicKey: string;
  counter: number;
}

export class BiometricAuthService {
  private static readonly RP_NAME = 'Sentinel Guard';
  private static readonly RP_ID = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

  static async isSupported(): Promise<boolean> {
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        console.log('WebAuthn not supported');
        return false;
      }

      // Check if platform authenticator is available (Touch ID/Face ID)
      if (!window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        console.log('Platform authenticator check not available');
        return false;
      }

      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('Platform authenticator available:', available);
      return available;
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return false;
    }
  }

  static async hasBiometricCredentials(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_biometric_credentials')
        .select('id')
        .eq('user_id', userId)
        .eq('active', true)
        .limit(1);

      if (error) {
        console.error('Database error checking credentials:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking biometric credentials:', error);
      return false;
    }
  }

  static async registerBiometric(userId: string, userEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Starting biometric registration for user:', userId);
      
      if (!await this.isSupported()) {
        return { success: false, error: 'Biometric authentication is not supported on this device' };
      }

      // Generate a proper challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      console.log('Generated challenge');

      // Get existing credentials to exclude them
      const { data: existingCreds } = await supabase
        .from('user_biometric_credentials')
        .select('credential_id')
        .eq('user_id', userId)
        .eq('active', true);

      const excludeCredentials = existingCreds?.map(cred => ({
        id: new TextEncoder().encode(cred.credential_id),
        type: 'public-key' as const,
        transports: ['internal'] as AuthenticatorTransport[]
      })) || [];

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
          excludeCredentials,
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: 'none', // Changed from 'direct' to 'none' for better iOS compatibility
        },
      };

      console.log('Creating credential with options:', credentialCreationOptions);

      // Create credential
      const credential = await navigator.credentials.create(credentialCreationOptions) as PublicKeyCredential;
      
      if (!credential) {
        return { success: false, error: 'Failed to create biometric credential' };
      }

      console.log('Credential created successfully:', credential.id);

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;
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

      console.log('Biometric credential stored successfully');
      return { success: true };
    } catch (error) {
      console.error('Biometric registration error:', error);
      if (error instanceof Error && error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric authentication was cancelled or not allowed' };
      }
      if (error instanceof Error && error.name === 'InvalidStateError') {
        return { success: false, error: 'A biometric credential already exists for this account' };
      }
      return { success: false, error: 'Failed to register biometric authentication' };
    }
  }

  static async authenticateWithBiometric(userEmail: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      console.log('Starting biometric authentication for:', userEmail);
      
      if (!await this.isSupported()) {
        return { success: false, error: 'Biometric authentication is not supported on this device' };
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (profileError || !profileData) {
        console.error('Profile lookup error:', profileError);
        return { success: false, error: 'User not found' };
      }

      const userId = profileData.id;
      console.log('Found user ID:', userId);

      // Get user's biometric credentials
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
        return { success: false, error: 'No biometric credentials found. Please set up biometric authentication first.' };
      }

      console.log('Found credentials:', credentials.length);

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

      console.log('Requesting biometric authentication...');

      // Get assertion
      const assertion = await navigator.credentials.get(credentialRequestOptions) as PublicKeyCredential;
      
      if (!assertion) {
        return { success: false, error: 'Biometric authentication failed' };
      }

      console.log('Biometric authentication successful:', assertion.id);

      // Find matching credential
      const matchingCredential = credentials.find(cred => 
        cred.credential_id === assertion.id
      );

      if (!matchingCredential) {
        return { success: false, error: 'Invalid credential' };
      }

      // Update counter and last used
      await supabase
        .from('user_biometric_credentials')
        .update({ 
          counter: (matchingCredential.counter || 0) + 1,
          last_used: new Date().toISOString()
        })
        .eq('credential_id', assertion.id);

      console.log('Biometric authentication completed successfully');
      return { success: true, userId: matchingCredential.user_id };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      if (error instanceof Error && error.name === 'NotAllowedError') {
        return { success: false, error: 'Biometric authentication was cancelled' };
      }
      if (error instanceof Error && error.name === 'SecurityError') {
        return { success: false, error: 'Security error during biometric authentication' };
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
