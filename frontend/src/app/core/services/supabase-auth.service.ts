import { Injectable, signal } from '@angular/core';
import { createClient, type AuthResponse, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private readonly client: SupabaseClient | null =
    environment.supabaseUrl && environment.supabasePublishableKey
      ? createClient(environment.supabaseUrl, environment.supabasePublishableKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
          },
        })
      : null;

  readonly accessToken = signal<string | null>(null);
  readonly user = signal<User | null>(null);

  constructor() {
    if (!this.client) return;
    this.client.auth.onAuthStateChange((_event, session) => this.applySession(session));
    void this.client.auth.getSession().then(({ data, error }) => {
      if (!error) this.applySession(data.session);
    });
  }

  private applySession(session: Session | null): void {
    this.accessToken.set(session?.access_token ?? null);
    this.user.set(session?.user ?? null);
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  signInWithPassword(email: string, password: string): Promise<AuthResponse> {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  }

  signUp(email: string, password: string, name: string): Promise<AuthResponse> {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  signInWithGoogle(redirectTo: string) {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }

  signInWithOtp(email: string, shouldCreateUser = false) {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser },
    });
  }

  signInWithMagicLink(email: string, redirectTo: string, shouldCreateUser = false) {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser, emailRedirectTo: redirectTo },
    });
  }

  verifyEmailOtp(email: string, token: string): Promise<AuthResponse> {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: 'email' });
  }

  getSession(): Promise<{ data: { session: Session | null }; error: Error | null }> {
    if (!this.client) return Promise.resolve({ data: { session: null }, error: null });
    return this.client.auth.getSession();
  }

  signOut(): Promise<{ error: Error | null }> {
    if (!this.client) return Promise.resolve({ error: null });
    return this.client.auth.signOut();
  }
}
