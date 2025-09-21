import Image from 'next/image';

export default function AppHeader() {
  return (
    <header>
      <Image src="/logo.svg" alt="Sunshine Daycare" width={100} height={100} />
    </header>
  );
}
