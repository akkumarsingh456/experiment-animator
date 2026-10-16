export function libraryReturnPath(value: unknown): '/upload' | '/history' {
  return value === '/history' ? '/history' : '/upload';
}

export function googleLibraryOptions(origin: string) {
  return { redirect_uri: `${origin}/auth/callback`, extraParams: { prompt: 'select_account' } };
}