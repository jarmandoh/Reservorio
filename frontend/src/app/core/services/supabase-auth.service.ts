import { Injectable, signal } from '@angular/core';
import {
  createClient,
  type AuthResponse,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';
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

    void this.client.auth.getSession().then(({ data }) => {
      this.accessToken.set(data.session?.access_token ?? null);
      this.user.set(data.session?.user ?? null);
    });

    this.client.auth.onAuthStateChange((_event, session) => {
      this.accessToken.set(session?.access_token ?? null);
      this.user.set(session?.user ?? null);
    });
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  signInWithPassword(email: string, password: string): Promise<AuthResponse> {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.signInWithPassword({ email, password });
  }

  signUp(email: string, password: string, name: string): Promise<AuthResponse> {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
  }

  signInWithGoogle(redirectTo: string): Promise<{ data: { provider: string; url: string | null }; error: Error | null }> {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }

  signInWithOtp(email: string, redirectTo?: string): Promise<{ data: { user: User | null; session: Session | null }; error: Error | null }> {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
      },
    });
  }

  verifyEmailOtp(email: string, token: string): Promise<AuthResponse> {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.verifyOtp({ email, token, type: 'email' });
  }

  signInWithMagicLink(email: string, redirectTo: string): Promise<{ data: { user: User | null; session: Session | null }; error: Error | null }> {
    if (!this.client) return Promise.reject(new Error('Supabase Auth no está configurado'));
    return this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    });
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
