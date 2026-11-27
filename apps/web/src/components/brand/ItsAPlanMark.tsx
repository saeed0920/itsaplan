import Image from 'next/image';

export default function ItsAPlanMark({ className }: { className?: string }) {
  return <Image src="/icon.svg" alt="" width={32} height={32} className={className} unoptimized />;
}
