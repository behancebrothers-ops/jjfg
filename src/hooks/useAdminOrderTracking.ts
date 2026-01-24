import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminOrderUpdate {
  id: string;
  order_number: string;
  status: string;
  user_id: string;
  total_amount: number;
  type: 'INSERT' | 'UPDATE';
}

export const useAdminOrderTracking = (isAdmin: boolean) => {
  const [recentOrders, setRecentOrders] = useState<AdminOrderUpdate[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!isAdmin) return;

    // Subscribe to all order changes (new orders and updates)
    const channel = supabase
      .channel('admin-order-tracking')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as any;
          
          const update: AdminOrderUpdate = {
            id: newOrder.id,
            order_number: newOrder.order_number,
            status: newOrder.status,
            user_id: newOrder.user_id,
            total_amount: newOrder.total_amount,
            type: 'INSERT'
          };

          setRecentOrders((prev) => [update, ...prev].slice(0, 10)); // Keep last 10

          toast({
            title: '🛒 New Order Received',
            description: `Order ${newOrder.order_number} - $${newOrder.total_amount.toFixed(2)}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const updatedOrder = payload.new as any;
          const oldOrder = payload.old as any;

          // Only track status changes
          if (updatedOrder.status !== oldOrder.status) {
            const update: AdminOrderUpdate = {
              id: updatedOrder.id,
              order_number: updatedOrder.order_number,
              status: updatedOrder.status,
              user_id: updatedOrder.user_id,
              total_amount: updatedOrder.total_amount,
              type: 'UPDATE'
            };

            setRecentOrders((prev) => [update, ...prev].slice(0, 10));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, toast]);

  return { recentOrders };
};
