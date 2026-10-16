import { describe, expect, it } from 'vitest';
import { googleLibraryOptions, libraryReturnPath } from '@/lib/library-login';

describe('library Google login', () => {
  it('always requests selection of the Google account', () => {
    expect(googleLibraryOptions('https://notes-ncert.lovable.app').extraParams.prompt).toBe('select_account');
  });
  it('returns through a public callback before opening the library', () => {
    expect(googleLibraryOptions('https://notes-ncert.lovable.app').redirect_uri).toBe('https://notes-ncert.lovable.app/auth/callback');
  });
  it('preserves history and rejects outside destinations', () => {
    expect(libraryReturnPath('/history')).toBe('/history');
    expect(libraryReturnPath('https://example.com')).toBe('/upload');
    expect(libraryReturnPath('//example.com')).toBe('/upload');
  });
});