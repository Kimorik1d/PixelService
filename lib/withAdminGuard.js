import { useUser } from '../context/UserContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export function withAdminGuard(Component) {
  return function AdminProtectedPage(props) {
    const { user } = useUser();
    const router = useRouter();

    useEffect(() => {
      if (user && user.role !== 'admin') {
        router.replace('/');
      }
    }, [user, router]);

    if (!user || user.role !== 'admin') return null;

    return <Component {...props} />;
  };
}
