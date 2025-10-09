'use client'

import { motion } from 'framer-motion'
import { RefreshCw, Clock, User } from 'lucide-react'

interface Order {
  id: string
  modelId: string
  modelName: string
  tshirtImage: string
  processedImage: string
  status: string
  createdAt: number
}

interface PreviousOrdersProps {
  orders: Order[]
  onRefresh: () => void
}

export default function PreviousOrders({ orders, onRefresh }: PreviousOrdersProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Previous Orders
        </h2>
        <button
          onClick={onRefresh}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No previous orders yet</p>
          <p className="text-sm">Your generated images will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-[3/4] relative">
                <img
                  src={order.processedImage}
                  alt={`Order ${order.id}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'Done' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
              
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{order.modelName}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                
                <div className="mt-2">
                  <button
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = order.processedImage
                      link.download = `order-${order.id}.jpg`
                      link.click()
                    }}
                    className="w-full btn-secondary text-xs py-1"
                  >
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
