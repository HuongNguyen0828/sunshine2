import SunshineLogo from '@/public/logo.svg';
import Image from 'next/image';


export default function AppHeader() {
  return (
    <header>
      <Image src={SunshineLogo} alt="Sunshine Daycare" width={100} height={100} /> 
    </header>
  );
}