import React from 'react';
import LegalComparisonPage from '../components/compare/LegalComparisonPage';
import lexReception from '../data/legalComparisons/lexReception';

const CompareBoltcallVsLexReception: React.FC = () => <LegalComparisonPage data={lexReception} />;

export default CompareBoltcallVsLexReception;
