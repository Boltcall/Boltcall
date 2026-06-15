import { Calendar, Phone, Thermometer } from 'lucide-react';

interface BlogClosingCtaProps {
  title?: string;
  body?: string;
  href?: string;
  label?: string;
}

export default function BlogClosingCta({
  title = 'Recover missed jobs',
  body = 'Find the revenue hiding in missed calls and slow replies.',
  href = '/signup',
  label = 'Start for free',
}: BlogClosingCtaProps) {
  return (
    <div className="my-12 flex flex-col items-center justify-center text-center">
      <div className="group w-full max-w-[640px] rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 shadow-sm transition duration-500 hover:border-gray-400 hover:duration-200">
        <div className="flex justify-center isolate">
          <div className="relative left-2 top-1 grid size-10 -rotate-6 place-items-center rounded-xl bg-white shadow-md ring-1 ring-gray-200 transition duration-500 group-hover:-translate-x-4 group-hover:-translate-y-0.5 group-hover:-rotate-12 group-hover:duration-200">
            <Thermometer className="h-5 w-5 text-blue-500" />
          </div>
          <div className="relative z-10 grid size-10 place-items-center rounded-xl bg-white shadow-md ring-1 ring-gray-200 transition duration-500 group-hover:-translate-y-0.5 group-hover:duration-200">
            <Phone className="h-5 w-5 text-blue-500" />
          </div>
          <div className="relative right-2 top-1 grid size-10 rotate-6 place-items-center rounded-xl bg-white shadow-md ring-1 ring-gray-200 transition duration-500 group-hover:translate-x-4 group-hover:-translate-y-0.5 group-hover:rotate-12 group-hover:duration-200">
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
        </div>
        <h3 className="mt-4 text-2xl font-medium text-gray-900 md:text-3xl">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{body}</p>
        <a
          href={href}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50"
        >
          {label}
        </a>
      </div>
    </div>
  );
}
