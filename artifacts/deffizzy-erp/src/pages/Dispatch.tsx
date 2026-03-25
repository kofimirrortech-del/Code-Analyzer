import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Trash2, Truck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListOrders, useCreateOrder, useUpdateOrder, useDeleteOrder,
  getListOrdersQueryKey, Order
} from "@workspace/api-client-react";
import { Button, Input, Modal } from "@/components/shared-ui";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  notes: z.string().default(""),
  item: z.string().min(1, "Item is required"),
  quantity: z.coerce.number().min(0, "Must be >= 0"),
  unitCost: z.coerce.number().min(0, "Must be >= 0"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Dispatch() {
  const { data: items = [], isLoading } = useListOrders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Order | null>(null);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { notes: "", item: "", quantity: 0, unitCost: 0 },
  });

  const watchedQty = watch("quantity") ?? 0;
  const watchedUnitCost = watch("unitCost") ?? 0;
  const liveTotal = (Number(watchedQty) * Number(watchedUnitCost)).toFixed(2);

  const createMutation = useCreateOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        toast({ title: "Dispatch record created" });
        closeModal();
      }
    }
  });

  const updateMutation = useUpdateOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        toast({ title: "Dispatch record updated" });
        closeModal();
      }
    }
  });

  const deleteMutation = useDeleteOrder({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        toast({ title: "Record deleted" });
      }
    }
  });

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      reset({
        notes: item.notes ?? "",
        item: item.item ?? "",
        quantity: item.quantity ?? 0,
        unitCost: item.unitCost ?? 0,
      });
    } else {
      setEditingItem(null);
      reset({ notes: "", item: "", quantity: 0, unitCost: 0 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const onSubmit = (data: FormValues) => {
    const payload = { ...data };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload as any });
    } else {
      createMutation.mutate({ data: payload as any });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this dispatch record?")) {
      deleteMutation.mutate({ id });
    }
  };

  const grandTotal = items.reduce((sum: number, item: any) => {
    const total = item.total ?? (item.quantity ?? 0) * (item.unitCost ?? 0);
    return sum + Number(total);
  }, 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Dispatch</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">Manage dispatch items and costs.</p>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium border border-primary/30">
              {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())}
            </span>
          </div>
        </div>
        <Button onClick={() => openModal()} className="sm:w-auto w-full">
          <Plus className="w-4 h-4 mr-2" /> Add Record
        </Button>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-4 border border-emerald-500/20">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total Records</p>
            <p className="text-2xl font-bold text-white">{items.length}</p>
          </div>
          <div className="glass-card rounded-xl p-4 border border-blue-500/20">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total Quantity</p>
            <p className="text-2xl font-bold text-white">{items.reduce((s: number, i: any) => s + Number(i.quantity ?? 0), 0)}</p>
          </div>
          <div className="glass-card rounded-xl p-4 border border-amber-500/20">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Grand Total</p>
            <p className="text-2xl font-bold text-amber-400">₵{grandTotal.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                <th className="p-4 font-semibold w-14">#</th>
                <th className="p-4 font-semibold">Notes</th>
                <th className="p-4 font-semibold">Item</th>
                <th className="p-4 font-semibold">Quantity</th>
                <th className="p-4 font-semibold">Unit Cost (₵)</th>
                <th className="p-4 font-semibold">Total (₵)</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center">
                  <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No dispatch records yet.</p>
                </td></tr>
              ) : (
                items.map((item: any) => {
                  const total = item.total ?? (Number(item.quantity ?? 0) * Number(item.unitCost ?? 0));
                  return (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4 font-mono text-sm text-primary">#{item.id}</td>
                      <td className="p-4 text-muted-foreground text-sm max-w-[180px] truncate">{item.notes || <span className="italic opacity-40">—</span>}</td>
                      <td className="p-4 font-medium text-white">{item.item}</td>
                      <td className="p-4 text-white">{item.quantity}</td>
                      <td className="p-4 text-white">₵{Number(item.unitCost ?? 0).toFixed(2)}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          ₵{Number(total).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{item.date ?? formatDate(item.createdAt)}</td>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? "Edit Record" : "Add Dispatch Record"} description="Total is calculated automatically from Quantity × Unit Cost.">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Notes</label>
            <Input {...register("notes")} placeholder="Optional notes..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Item</label>
            <Input {...register("item")} placeholder="e.g. Sliced Bread" error={errors.item?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Quantity</label>
              <Input type="number" step="1" {...register("quantity")} placeholder="0" error={errors.quantity?.message} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Unit Cost (₵)</label>
              <Input type="number" step="0.01" {...register("unitCost")} placeholder="0.00" error={errors.unitCost?.message} />
            </div>
          </div>
          <div className="bg-black/20 rounded-xl p-3 border border-amber-500/20 flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-medium">Total</span>
            <span className="text-lg font-bold text-amber-400">₵{liveTotal}</span>
          </div>
          <div className="pt-2 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingItem ? "Save Changes" : "Add Record"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
