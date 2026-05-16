import { useEffect, useState } from 'react';
import { apiJson } from '../api/http';

type PublicSession = { registration_is_open?: boolean };

export function usePublicRegistrationOpen() {
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);

  useEffect(() => {
    apiJson<{ data: PublicSession[] }>('/api/v1/public/sessions')
      .then((r) => setRegistrationOpen(r.data.some((s) => s.registration_is_open === true)))
      .catch(() => setRegistrationOpen(false));
  }, []);

  return {
    loading: registrationOpen === null,
    registrationOpen: registrationOpen === true,
  };
}
