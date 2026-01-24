import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrderUpdate {
  id: string;
  order_number: string;
  status: string;
  old_status?: string;
}

export const useOrderTracking = (userId: string | undefined) => {
  const [orderUpdates, setOrderUpdates] = useState<OrderUpdate[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    // Subscribe to order updates
    const channel = supabase
      .channel('order-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newOrder = payload.new as any;
          const oldOrder = payload.old as any;

          // Only notify if status changed
          if (newOrder.status !== oldOrder.status) {
            const update: OrderUpdate = {
              id: newOrder.id,
              order_number: newOrder.order_number,
              status: newOrder.status,
              old_status: oldOrder.status
            };

            setOrderUpdates((prev) => [...prev, update]);

            // Show toast notification
            const statusMessages: Record<string, { title: string; description: string }> = {
              confirmed: {
                title: '✅ Order Confirmed',
                description: `Order ${newOrder.order_number} has been confirmed!`
              },
              processing: {
                title: '⚙️ Order Processing',
                description: `Order ${newOrder.order_number} is being processed.`
              },
              shipped: {
                title: '📦 Order Shipped',
                description: `Order ${newOrder.order_number} has been shipped!`
              },
              delivered: {
                title: '🎉 Order Delivered',
                description: `Order ${newOrder.order_number} has been delivered!`
              },
              cancelled: {
                title: '❌ Order Cancelled',
                description: `Order ${newOrder.order_number} has been cancelled.`
              }
            };

            const message = statusMessages[newOrder.status] || {
              title: 'Order Updated',
              description: `Order ${newOrder.order_number} status: ${newOrder.status}`
            };

            toast({
              title: message.title,
              description: message.description,
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  return { orderUpdates };
};
