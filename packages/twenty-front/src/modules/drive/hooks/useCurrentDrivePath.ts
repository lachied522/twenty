import { useSearchParams } from 'react-router-dom';

export const useCurrentDrivePath = () => {
  const [searchParams] = useSearchParams();

  return searchParams.get('path') ?? '';
};
