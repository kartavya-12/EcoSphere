import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../context/AuthContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialized = false;

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Prevent redundant initial fetches if multiple events fire
      if (event === 'INITIAL_SESSION' && initialized) return;
      if (event === 'INITIAL_SESSION') initialized = true;

      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await fetchProfile(user);
        } else {
          setUser(null);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Safety fallback: if loading takes more than 5s, forced exit
    const timer = setTimeout(() => setLoading(false), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function fetchProfile(authUser) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      let profileData = data;
      
      // If no profile exists, automatically construct and inject one to satisfy database constraints
      if (error && error.code === 'PGRST116') {
        const newProfile = {
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email.split('@')[0] || 'User',
          role: authUser.user_metadata?.role || 'community',
          trees_planted: 0,
          cleanup_drives: 0,
          rank: 'Eco-Warrior'
        };
        const { error: insertErr } = await supabase.from('profiles').insert([newProfile]);
        if (insertErr && insertErr.code !== '23505') { // Ignore duplicate key errors from concurrent runs
           console.error("Failed to inject missing profile. Stale session?", insertErr);
           await supabase.auth.signOut();
           setUser(null);
           setLoading(false);
           return;
        }
        profileData = newProfile;
      } else if (error) {
        throw error;
      }

      setUser({
        id: authUser.id,
        email: authUser.email,
        name: profileData?.name || authUser.user_metadata?.name || 'User',
        role: profileData?.role || authUser.user_metadata?.role || 'community',
        trees_planted: profileData?.trees_planted || 0,
        cleanup_drives: profileData?.cleanup_drives || 0,
        rank: profileData?.rank || 'Eco-Warrior',
      });
    } catch (err) {
      console.error('Auth Profile Fetch Error:', err);
      // Stale or corrupted session, better to clear it to avoid FK errors downstream
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    // onAuthStateChange handles fetchProfile automatically via SIGNED_IN event
    // returning user just to fulfill promise chain before redirect
    return data.user;
  }

  async function signup({ name, org_name, department, role, email, password }) {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });
    
    if (error) {
      setLoading(false);
      throw error;
    }

    // Create profile entry
    if (data.user) {
      const { error: insertError } = await supabase.from('profiles').insert([
        { id: data.user.id, name, org_name, department, role }
      ]);
      if (insertError && insertError.code !== '23505') {
        console.error("Signup profile insert error:", insertError);
      }
      // onAuthStateChange handles fetchProfile
    } else {
      setLoading(false);
    }
    
    return data.user;
  }

  async function verifyOTP(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) throw error;
    return data.user;
  }

  async function resendOTP(email) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
  }

  async function googleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard',
      },
    });
    if (error) throw error;
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, verifyOTP, resendOTP, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
