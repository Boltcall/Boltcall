import { BoltcallLoader } from '../components/ui/boltcall-loader';

export default function LoadingDemo() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#050507]">
      <BoltcallLoader className="size-24 text-white" />
    </div>
  );
}
