export function libraryReturnPath(value: unknown): '/upload' | '/history' | '/workspace' {
  if (value === '/workspace') return '/workspace';
  return value === '/history' ? '/history' : '/upload';
}

export function googleLibraryOptions(origin: string) {
  return { redirect_uri: `${origin}/auth/callback`, extraParams: { prompt: 'select_account' } };
}
