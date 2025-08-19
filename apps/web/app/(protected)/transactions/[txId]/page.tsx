import { TransactionDetailClient } from './TransactionDetailClient'

import { getTransaction } from '@/src/app/transactions/actions'

interface TransactionDetailPageProps {
  params: {
    txId: string
  }
}

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const transaction = await getTransaction(params.txId)
  
  return <TransactionDetailClient transaction={transaction} />
}