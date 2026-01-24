import { createContext, useEffect, useState, ReactNode } from 'react';
import { createContextualCan } from '@casl/react';
import { AppAbility, defineAbilitiesFor } from '@/lib/abilities';
import { supabase } from '@/integrations/supabase/client';

export const AbilityContext = createContext<AppAbility | undefined>(undefined);
export const Can = createContextualCan(AbilityContext.Consumer);

interface AbilityProviderProps {
  children: ReactNode;
}

export const AbilityProvider = ({ children }: AbilityProviderProps) => {
  const [ability, setAbility] = useState<AppAbility>(() => defineAbilitiesFor('user'));

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setAbility(defineAbilitiesFor('user'));
          return;
        }

        const { data: userRoles, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        // maybeSingle returns null without error if no row exists
        // Only log actual errors, not "no rows found" which is expected for regular users
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user role:', error);
        }
        
        // Default to 'user' role if no role found (expected for non-admin users)
        setAbility(defineAbilitiesFor(userRoles?.role || 'user'));

        setAbility(defineAbilitiesFor(userRoles?.role || 'user'));
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setAbility(defineAbilitiesFor('user'));
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
};
