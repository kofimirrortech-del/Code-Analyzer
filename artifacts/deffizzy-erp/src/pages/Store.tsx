import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Trash2, PackageSearch, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useListStoreItems, useCreateStoreItem, useUpdateStoreItem, useDeleteStoreItem, getListStoreItemsQueryKey } from "@workspace/api-client-react";
import { Button, Input, Modal } from "@/components/shared-ui";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AuthUserRole } from "@workspace/api-client-react";

const formSchema = z.object({
  itemName: z.string().min(2, "Name is required"),
  quantity: z.coerce.number().min(0),
  addedStock: z.coerce.number().min(0),
  closingStock: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().min(0),
  unit: z.string().min(1, "Unit is required"),
  supplier: z.string().min(2, "Supplier is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Store() {
  const { data: items = [], isLoading } = useListStoreItems();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === AuthUserRole.ADMIN;
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { quantity: 0, addedStock: 0, closingStock: 0, lowStockThreshold: 0, unit: "units" },
  });

  const createMutation = useCreateStoreItem({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListStoreItemsQueryKey() }); toast({ title: "Item added" }); closeModal(); } } });
  const updateMutation = useUpdateStoreItem({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListStoreItemsQueryKey() }); toast({ title: "Item updated" }); closeModal(); } } });
  const deleteMutation = useDeleteStoreItem({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListStoreItemsQueryKey() }); toast({ title: "Item deleted" }); } } });

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      reset({ itemName: item.itemName, quantity: item.quantity, addedStock: item.addedStock ?? 0, closingStock: item.closingStock ?? 0, lowStockThreshold: item.lowStockThreshold ?? 0, unit: item.unit ?? "units", supplier: item.supplier });
    } else {
      setEditingItem(null);
      reset({ itemName: "", quantity: 0, addedStock: 0, closingStock: 0, lowStockThreshold: 0, unit: "units", supplier: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const onSubmit = (data: FormValues) => {
    if (editingItem) updateMutation.mutate({ id: editingItem.id, data: data as any });
    else createMutation.mutate({ data: data as any });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this item?")) deleteMutation.mutate({ id });
  };

  const lowStockCount = items.filter((i: any) => i.isLowStock).length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Store Inventory</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-muted-foreground">Manage store items and stock levels.</p>
            {lowStockCount > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">
                <AlertTriangle className="w-3 h-3" /> {lowStockCount} low stock
              </span>
            )}
          </div>
        </div>
        <Button onClick={() => openModal()} className="sm:w-auto w-full">
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="bg-black/20 text-xs uppercase text-muted-foreground border-b border-white/5">
                <th className="p-3 font-semibold w-10">#</th>
                <th className="p-3 font-semibold">Item Name</th>
                <th className="p-3 font-semibold">Qty</th>
                <th className="p-3 font-semibold">Added Stock</th>
                <th className="p-3 font-semibold">Total Stock</th>
                <th className="p-3 font-semibold">Closing Stock</th>
                <th className="p-3 font-semibold">Low Stock Alert</th>
                <th className="p-3 font-semibold">Unit</th>
                <th className="p-3 font-semibold">Supplier</th>
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr><td colSpan={11} className="p-8 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={11} className="p-10 text-center">
                  <PackageSearch className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No items yet. Add one to get started.</p>
                </td></tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className={`hover:bg-white/5 transition-colors group ${item.isLowStock ? 'bg-red-500/5' : ''}`}>
                    <td className="p-3 font-mono text-xs text-muted-foreground">#{item.id}</td>
                    <td className="p-3 font-medium text-white">
                      <span className="flex items-center gap-2">
                        {item.isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                        {item.itemName}
                      </span>
                    </td>
                    <td className="p-3 text-white text-sm">{item.quantity}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">+{item.addedStock ?? 0}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.isLowStock ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                        {item.totalStock ?? ((item.quantity ?? 0) + (item.addedStock ?? 0))}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-white">{item.closingStock ?? 0}</td>
                    <td className="p-3">
                      {item.lowStockThreshold > 0 ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${item.isLowStock ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                          &lt;{item.lowStockThreshold}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground text-sm">{item.unit ?? "units"}</td>
                    <td className="p-3 text-muted-foreground text-sm">{item.supplier}</td>
                    <td className="p-3 text-xs text-muted-foreground">{item.date ?? formatDate(item.createdAt)}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-400 hover:text-blue-300" onClick={() => openModal(item)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? "Edit Store Item" : "Add Store Item"} description="Total stock = Quantity + Added Stock">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Item Name</label>
            <Input {...register("itemName")} placeholder="e.g. Flour" error={errors.itemName?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Quantity</label>
              <Input type="number" {...register("quantity")} placeholder="0" error={errors.quantity?.message} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Added Stock</label>
              <Input type="number" {...register("addedStock")} placeholder="0" error={errors.addedStock?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Closing Stock</label>
              <Input type="number" {...register("closingStock")} placeholder="0" error={errors.closingStock?.message} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Low Stock Alert Threshold</label>
              <Input type="number" {...register("lowStockThreshold")} placeholder="0 = disabled" error={errors.lowStockThreshold?.message} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Unit</label>
              <Input {...register("unit")} placeholder="e.g. kg, bags, pcs" error={errors.unit?.message} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Supplier</label>
              <Input {...register("supplier")} placeholder="e.g. ABC Supplies" error={errors.supplier?.message} />
            </div>
          </div>
          <div className="pt-3 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending || updateMutation.isPending}>
              {editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
