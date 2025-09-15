import { NextRequest } from 'next/server';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'approved' | 'rejected';
  memberId: string;
  exp: number;
  iat: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Base64 URL encode/decode functions for Edge Runtime
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  // Add padding if needed
  str += '='.repeat((4 - str.length % 4) % 4);
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  return atob(str);
}

// Simple HMAC-SHA256 using Web Crypto API
async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Create a simple JWT-like token
export async function createToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + (7 * 24 * 60 * 60), // 7 days
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSha256(message, JWT_SECRET);
  const encodedSignature = base64UrlEncode(signature);
  
  return `${message}.${encodedSignature}`;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    // Verify signature
    const message = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = await hmacSha256(message, JWT_SECRET);
    const providedSignature = base64UrlDecode(encodedSignature);
    
    // Convert hex to string for comparison
    const expectedHex = expectedSignature;
    const providedHex = Array.from(new TextEncoder().encode(providedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (expectedHex !== providedHex) {
      // Simple string comparison as fallback
      const decodedSig = base64UrlDecode(encodedSignature);
      if (decodedSig !== expectedSignature) {
        return null;
      }
    }

    // Decode payload
    const payloadJson = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadJson) as JWTPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Extract token from request
export function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const token = request.cookies.get('auth-token')?.value;
  return token || null;
}
