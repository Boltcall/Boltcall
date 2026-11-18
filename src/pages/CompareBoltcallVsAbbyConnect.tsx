import React from 'react';
import LegalComparisonPage from '../components/compare/LegalComparisonPage';
import abbyConnect from '../data/legalComparisons/abbyConnect';

const CompareBoltcallVsAbbyConnect: React.FC = () => <LegalComparisonPage data={abbyConnect} />;

export default CompareBoltcallVsAbbyConnect;
