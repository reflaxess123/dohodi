import { FC } from 'react'
import { TransactionList } from '@/widgets/transaction-list'

export const TransactionsPage: FC = () => {
  return (
    <div className="pb-20">
      <h1 className="text-xl font-semibold mb-4">Транзакции</h1>
      <TransactionList />
    </div>
  )
}
