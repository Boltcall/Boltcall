import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScrollingAnimation } from './ui/scrolling-animation';

const FreeSetup: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="mt-32">
      <ScrollingAnimation onNavigate={(href) => navigate(href)} />
      <p className="bg-white px-5 py-5 text-center text-sm text-slate-600">
        Need a new website too?{' '}
        <Link to="/black-friday" className="font-medium text-brand-blue underline underline-offset-4">
          See the Black Friday giveaway
        </Link>
        .
      </p>
    </section>
  );
};

export default FreeSetup;
