// WebAuthn API integration for real biometric authentication
export interface BiometricCredential {
  id: string;
  rawId: ArrayBuffer;
  type: 'public-key';
  response: {
    clientDataJSON: ArrayBuffer;
    attestationObject?: ArrayBuffer;
    authenticatorData?: ArrayBuffer;
    signature?: ArrayBuffer;
  };
}

export class BiometricAuth {
  private static instance: BiometricAuth;
  
  static getInstance(): BiometricAuth {
    if (!BiometricAuth.instance) {
      BiometricAuth.instance = new BiometricAuth();
    }
    return BiometricAuth.instance;
  }

  // Check if biometric authentication is supported
  isSupported(): boolean {
    return !!(navigator.credentials && window.PublicKeyCredential);
  }

  // Check if platform authenticator (built-in biometrics) is available
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      console.warn('Error checking platform authenticator:', error);
      return false;
    }
  }

  // Generate a unique challenge for authentication
  private generateChallenge(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  // Convert ArrayBuffer to base64url string
  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // Convert base64url string to ArrayBuffer
  private base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd((base64.length + 3) & ~3, '=');
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  // Enroll a new biometric credential for a user
  async enrollBiometric(userId: string, userName: string): Promise<{ credentialId: string; publicKey: string }> {
    if (!await this.isPlatformAuthenticatorAvailable()) {
      throw new Error('Biometric authentication is not available on this device');
    }

    const challenge = this.generateChallenge();
    
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "ChurchConnect",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: "direct",
    };

    try {
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create biometric credential');
      }

      const credentialId = this.arrayBufferToBase64Url(credential.rawId);
      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKey = this.arrayBufferToBase64Url(response.getPublicKey()!);

      return {
        credentialId,
        publicKey,
      };
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Biometric enrollment was cancelled or not allowed');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Biometric authentication is not supported on this device');
      } else {
        throw new Error(`Biometric enrollment failed: ${error.message}`);
      }
    }
  }

  // Authenticate using existing biometric credential
  async authenticateBiometric(credentialId: string): Promise<{ success: boolean; signature: string }> {
    if (!await this.isPlatformAuthenticatorAvailable()) {
      throw new Error('Biometric authentication is not available on this device');
    }

    const challenge = this.generateChallenge();
    
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [{
        id: this.base64UrlToArrayBuffer(credentialId),
        type: 'public-key',
        transports: ['internal'],
      }],
      userVerification: 'required',
      timeout: 60000,
    };

    try {
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Biometric authentication failed');
      }

      const response = assertion.response as AuthenticatorAssertionResponse;
      const signature = this.arrayBufferToBase64Url(response.signature);

      return {
        success: true,
        signature,
      };
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Biometric authentication was cancelled or not allowed');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('No matching biometric credential found');
      } else {
        throw new Error(`Biometric authentication failed: ${error.message}`);
      }
    }
  }

  // Check if user has enrolled biometric credential
  async hasEnrolledCredential(credentialId: string): Promise<boolean> {
    try {
      await this.authenticateBiometric(credentialId);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get available biometric types on the device
  async getAvailableBiometricTypes(): Promise<string[]> {
    const types: string[] = [];
    
    if (!this.isSupported()) {
      return types;
    }

    // Check if platform authenticator is available (fingerprint, face, etc.)
    if (await this.isPlatformAuthenticatorAvailable()) {
      // We can't determine the exact type, but we know platform auth is available
      types.push('platform-biometric');
    }

    return types;
  }
}

export const biometricAuth = BiometricAuth.getInstance();