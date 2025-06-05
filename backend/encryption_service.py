"""
Server-side encryption service for handling encrypted API keys
Provides secure storage and retrieval of user API keys
"""

import os
import base64
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

@dataclass
class EncryptedKeyData:
    """Structure for encrypted key storage"""
    key_id: str
    encrypted_data: str
    salt: str
    user_id: str
    created_at: str
    last_used: str

class ServerSideEncryption:
    """
    Server-side encryption service for API keys
    Uses Fernet (AES 128 in CBC mode) for symmetric encryption
    """
    
    def __init__(self):
        # Get master encryption key from environment
        # In production, this should come from a key management service
        self.master_key = self._get_or_create_master_key()
        self.cipher = Fernet(self.master_key)
        
        # In-memory cache for performance (would be database in production)
        self.encrypted_key_cache: Dict[str, EncryptedKeyData] = {}
        
        logging.info("🔐 Server-side encryption service initialized")
    
    def _get_or_create_master_key(self) -> bytes:
        """Get master encryption key from environment or generate new one"""
        master_key_b64 = os.getenv('MASTER_ENCRYPTION_KEY')
        
        if master_key_b64:
            try:
                # The key should already be base64 encoded Fernet key
                if isinstance(master_key_b64, str):
                    return master_key_b64.encode()
                return master_key_b64
            except Exception as e:
                logging.warning(f"Invalid master key in environment: {e}")
        
        # Generate new master key (should be persisted in production)
        new_key = Fernet.generate_key()
        logging.warning("🚨 Generated new master encryption key - ensure this is persisted!")
        logging.warning(f"Set MASTER_ENCRYPTION_KEY={new_key.decode()}")
        
        return new_key
    
    def store_encrypted_api_key(
        self, 
        user_id: str, 
        key_id: str, 
        encrypted_data: str, 
        salt: str
    ) -> bool:
        """
        Store encrypted API key from frontend
        
        Args:
            user_id: User identifier
            key_id: Unique key identifier from frontend
            encrypted_data: Already encrypted data from client
            salt: Salt used for client-side encryption
        
        Returns:
            True if stored successfully
        """
        try:
            from datetime import datetime
            
            # Double-encrypt: Client encryption + Server encryption
            # This provides defense in depth
            server_encrypted = self.cipher.encrypt(encrypted_data.encode())
            
            key_data = EncryptedKeyData(
                key_id=key_id,
                encrypted_data=base64.urlsafe_b64encode(server_encrypted).decode(),
                salt=salt,
                user_id=user_id,
                created_at=datetime.utcnow().isoformat(),
                last_used=datetime.utcnow().isoformat()
            )
            
            # Store in cache (would be database in production)
            cache_key = f"{user_id}:{key_id}"
            self.encrypted_key_cache[cache_key] = key_data
            
            # Store in environment variable (encrypted)
            env_key = f"COMPOSIO_KEY_{user_id}_{key_id}"
            os.environ[env_key] = key_data.encrypted_data
            
            logging.info(f"✅ Stored encrypted API key for user {user_id} with key_id {key_id}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Failed to store encrypted key for user {user_id}: {e}")
            return False
    
    def retrieve_encrypted_api_key(self, user_id: str, key_id: str) -> Optional[str]:
        """
        Retrieve and decrypt API key for server use
        
        Args:
            user_id: User identifier
            key_id: Key identifier
        
        Returns:
            Client-encrypted data that needs client-side decryption
        """
        try:
            cache_key = f"{user_id}:{key_id}"
            
            # Try cache first
            if cache_key in self.encrypted_key_cache:
                key_data = self.encrypted_key_cache[cache_key]
            else:
                # Try environment variable
                env_key = f"COMPOSIO_KEY_{user_id}_{key_id}"
                encrypted_data = os.getenv(env_key)
                
                if not encrypted_data:
                    logging.warning(f"No encrypted key found for user {user_id}, key_id {key_id}")
                    return None
                
                # Create minimal key data structure
                key_data = EncryptedKeyData(
                    key_id=key_id,
                    encrypted_data=encrypted_data,
                    salt="",  # Not stored in env
                    user_id=user_id,
                    created_at="",
                    last_used=""
                )
            
            # Decrypt server-side encryption layer
            server_encrypted = base64.urlsafe_b64decode(key_data.encrypted_data.encode())
            client_encrypted = self.cipher.decrypt(server_encrypted).decode()
            
            logging.info(f"✅ Retrieved encrypted key for user {user_id}")
            return client_encrypted
            
        except Exception as e:
            logging.error(f"❌ Failed to retrieve key for user {user_id}: {e}")
            return None
    
    def create_user_session(self, user_id: str, client_encrypted_key: str) -> Optional[str]:
        """
        Create a temporary session for API key usage
        
        Args:
            user_id: User identifier  
            client_encrypted_key: Client-encrypted API key
        
        Returns:
            Session token for temporary use
        """
        try:
            import secrets
            from datetime import datetime, timedelta
            
            # Generate session token
            session_token = f"session_{secrets.token_urlsafe(32)}"
            
            # Store in memory with expiration (1 hour)
            session_data = {
                'user_id': user_id,
                'encrypted_key': client_encrypted_key,
                'expires_at': datetime.utcnow() + timedelta(hours=1),
                'created_at': datetime.utcnow()
            }
            
            # Store in environment (would be Redis in production)
            session_key = f"SESSION_{session_token}"
            os.environ[session_key] = str(session_data)
            
            logging.info(f"✅ Created session {session_token} for user {user_id}")
            return session_token
            
        except Exception as e:
            logging.error(f"❌ Failed to create session for user {user_id}: {e}")
            return None
    
    def validate_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """
        Validate session token and return user context
        
        Args:
            session_token: Session token to validate
        
        Returns:
            Session data if valid, None if expired/invalid
        """
        try:
            from datetime import datetime
            
            session_key = f"SESSION_{session_token}"
            session_data_str = os.getenv(session_key)
            
            if not session_data_str:
                return None
            
            # Parse session data (would be proper serialization in production)
            session_data = eval(session_data_str)  # UNSAFE - use JSON in production
            
            # Check expiration
            expires_at = session_data['expires_at']
            if datetime.utcnow() > expires_at:
                # Cleanup expired session
                del os.environ[session_key]
                return None
            
            return session_data
            
        except Exception as e:
            logging.error(f"❌ Session validation failed: {e}")
            return None
    
    def cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        try:
            from datetime import datetime
            
            expired_keys = []
            
            for env_key in list(os.environ.keys()):
                if env_key.startswith('SESSION_'):
                    try:
                        session_data = eval(os.environ[env_key])
                        if datetime.utcnow() > session_data['expires_at']:
                            expired_keys.append(env_key)
                    except:
                        expired_keys.append(env_key)  # Invalid session data
            
            for key in expired_keys:
                del os.environ[key]
            
            if expired_keys:
                logging.info(f"🧹 Cleaned up {len(expired_keys)} expired sessions")
                
        except Exception as e:
            logging.error(f"❌ Session cleanup failed: {e}")
    
    def get_encryption_stats(self) -> Dict[str, Any]:
        """Get encryption service statistics"""
        try:
            active_keys = len([k for k in os.environ.keys() if k.startswith('COMPOSIO_KEY_')])
            active_sessions = len([k for k in os.environ.keys() if k.startswith('SESSION_')])
            
            return {
                'service_status': 'active',
                'master_key_configured': bool(os.getenv('MASTER_ENCRYPTION_KEY')),
                'active_encrypted_keys': active_keys,
                'active_sessions': active_sessions,
                'cache_size': len(self.encrypted_key_cache),
                'encryption_algorithm': 'Fernet (AES-128-CBC)',
                'key_derivation': 'PBKDF2-SHA256'
            }
            
        except Exception as e:
            logging.error(f"❌ Failed to get encryption stats: {e}")
            return {'service_status': 'error', 'error': str(e)}

# Global encryption service instance (initialize when needed)
encryption_service = None

def get_encryption_service():
    """Get or create global encryption service instance"""
    global encryption_service
    if encryption_service is None:
        encryption_service = ServerSideEncryption()
    return encryption_service

# Example usage functions
async def secure_api_key_flow_example():
    """Example of complete secure API key flow"""
    
    # 1. Frontend encrypts API key with user password
    print("1. 🔐 Frontend: User enters API key + password")
    user_password = "user_secret_password_123"
    api_key = "comp_1234567890abcdef"  # Real Composio API key
    
    # Frontend would call: ClientSideEncryption.encryptApiKey(api_key, user_password)
    # Result: { encryptedData: "gAAAAABh...", keyId: "key_abc123", salt: "def456" }
    
    # 2. Server stores double-encrypted key
    print("2. 🏠 Backend: Store double-encrypted key")
    user_id = "user_123" 
    key_id = "key_abc123"
    client_encrypted = "gAAAAABh7x8y9z..."  # From frontend
    salt = "def456"
    
    success = encryption_service.store_encrypted_api_key(
        user_id=user_id,
        key_id=key_id, 
        encrypted_data=client_encrypted,
        salt=salt
    )
    print(f"   Storage result: {success}")
    
    # 3. Create session for API usage
    print("3. 🎫 Backend: Create temporary session")
    session_token = encryption_service.create_user_session(user_id, client_encrypted)
    print(f"   Session token: {session_token}")
    
    # 4. Validate session for API calls
    print("4. ✅ Backend: Validate session for API call")
    session_data = encryption_service.validate_session(session_token)
    print(f"   Session valid: {session_data is not None}")
    
    # 5. Get encryption stats
    print("5. 📊 Backend: Encryption service stats")
    stats = encryption_service.get_encryption_stats()
    print(f"   Stats: {stats}")

if __name__ == "__main__":
    import asyncio
    
    logging.basicConfig(level=logging.INFO)
    print("🧪 Testing Server-Side Encryption Service")
    
    asyncio.run(secure_api_key_flow_example()) 