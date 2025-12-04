'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import CustomerDetailClient from '@/components/customers/CustomerDetailClient';

export default function CustomerDetailPage(): JSX.Element {
  const params = useParams();
  const customerId = (params as any).id as string;
  return <CustomerDetailClient customerId={customerId} />;
}