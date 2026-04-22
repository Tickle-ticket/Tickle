import React, { useState } from 'react';
import { Logo } from '@/src/shared/components/Logo';
import { SearchBar } from '@/src/shared/components/SearchBar';
import { Avatar } from '@/src/shared/components/Avatar';
import { useUserProfile } from '@/src/shared/api/useUserProfile';

export const Header = () => {
  const { data, isLoading } = useUserProfile();
  const [searchValue, setSearchValue] = useState('');

  return (
    <header className="sticky top-0 z-50 bg-[#f8f8f8] dark:bg-zinc-950 w-full flex items-center justify-between border-b border-black/10 dark:border-white/10 pt-3 pb-3 mb-6">

      {/* Left: Logo */}
      <div className="flex items-center gap-12">
        <Logo variant="black" size="small" />
      </div>

      {/* Right: SearchBar & Avatar */}
      <div className="flex items-center gap-6">
        <div className="hidden sm:block w-48 focus-within:w-64 transition-all duration-300 ease-out">
          <SearchBar
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onClear={() => setSearchValue('')}
            fullWidth
            size="small"
          />
        </div>
        <Avatar
          size="medium"
          src={data?.avatarUrl || ''}
          isLoading={isLoading}
        />
      </div>

    </header>
  );
};
