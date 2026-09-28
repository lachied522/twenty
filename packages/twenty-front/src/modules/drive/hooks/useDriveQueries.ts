import { LIST_DRIVE_ITEMS, LIST_DRIVE_SPACES } from '@/drive/graphql/queries';
import { type DriveItem, type DriveSpace } from '@/drive/types/Drive';
import { useQuery } from '@apollo/client/react';

export const useDriveSpaces = () => {
  const { data, loading, refetch } = useQuery<{
    listDriveSpaces: DriveSpace[];
  }>(LIST_DRIVE_SPACES);

  return {
    spaces: data?.listDriveSpaces ?? [],
    loading,
    refetch,
  };
};

export const useDriveItems = (path: string) => {
  const { data, loading, refetch } = useQuery<{
    listDriveItems: DriveItem[];
  }>(LIST_DRIVE_ITEMS, {
    variables: { path },
    skip: path === '',
  });

  return {
    items: data?.listDriveItems ?? [],
    loading,
    refetch,
  };
};
