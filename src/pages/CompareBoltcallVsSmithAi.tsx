import React from 'react';
import LegalComparisonPage from '../components/compare/LegalComparisonPage';
import smithAi from '../data/legalComparisons/smithAi';

const CompareBoltcallVsSmithAi: React.FC = () => <LegalComparisonPage data={smithAi} />;

export default CompareBoltcallVsSmithAi;
