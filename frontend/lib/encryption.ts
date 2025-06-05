/**
 * Client-side encryption for sensitive data like API keys
 * Uses Web Crypto API for secure encryption in the browser
 */

interface EncryptionResult {
  encryptedData: string
  keyId: string
  salt: string
}

interface DecryptionInput {
  encryptedData: string
  salt: string
  masterKey: string
}

class ClientSideEncryption {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256
  private static readonly IV_LENGTH = 12
  private static readonly SALT_LENGTH = 16

  /**
   * Generate a cryptographic key from user password + salt
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000, // High iteration count for security
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt API key with user-specific password
   */
  static async encryptApiKey(apiKey: string, userPassword: string): Promise<EncryptionResult> {
    try {
      // Generate random salt for key derivation
      const salt = window.crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
      
      // Generate random IV for encryption
      const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))
      
      // Derive encryption key from password + salt
      const key = await this.deriveKey(userPassword, salt)
      
      // Encrypt the API key
      const encoder = new TextEncoder()
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        encoder.encode(apiKey)
      )
      
      // Combine IV + encrypted data for storage
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encryptedBuffer), iv.length)
      
      // Create unique key identifier
      const keyId = await this.generateKeyId(userPassword, salt)
      
      return {
        encryptedData: this.arrayBufferToBase64(combined),
        keyId: keyId,
        salt: this.arrayBufferToBase64(salt)
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt API key')
    }
  }

  /**
   * Decrypt API key with user password
   */
  static async decryptApiKey(input: DecryptionInput): Promise<string> {
    try {
      // Decode from base64
      const combined = this.base64ToArrayBuffer(input.encryptedData)
      const salt = this.base64ToArrayBuffer(input.salt)
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH)
      const encryptedData = combined.slice(this.IV_LENGTH)
      
      // Derive decryption key
      const key = await this.deriveKey(input.masterKey, new Uint8Array(salt))
      
      // Decrypt the data
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        encryptedData
      )
      
      // Convert back to string
      const decoder = new TextDecoder()
      return decoder.decode(decryptedBuffer)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt API key - incorrect password or corrupted data')
    }
  }

  /**
   * Generate a unique key identifier for backend reference
   */
  private static async generateKeyId(password: string, salt: Uint8Array): Promise<string> {
    const encoder = new TextEncoder()
    const data = new Uint8Array([...encoder.encode(password), ...salt])
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)
    return 'key_' + this.arrayBufferToBase64(hashArray).substring(0, 16)
  }

  /**
   * Utility: ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  /**
   * Utility: Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Generate a secure random password for the user
   */
  static generateSecurePassword(): string {
    const array = new Uint8Array(32)
    window.crypto.getRandomValues(array)
    return this.arrayBufferToBase64(array)
  }

  /**
   * Validate if browser supports required crypto APIs
   */
  static isSupported(): boolean {
    return !!(
      window.crypto &&
      window.crypto.subtle &&
      window.crypto.getRandomValues
    )
  }
}

export { ClientSideEncryption, type EncryptionResult, type DecryptionInput } 