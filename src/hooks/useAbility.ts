import { useContext } from 'react';
import { AbilityContext } from '@/contexts/AbilityContext';
import { AppAbility } from '@/lib/abilities';

export const useAbility = (): AppAbility => {
  const ability = useContext(AbilityContext);
  
  if (!ability) {
    throw new Error('useAbility must be used within AbilityProvider');
  }
  
  return ability;
};
