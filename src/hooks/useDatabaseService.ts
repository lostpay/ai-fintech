import { useMemo } from 'react';
import { DatabaseService } from '../services/DatabaseService';
import { SupabaseService } from '../services/SupabaseService';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to get database service instance tied to the authenticated user
 * Returns DatabaseService if user is authenticated, throws error otherwise
 */
export const useDatabaseService = (): DatabaseService => {
  const { user } = useAuth();

  const databaseService = useMemo(() => {
    if (!user) {
      throw new Error('useDatabaseService requires an authenticated user');
    }
    return new DatabaseService(user.id);
  }, [user]);

  return databaseService;
};

/**
 * Hook to get Supabase service instance tied to the authenticated user
 * Returns SupabaseService if user is authenticated, throws error otherwise
 */
export const useSupabaseService = (): SupabaseService => {
  const { user } = useAuth();

  const supabaseService = useMemo(() => {
    if (!user) {
      throw new Error('useSupabaseService requires an authenticated user');
    }
    return new SupabaseService(user.id);
  }, [user]);

  return supabaseService;
};
