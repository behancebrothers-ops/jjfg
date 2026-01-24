import { ReactNode } from 'react';
import { useAbility } from '@/hooks/useAbility';
import { Actions, Subjects } from '@/lib/abilities';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface PermissionGuardProps {
  action: Actions;
  subject: Subjects;
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGuard = ({ 
  action, 
  subject, 
  children, 
  fallback 
}: PermissionGuardProps) => {
  const ability = useAbility();

  if (!ability.can(action, subject)) {
    return fallback || (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to {action} {subject}
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};
