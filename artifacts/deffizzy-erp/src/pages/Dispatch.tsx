import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Trash2, Truck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListOrders, useCreateOrder, useUpdateOrder, useDeleteOrder,
  getListOrdersQueryKey, Order, CreateOrderStatus
} from "@workspace/api-client-react";
import { Button, Input, Modal, Select, Badge } from "@/components/shared-ui";
import { formatCedi, formatDate, formatShortDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  client: z.string().min(2, "Client name is required"),
  status: z.nativeEnum(CreateOrderStatus),
  deliveryDate: z.string().min(1, "Date is required"),
  total: z.coerce.number().min(0, "Must be >= 0"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Dispatch() {
  const { data: items = [], isLoading } = useListOrders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Order | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const createMutation = useCreateOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        toast({ title: "Order created successfully" });
        closeModal();
      }
    }
  });

  const updateMutation = useUpdateOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        toast({ title: "Order updated successfully" });
        closeModal();
      }
    }
  });

  const deleteMutation = useDeleteOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        toast({ title: "Order deleted" });
      }
    }
  });

  const openModal = (item?: Order) => {
    if (item) {
      setEditingItem(item);
      reset({ client: item.client, status: item.status as any, total: item.total, deliveryDate: item.deliveryDate.split('T')[0] });
    } else {
      setEditingItem(null);
      reset({ client: "", status: CreateOrderStatus.Pending, total: 0, deliveryDate: new Date().toISOString().split('T')[0] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const onSubmit = (data: FormValues) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: { ...data, deliveryDate: new Date(data.deliveryDate).toISOString() } });
    } else {
      createMutation.mutate({ data: { ...data, deliveryDate: new Date(data.deliveryDate).toISOString() } });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this order?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusVariant = (status: string) => {
    switch(status) {
      case 'Delivered': return 'success';
      case 'Cancelled': return 'danger';
      case 'Processing': return 'info';
      case 'Dispatched': return 'primary';
      default: return 'warning';
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Dispatch & Orders</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">Manage client orders and deliveries.</p>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium border border-primary/30">
              Today: {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}
            </span>
          </div>
        </div>
        <Button onClick={() => openModal()} className="sm:w-auto w-full">
          <Plus className="w-4 h-4 mr-2" /> New Order
        </Button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                <th className="p-4 font-semibold w-24">Order ID</th>
                <th className="p-4 font-semibold">Client</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Delivery Date</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center">
                  <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No orders found.</p>
                </td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 font-mono text-sm text-primary">ORD-{item.id.toString().padStart(4, '0')}</td>
                    <td className="p-4 font-medium text-white">{item.client}</td>
                    <td className="p-4">
                      <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{formatShortDate(item.deliveryDate)}</td>
                    <td className="p-4 font-medium text-white">{formatCedi(item.total)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300" onClick={() => openModal(item)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? "Edit Order" : "Create Order"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Client Name</label>
            <Input {...register("client")} placeholder="e.g. Supermart Ltd" error={errors.client?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Status</label>
              <Select {...register("status")} error={errors.status?.message}>
                {Object.values(CreateOrderStatus).map(status => (
                  <option key={status} value={status} className="bg-slate-900">{status}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Total Amount (₵)</label>
              <Input type="number" step="0.01" {...register("total")} placeholder="0.00" error={errors.total?.message} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Delivery Date</label>
            <Input type="date" {...register("deliveryDate")} error={errors.deliveryDate?.message} />
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingItem ? "Save Changes" : "Create Order"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
