
export interface BiometricCredential {
  id: string;
  publicKey: string;
  counter: number;
}

export class BiometricAuthService {
  static async isSupported(): Promise<boolean> {
    return false;
  }

  static async hasBiometricCredentials(userId: string): Promise<boolean> {
    return false;
  }

  static async registerBiometric(userId: string, userEmail: string): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Biometric authentication is not available' };
  }

  static async authenticateWithBiometric(userEmail: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    return { success: false, error: 'Biometric authentication is not available' };
  }

  static async removeBiometric(userId: string): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Biometric authentication is not available' };
  }
}
